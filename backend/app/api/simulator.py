from fastapi import APIRouter

router = APIRouter()


@router.post("/compose")
async def compose_panel():
    return {"message": "Advisory board simulator - compose endpoint (coming soon)"}


@router.post("/analyze")
async def analyze_panel():
    return {"message": "Advisory board simulator - analyze endpoint (coming soon)"}
