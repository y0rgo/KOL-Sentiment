"""bioRxiv / medRxiv preprint client.

The bioRxiv API does not support keyword search — it only serves articles
by date range or DOI. This client fetches recent neurology preprints from
medRxiv and filters client-side for gMG-related content.
"""
from datetime import date, timedelta

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert

from app.ingestion.base import BaseIngestionClient
from app.ingestion.config import GMG_DRUG_NAMES, GMG_MESH_TERMS
from app.models.publication import Publication, PublicationAuthor
from app.models.discovered_author import DiscoveredAuthor
from app.models.ingestion import IngestionRun
from app.services.match_engine import MatchEngine
from app.utils.name_normalizer import normalize_name

BIORXIV_BASE = "https://api.biorxiv.org/details"

# Keywords to match in title/abstract for gMG relevance
GMG_KEYWORDS = [
    "myasthenia gravis",
    "myasthenic",
    "neuromuscular junction",
    "acetylcholine receptor antibod",
    "anti-musk",
    "anti-achr",
    "thymectomy",
] + [d.lower() for d in GMG_DRUG_NAMES]


class BiorxivClient(BaseIngestionClient):
    source_name = "biorxiv_medrxiv"
    max_concurrent = 1  # conservative — Cloudflare protection
    delay_between = 1.0  # 1 req/sec as recommended

    async def test_connection(self) -> dict:
        try:
            # Fetch 1 recent medRxiv article to verify API works
            today = date.today()
            week_ago = today - timedelta(days=7)
            resp = await self.rate_limited_get(
                f"{BIORXIV_BASE}/medrxiv/{week_ago.isoformat()}/{today.isoformat()}/0/json",
            )
            resp.raise_for_status()
            data = resp.json()
            count = len(data.get("collection", []))
            await self.update_source_status(True)
            return {"ok": True, "message": f"bioRxiv/medRxiv reachable, {count} recent preprints in batch"}
        except Exception as e:
            await self.update_source_status(False, str(e))
            return {"ok": False, "message": str(e)}

    async def search(self, limit: int = 10) -> list[dict]:
        """Fetch recent preprints and filter for gMG relevance."""
        articles = await self._fetch_and_filter(days_back=90, max_results=limit)
        return articles

    async def ingest(self, run_type: str = "sample", limit: int = 20) -> IngestionRun:
        days_back = 90 if run_type == "sample" else 365
        run = await self.create_run(run_type, {"limit": limit, "days_back": days_back})
        match_engine = MatchEngine(self.db)

        try:
            articles = await self._fetch_and_filter(days_back=days_back, max_results=limit)
            for article in articles:
                await self._upsert_article(article, run, match_engine)
            await self.complete_run(run)
        except Exception as e:
            await self.complete_run(run, error=str(e))

        return run

    async def _fetch_and_filter(self, days_back: int = 90, max_results: int = 20) -> list[dict]:
        """Fetch preprints from both servers, filter for gMG content."""
        today = date.today()
        start_date = today - timedelta(days=days_back)
        gmg_articles = []

        for server in ["medrxiv", "biorxiv"]:
            cursor = 0
            while len(gmg_articles) < max_results:
                resp = await self.rate_limited_get(
                    f"{BIORXIV_BASE}/{server}/{start_date.isoformat()}/{today.isoformat()}/{cursor}/json",
                )
                if resp.status_code != 200:
                    break

                data = resp.json()
                collection = data.get("collection", [])
                if not collection:
                    break

                for raw in collection:
                    normalized = self._normalize_preprint(raw, server)
                    if self._is_gmg_relevant(normalized):
                        gmg_articles.append(normalized)
                        if len(gmg_articles) >= max_results:
                            break

                # Check if there are more pages
                messages = data.get("messages", [{}])
                msg = messages[0] if messages else {}
                total = msg.get("count", 0)
                cursor += 100
                if cursor >= total:
                    break

        return gmg_articles

    def _is_gmg_relevant(self, article: dict) -> bool:
        """Check if a preprint is gMG-related by scanning title + abstract."""
        text = f"{article.get('title', '')} {article.get('abstract', '')}".lower()
        return any(kw in text for kw in GMG_KEYWORDS)

    async def _upsert_article(self, article: dict, run: IngestionRun, match_engine: MatchEngine):
        doi = article.get("doi")
        identifier = f"DOI:{doi}" if doi else "unknown"

        try:
            # Check if already exists by DOI
            existing = None
            if doi:
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
                if not existing.abstract and article.get("abstract"):
                    existing.abstract = article["abstract"]
                if drugs_found and not existing.products_mentioned:
                    existing.products_mentioned = drugs_found
                await self.log_record(run, identifier, "updated")
                pub = existing
            else:
                pub = Publication(
                    pmid=None,  # preprints don't have PMIDs
                    title=article.get("title", ""),
                    journal=article.get("journal"),  # "bioRxiv" or "medRxiv"
                    publication_date=pub_date,
                    publication_type="preprint",
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
                    source_type="biorxiv",
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

    def _normalize_preprint(self, raw: dict, server: str) -> dict:
        # Parse authors — bioRxiv returns "Smith, John; Doe, Jane" format
        authors = []
        author_str = raw.get("authors", "")
        if author_str:
            author_parts = [a.strip() for a in author_str.split(";") if a.strip()]
            for i, part in enumerate(author_parts):
                names = part.split(",", 1)
                last = names[0].strip() if names else ""
                first = names[1].strip() if len(names) > 1 else ""
                total = len(author_parts)
                if i == 0:
                    pos = "first"
                elif i == total - 1:
                    pos = "last"
                else:
                    pos = "middle"
                authors.append({"first_name": first, "last_name": last, "position": pos})

        return {
            "doi": raw.get("doi"),
            "title": raw.get("title", ""),
            "abstract": raw.get("abstract", ""),
            "pub_date": raw.get("date"),
            "journal": f"{server} (preprint)",
            "pub_type": "preprint",
            "authors": authors,
            "server": server,
            "category": raw.get("category"),
            "version": raw.get("version"),
        }
