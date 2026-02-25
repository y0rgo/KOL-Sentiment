"""Ingestion client registry."""
from app.ingestion.pubmed import PubMedClient
from app.ingestion.clinicaltrials import ClinicalTrialsClient
from app.ingestion.unpaywall import UnpaywallClient
from app.ingestion.nppes import NPPESClient
from app.ingestion.openalex import OpenAlexClient
from app.ingestion.open_payments import OpenPaymentsClient
from app.ingestion.europepmc import EuropePMCClient
from app.ingestion.biorxiv import BiorxivClient

CLIENT_REGISTRY = {
    "pubmed": PubMedClient,
    "clinicaltrials_gov": ClinicalTrialsClient,
    "unpaywall": UnpaywallClient,
    "nppes": NPPESClient,
    "openalex": OpenAlexClient,
    "open_payments": OpenPaymentsClient,
    "europe_pmc": EuropePMCClient,
    "biorxiv_medrxiv": BiorxivClient,
}
