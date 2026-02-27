"""PubMed / MEDLINE ingestion client using E-utilities API."""
import re
import xml.etree.ElementTree as ET
from datetime import date, datetime

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert

from app.config import settings
from app.ingestion.base import BaseIngestionClient
from app.ingestion.config import PUBMED_SEARCH_QUERY, GMG_DRUG_NAMES
from app.models.publication import Publication, PublicationAuthor
from app.models.discovered_author import DiscoveredAuthor
from app.models.ingestion import IngestionRun
from app.services.match_engine import MatchEngine

BASE_URL = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/"


class PubMedClient(BaseIngestionClient):
    source_name = "pubmed"
    max_concurrent = 3
    delay_between = 0.35  # 3 req/sec without key

    def __init__(self, db):
        super().__init__(db)
        if settings.NCBI_API_KEY:
            self.max_concurrent = 10
            self.delay_between = 0.1  # 10 req/sec with key

    def _api_params(self, extra: dict | None = None) -> dict:
        params = {"retmode": "xml"}
        if settings.NCBI_API_KEY:
            params["api_key"] = settings.NCBI_API_KEY
        if extra:
            params.update(extra)
        return params

    async def test_connection(self) -> dict:
        try:
            resp = await self.rate_limited_get(
                f"{BASE_URL}einfo.fcgi",
                params=self._api_params({"db": "pubmed"}),
            )
            resp.raise_for_status()
            await self.update_source_status(True)
            return {"ok": True, "message": "PubMed E-utilities reachable"}
        except Exception as e:
            await self.update_source_status(False, str(e))
            return {"ok": False, "message": str(e)}

    async def search(self, limit: int = 10) -> list[dict]:
        resp = await self.rate_limited_get(
            f"{BASE_URL}esearch.fcgi",
            params=self._api_params({
                "db": "pubmed",
                "term": PUBMED_SEARCH_QUERY,
                "retmax": str(limit),
                "sort": "date",
                "usehistory": "n",
            }),
        )
        resp.raise_for_status()
        root = ET.fromstring(resp.text)
        pmids = [id_el.text for id_el in root.findall(".//Id") if id_el.text]
        if not pmids:
            return []

        # Fetch summaries
        resp2 = await self.rate_limited_get(
            f"{BASE_URL}efetch.fcgi",
            params=self._api_params({
                "db": "pubmed",
                "id": ",".join(pmids),
                "rettype": "xml",
            }),
        )
        resp2.raise_for_status()
        return self._parse_articles(resp2.text)

    async def ingest(self, run_type: str = "sample", limit: int = 20) -> IngestionRun:
        run = await self.create_run(run_type, {"limit": limit, "query": PUBMED_SEARCH_QUERY})
        match_engine = MatchEngine(self.db)

        try:
            articles = await self.search(limit=limit)
            for article in articles:
                await self._upsert_article(article, run, match_engine)
            await self.complete_run(run)
        except Exception as e:
            await self.complete_run(run, error=str(e))

        return run

    async def _upsert_article(self, article: dict, run: IngestionRun, match_engine: MatchEngine):
        pmid = article.get("pmid")
        if not pmid:
            return

        try:
            result = await self.db.execute(
                select(Publication).where(Publication.pmid == pmid)
            )
            existing = result.scalar_one_or_none()

            # Detect drug mentions
            text_blob = f"{article.get('title', '')} {article.get('abstract', '')}".lower()
            drugs_found = [d for d in GMG_DRUG_NAMES if d.lower() in text_blob]

            pub_date = None
            if article.get("pub_date"):
                try:
                    pub_date = date.fromisoformat(article["pub_date"])
                except (ValueError, TypeError):
                    pass

            if existing:
                existing.title = article.get("title", existing.title)
                existing.journal = article.get("journal", existing.journal)
                existing.publication_date = pub_date or existing.publication_date
                existing.abstract = article.get("abstract", existing.abstract)
                existing.doi = article.get("doi", existing.doi)
                existing.publication_type = article.get("pub_type", existing.publication_type)
                if drugs_found:
                    existing.products_mentioned = drugs_found
                if not existing.diseases:
                    existing.diseases = ["Myasthenia Gravis"]
                await self.log_record(run, f"PMID:{pmid}", "updated")
                pub = existing
            else:
                pub = Publication(
                    pmid=pmid,
                    title=article.get("title", ""),
                    journal=article.get("journal"),
                    publication_date=pub_date,
                    publication_type=article.get("pub_type"),
                    abstract=article.get("abstract"),
                    doi=article.get("doi"),
                    diseases=["Myasthenia Gravis"],
                    products_mentioned=drugs_found or None,
                )
                self.db.add(pub)
                await self.db.flush()
                await self.log_record(run, f"PMID:{pmid}", "created")

            # Link authors to physicians + stage all in discovered_authors
            for author in article.get("authors", []):
                first = author.get("first_name", "").strip()
                last = author.get("last_name", "").strip()
                if not first or not last:
                    continue

                physician = await match_engine.find_match(None, first, last)
                if physician:
                    # Check for existing link
                    existing_link = await self.db.execute(
                        select(PublicationAuthor).where(
                            PublicationAuthor.publication_id == pub.id,
                            PublicationAuthor.physician_id == physician.id,
                        )
                    )
                    if not existing_link.scalar_one_or_none():
                        link = PublicationAuthor(
                            publication_id=pub.id,
                            physician_id=physician.id,
                            author_position=author.get("position"),
                        )
                        self.db.add(link)

                # Stage every author in discovered_authors
                role = author.get("position")
                if role:
                    role = f"{role}_author"  # "first" -> "first_author"
                stmt = pg_insert(DiscoveredAuthor).values(
                    first_name=first,
                    last_name=last,
                    first_name_norm=first.lower().strip(),
                    last_name_norm=last.lower().strip(),
                    source_type="pubmed",
                    source_identifier=f"PMID:{pmid}",
                    role=role,
                    journal_name=article.get("journal"),
                    publication_id=pub.id,
                    physician_id=physician.id if physician else None,
                ).on_conflict_do_nothing(constraint="uq_discovered_author_source")
                await self.db.execute(stmt)

            await self.db.flush()

        except Exception as e:
            await self.log_record(run, f"PMID:{pmid}", "error", {"error": str(e)})

    def _parse_articles(self, xml_text: str) -> list[dict]:
        articles = []
        try:
            root = ET.fromstring(xml_text)
        except ET.ParseError:
            return articles

        for article_el in root.findall(".//PubmedArticle"):
            citation = article_el.find(".//MedlineCitation")
            if citation is None:
                continue

            pmid_el = citation.find("PMID")
            pmid = pmid_el.text if pmid_el is not None else None

            art = citation.find("Article")
            if art is None:
                continue

            title_el = art.find("ArticleTitle")
            title = title_el.text if title_el is not None else ""

            journal_el = art.find(".//Journal/Title")
            journal = journal_el.text if journal_el is not None else None

            abstract_el = art.find(".//Abstract/AbstractText")
            abstract = abstract_el.text if abstract_el is not None else None

            # Publication date
            pub_date_str = None
            pd = art.find(".//Journal/JournalIssue/PubDate")
            if pd is not None:
                year = pd.findtext("Year", "")
                month = pd.findtext("Month", "01")
                day = pd.findtext("Day", "01")
                # Convert month name to number
                month_map = {
                    "Jan": "01", "Feb": "02", "Mar": "03", "Apr": "04",
                    "May": "05", "Jun": "06", "Jul": "07", "Aug": "08",
                    "Sep": "09", "Oct": "10", "Nov": "11", "Dec": "12",
                }
                month = month_map.get(month, month)
                if year:
                    try:
                        pub_date_str = f"{year}-{month.zfill(2)}-{day.zfill(2)}"
                    except (ValueError, AttributeError):
                        pub_date_str = f"{year}-01-01"

            # DOI
            doi = None
            for eid in art.findall(".//ELocationID"):
                if eid.get("EIdType") == "doi":
                    doi = eid.text

            # Publication type
            pub_type = None
            pt_el = art.find(".//PublicationTypeList/PublicationType")
            if pt_el is not None:
                pub_type = pt_el.text

            # Authors
            authors = []
            author_list = art.find("AuthorList")
            if author_list is not None:
                for i, author_el in enumerate(author_list.findall("Author")):
                    fn = author_el.findtext("ForeName", "")
                    ln = author_el.findtext("LastName", "")
                    total = len(author_list.findall("Author"))
                    if i == 0:
                        pos = "first"
                    elif i == total - 1:
                        pos = "last"
                    else:
                        pos = "middle"
                    authors.append({"first_name": fn, "last_name": ln, "position": pos})

            articles.append({
                "pmid": pmid,
                "title": title,
                "journal": journal,
                "abstract": abstract,
                "pub_date": pub_date_str,
                "doi": doi,
                "pub_type": pub_type,
                "authors": authors,
            })

        return articles
