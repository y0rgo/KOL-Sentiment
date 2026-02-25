"""gMG-specific search parameters for ingestion clients."""

GMG_MESH_TERMS = [
    "Myasthenia Gravis",
    "Myasthenia Gravis, Generalized",
    "Neuromuscular Junction Diseases",
]

GMG_DRUG_NAMES = [
    # Approved gMG therapies
    "efgartigimod", "Vyvgart",
    "rozanolixizumab", "Rystiggo",
    "eculizumab", "Soliris",
    "ravulizumab", "Ultomiris",
    "zilucoplan", "Zilbrysq",
    # Commonly used treatments
    "rituximab",
    "pyridostigmine",
    "azathioprine",
    "mycophenolate",
    "tacrolimus",
    "IVIg",
    "plasma exchange",
    "thymectomy",
]

TARGET_JOURNALS = [
    "Neurology",
    "Annals of Neurology",
    "JAMA Neurology",
    "Lancet Neurology",
    "Brain",
    "Journal of Neurology Neurosurgery and Psychiatry",
    "Muscle & Nerve",
    "Journal of Neuroimmunology",
    "Neuromuscular Disorders",
    "Journal of the Neurological Sciences",
    "Therapeutic Advances in Neurological Disorders",
    "Frontiers in Neurology",
    "Journal of Clinical Neuromuscular Disease",
    "Autoimmunity Reviews",
    "New England Journal of Medicine",
]

CONFERENCE_NAMES = [
    "AAN",      # American Academy of Neurology
    "AANEM",    # American Association of Neuromuscular & Electrodiagnostic Medicine
    "MGFA",     # Myasthenia Gravis Foundation of America
    "EAN",      # European Academy of Neurology
    "WMS",      # World Muscle Society
    "ENMC",     # European Neuromuscular Centre
]

CLINICALTRIALS_CONDITION_TERMS = [
    "Myasthenia Gravis",
    "Generalized Myasthenia Gravis",
    "gMG",
    "MG",
]

# PubMed search query combining MeSH terms
PUBMED_SEARCH_QUERY = (
    '("Myasthenia Gravis"[MeSH] OR "Myasthenia Gravis"[Title/Abstract])'
)

# Companies of interest for Open Payments mapping
COMPETITOR_COMPANIES = {
    "argenx": ["Argenx", "argenx"],
    "ucb": ["UCB", "UCB Inc"],
    "alexion": ["Alexion", "Alexion Pharmaceuticals", "AstraZeneca"],
    "janssen": ["Janssen", "Johnson & Johnson"],
    "horizon": ["Horizon Therapeutics", "Amgen"],
}
