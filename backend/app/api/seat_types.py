from typing import Optional, Dict, Any
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from backend.app.api.deps import get_db
from backend.app.services.metadata_service import MetadataService

router = APIRouter(prefix="/seat-types", tags=["Seat Categories"])

@router.get(
    "",
    response_model=Dict[str, Any],
    summary="List Seat Categories",
    description="Retrieve all 77 official seat types with category groupings and full descriptions."
)
def get_seat_types(
    category: Optional[str] = Query(None, description="Filter by category (e.g. Open, OBC, SC, ST, EWS, TFWS)"),
    q: Optional[str] = Query(None, description="Search seat type code or description"),
    db: Session = Depends(get_db)
):
    """
    Route handler delegating strictly to MetadataService.
    Zero direct database queries inside this route.
    """
    return MetadataService.get_seat_types(db=db, category=category, search=q)
