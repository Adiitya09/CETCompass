
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from backend.app.api.deps import get_db
from backend.app.services.search_service import SearchService
from backend.app.schemas.search import SearchResponse

router = APIRouter(prefix="/search", tags=["Global Search"])

@router.get(
    "",
    response_model=SearchResponse,
    summary="Global Unified Search",
    description="Cross-search colleges, branches, and districts simultaneously using indexing."
)
def search_entities(
    q: Optional[str] = Query(None, description="Search query string"),
    limit: int = Query(10, ge=1, le=50, description="Max matches per entity type"),
    db: Session = Depends(get_db)
):
    """
    Route handler delegating strictly to SearchService.
    Zero direct database queries inside this route.
    """
    return SearchService.unified_search(db=db, query=q, limit=limit)
