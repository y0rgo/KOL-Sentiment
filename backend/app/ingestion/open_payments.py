"""CMS Open Payments client for competitive affiliation data."""
from sqlalchemy import select

from app.config import settings
from app.ingestion.base import BaseIngestionClient
from app.ingestion.config import COMPETITOR_COMPANIES
from app.models.physician import Physician
from app.models.competitive import CompetitiveAffiliation
from app.models.ingestion import IngestionRun

BASE_URL = "https://openpaymentsdata.cms.gov/api/1/"
# 2023 General Payment Data dataset UUID
DATASET_ID = "fb3a65aa-c901-4a38-a813-b04b00dfa2a9"


class OpenPaymentsClient(BaseIngestionClient):
    source_name = "open_payments"
    max_concurrent = 1  # sequential — API is very slow
    delay_between = 0.5
    request_timeout = 90.0  # CMS API can take 60+ seconds per query

    async def test_connection(self) -> dict:
        try:
            resp = await self.rate_limited_get(
                f"{BASE_URL}datastore/query/{DATASET_ID}/0",
                params={"limit": "1"},
            )
            resp.raise_for_status()
            data = resp.json()
            count = len(data.get("results", []))
            await self.update_source_status(True)
            return {"ok": True, "message": f"CMS Open Payments reachable, got {count} record"}
        except Exception as e:
            await self.update_source_status(False, str(e))
            return {"ok": False, "message": str(e)}

    async def search(self, limit: int = 10) -> list[dict]:
        """Search for payments by NPI — preview mode."""
        resp = await self.rate_limited_get(
            f"{BASE_URL}datastore/query/{DATASET_ID}/0",
            params={
                "limit": str(limit),
                "conditions[0][property]": "covered_recipient_primary_type_1",
                "conditions[0][value]": "Medical Doctor",
                "conditions[0][operator]": "=",
            },
        )
        resp.raise_for_status()
        data = resp.json()
        return [self._normalize_payment(r) for r in data.get("results", [])]

    async def ingest(self, run_type: str = "sample", limit: int = 20) -> IngestionRun:
        """Look up payments for physicians with NPIs."""
        run = await self.create_run(run_type, {"limit": limit})

        try:
            result = await self.db.execute(
                select(Physician)
                .where(Physician.npi.isnot(None))
                .limit(limit)
            )
            physicians = result.scalars().all()

            for physician in physicians:
                try:
                    resp = await self.rate_limited_get(
                        f"{BASE_URL}datastore/query/{DATASET_ID}/0",
                        params={
                            "limit": "50",
                            "conditions[0][property]": "covered_recipient_npi",
                            "conditions[0][value]": physician.npi,
                            "conditions[0][operator]": "=",
                        },
                    )

                    if resp.status_code != 200:
                        await self.log_record(run, f"NPI:{physician.npi}", "error", {
                            "status": resp.status_code,
                        })
                        continue

                    data = resp.json()
                    payments = data.get("results", [])
                    if not payments:
                        await self.log_record(run, f"NPI:{physician.npi}", "skipped", {"reason": "no payments"})
                        continue

                    for payment in payments:
                        norm = self._normalize_payment(payment)
                        affiliation = CompetitiveAffiliation(
                            physician_id=physician.id,
                            company=(norm.get("company") or "")[:100],
                            affiliation_type=(norm.get("payment_type") or "")[:50],
                            product_name=(norm.get("drug_name") or "")[:100],
                            year=norm.get("year"),
                            payment_amount=norm.get("amount"),
                            data_source="open_payments",
                        )
                        self.db.add(affiliation)

                    await self.db.flush()
                    await self.log_record(run, f"NPI:{physician.npi}", "created", {
                        "payments_found": len(payments),
                    })

                except Exception as e:
                    await self.log_record(
                        run,
                        f"NPI:{physician.npi}",
                        "error",
                        {"error": f"{type(e).__name__}: {e}"},
                    )

            await self.complete_run(run)
        except Exception as e:
            await self.complete_run(run, error=str(e))

        return run

    def _normalize_payment(self, raw: dict) -> dict:
        amount = raw.get("total_amount_of_payment_usdollars")
        try:
            amount = float(amount) if amount else None
        except (ValueError, TypeError):
            amount = None

        year = raw.get("program_year")
        try:
            year = int(year) if year else None
        except (ValueError, TypeError):
            year = None

        return {
            "first_name": raw.get("covered_recipient_first_name", ""),
            "last_name": raw.get("covered_recipient_last_name", ""),
            "npi": raw.get("covered_recipient_npi"),
            "company": raw.get("submitting_applicable_manufacturer_or_applicable_gpo_name", ""),
            "payment_type": raw.get("nature_of_payment_or_transfer_of_value", ""),
            "amount": amount,
            "year": year,
            "drug_name": raw.get("name_of_drug_or_biological_or_device_or_medical_supply_1", ""),
        }
