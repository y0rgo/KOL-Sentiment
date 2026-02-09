"""Finds matching physician records using NPI and fuzzy name matching."""
from difflib import SequenceMatcher
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.physician import Physician
from typing import Optional
import uuid

class MatchEngine:
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def find_match(self, npi: str | None, first_name: str, last_name: str, state: str | None = None) -> Optional[Physician]:
        # Priority 1: Exact NPI match
        if npi:
            result = await self.db.execute(
                select(Physician).where(Physician.npi == npi)
            )
            match = result.scalar_one_or_none()
            if match:
                return match
        
        # Priority 2: Exact name match (case-insensitive)
        query = select(Physician).where(
            func.lower(Physician.first_name) == first_name.lower().strip(),
            func.lower(Physician.last_name) == last_name.lower().strip()
        )
        if state:
            query = query.where(func.lower(Physician.state) == state.lower().strip())
        result = await self.db.execute(query)
        matches = result.scalars().all()
        if len(matches) == 1:
            return matches[0]
        if len(matches) > 1:
            return matches[0]  # Return first if multiple exact matches
        
        # Priority 3: Fuzzy name match (threshold 0.85)
        all_physicians = await self.db.execute(select(Physician))
        all_docs = all_physicians.scalars().all()
        
        candidates = []
        for doc in all_docs:
            name_similarity = SequenceMatcher(
                None,
                f"{first_name} {last_name}".lower(),
                f"{doc.first_name} {doc.last_name}".lower()
            ).ratio()
            if name_similarity >= 0.85:
                candidates.append(doc)
        
        if len(candidates) == 1:
            return candidates[0]
        
        # Multiple fuzzy matches or no match - return None
        return None
