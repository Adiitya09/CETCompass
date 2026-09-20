from typing import Optional, Dict, Any
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from backend.app.api.deps import get_db
from backend.app.services.metadata_service import MetadataService

router = APIRouter(prefix="/branches", tags=["Branches & Disciplines"])

@router.get(
    "",
    response_model=Dict[str, Any],
    summary="List Branches",
    description="Retrieve all 94 canonical engineering branches grouped by discipline category."
)
def get_branches(
    category: Optional[str] = Query(None, description="Filter by discipline category (e.g. Computer / IT, Core)"),
    q: Optional[str] = Query(None, description="Search branch name"),
    db: Session = Depends(get_db)
):
    """
    Route handler delegating strictly to MetadataService.
    Zero direct database queries inside this route.
    """
    return MetadataService.get_branches(db=db, category=category, search=q)
