"""Europe PMC client for journal article ingestion.

Covers publications PubMed may index slowly or miss entirely,
especially European journals, preprints, and full-text mined content.
"""
from datetime import date

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert

from app.ingestion.base import BaseIngestionClient
from app.ingestion.config import GMG_DRUG_NAMES
from app.models.publication import Publication, PublicationAuthor
from app.models.discovered_author import DiscoveredAuthor
from app.models.ingestion import IngestionRun
from app.services.match_engine import MatchEngine
from app.utils.name_normalizer import normalize_name

BASE_URL = "https://www.ebi.ac.uk/europepmc/webservices/rest/"

# Search query: gMG articles not already in PubMed (SRC != MED excludes MEDLINE)
SEARCH_QUERY = '("Myasthenia Gravis" OR "generalized myasthenia gravis")'


class EuropePMCClient(BaseIngestionClient):
    source_name = "europe_pmc"
    max_concurrent = 5
    delay_between = 0.1

    async def test_connection(self) -> dict:
        try:
            resp = await self.rate_limited_get(
                f"{BASE_URL}search",
                params={
                    "query": SEARCH_QUERY,
                    "format": "json",
                    "pageSize": "1",
                    "resultType": "lite",
                },
            )
            resp.raise_for_status()
            data = resp.json()
            hit_count = data.get("hitCount", 0)
            await self.update_source_status(True)
            return {"ok": True, "message": f"Europe PMC reachable, {hit_count} gMG articles found"}
        except Exception as e:
            await self.update_source_status(False, str(e))
            return {"ok": False, "message": str(e)}

    async def search(self, limit: int = 10) -> list[dict]:
        # Note: sort parameter is incompatible with resultType=core
        resp = await self.rate_limited_get(
            f"{BASE_URL}search",
            params={
                "query": SEARCH_QUERY,
                "format": "json",
                "pageSize": str(limit),
                "resultType": "core",
            },
        )
        resp.raise_for_status()
        data = resp.json()
        results = data.get("resultList", {}).get("result", [])
        return [self._normalize_article(r) for r in results]

    async def ingest(self, run_type: str = "sample", limit: int = 20) -> IngestionRun:
        run = await self.create_run(run_type, {"limit": limit, "query": SEARCH_QUERY})
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
        doi = article.get("doi")
        identifier = f"PMID:{pmid}" if pmid else f"DOI:{doi}" if doi else "unknown"

        try:
            # Check for existing by PMID first, then DOI
            existing = None
            if pmid:
                result = await self.db.execute(
                    select(Publication).where(Publication.pmid == pmid)
                )
                existing = result.scalar_one_or_none()

            if not existing and doi:
                result = await self.db.execute(
                    select(Publication).where(Publication.doi == doi)
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
                # Update fields that might be missing
                if not existing.abstract and article.get("abstract"):
                    existing.abstract = article["abstract"]
                if not existing.doi and doi:
                    existing.doi = doi
                if drugs_found and not existing.products_mentioned:
                    existing.products_mentioned = drugs_found
                await self.log_record(run, identifier, "updated")
                pub = existing
            else:
                pub = Publication(
                    pmid=pmid,
                    title=article.get("title", ""),
                    journal=article.get("journal"),
                    publication_date=pub_date,
                    publication_type=article.get("pub_type"),
                    abstract=article.get("abstract"),
                    doi=doi,
                    diseases=["Myasthenia Gravis"],
                    products_mentioned=drugs_found or None,
                )
                self.db.add(pub)
                await self.db.flush()
                await self.log_record(run, identifier, "created")

            # Link authors to physicians + stage all in discovered_authors
            for author in article.get("authors", []):
                first = author.get("first_name", "").strip()
                last = author.get("last_name", "").strip()
                if not first or not last:
                    continue

                physician = await match_engine.find_match(None, first, last)
                if physician:
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
                    role = f"{role}_author"
                stmt = pg_insert(DiscoveredAuthor).values(
                    first_name=first,
                    last_name=last,
                    first_name_norm=normalize_name(first),
                    last_name_norm=normalize_name(last),
                    source_type="europe_pmc",
                    source_identifier=identifier,
                    role=role,
                    journal_name=article.get("journal"),
                    publication_id=pub.id,
                    physician_id=physician.id if physician else None,
                ).on_conflict_do_nothing(constraint="uq_discovered_author_source")
                await self.db.execute(stmt)

            await self.db.flush()

        except Exception as e:
            await self.log_record(run, identifier, "error", {"error": str(e)})

    def _normalize_article(self, raw: dict) -> dict:
        # Parse authors
        authors = []
        author_list = raw.get("authorList", {}).get("author", [])
        for i, a in enumerate(author_list):
            total = len(author_list)
            if i == 0:
                pos = "first"
            elif i == total - 1:
                pos = "last"
            else:
                pos = "middle"
            authors.append({
                "first_name": a.get("firstName", ""),
                "last_name": a.get("lastName", ""),
                "position": pos,
            })

        # Parse date
        pub_date = None
        if raw.get("firstPublicationDate"):
            pub_date = raw["firstPublicationDate"]
        elif raw.get("pubYear"):
            pub_date = f"{raw['pubYear']}-01-01"

        # Publication type
        pub_type = None
        pub_types = raw.get("pubTypeList", {}).get("pubType", [])
        if pub_types:
            pub_type = pub_types[0] if isinstance(pub_types, list) else pub_types

        # Journal name is nested under journalInfo
        journal_name = None
        journal_info = raw.get("journalInfo")
        if journal_info:
            journal_obj = journal_info.get("journal", {})
            journal_name = journal_obj.get("title") or journal_info.get("journal")

        return {
            "pmid": raw.get("pmid"),
            "doi": raw.get("doi"),
            "title": raw.get("title", ""),
            "journal": journal_name,
            "abstract": raw.get("abstractText"),
            "pub_date": pub_date,
            "pub_type": pub_type,
            "authors": authors,
            "source": raw.get("source"),  # MED, PMC, PPR, etc.
        }
