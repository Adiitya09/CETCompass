from typing import Optional, Dict, Any
from fastapi import APIRouter, Depends, Query, Path
from sqlalchemy.orm import Session

from backend.app.api.deps import get_db
from backend.app.services.college_service import CollegeService
from backend.app.schemas.college import CollegeDetail, CollegeCompareRequest

router = APIRouter(prefix="/colleges", tags=["Colleges"])

@router.get(
    "",
    response_model=Dict[str, Any],
    summary="List Colleges",
    description="Retrieve paginated, filtered, and sorted engineering colleges across Maharashtra."
)
def get_colleges(
    q: Optional[str] = Query(None, description="Search by college name, code, city, or district"),
    district: Optional[str] = Query(None, description="Filter by Maharashtra district (e.g. Pune, Mumbai City)"),
    region: Optional[str] = Query(None, description="Filter by region (e.g. Pune, Konkan, Vidarbha)"),
    branch: Optional[str] = Query(None, description="Filter by offered engineering branch name"),
    seat_type: Optional[str] = Query(None, description="Filter by offered seat category quota (e.g. GOPENS, TFWS, EWS)"),
    status: Optional[str] = Query(None, description="Filter by college status (e.g. Autonomous, Government)"),
    sort_by: str = Query("name", description="Field to sort by: name, code, city, district"),
    sort_order: str = Query("asc", description="Sort direction: asc or desc"),
    page: int = Query(1, ge=1, description="Page number starting from 1"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page (max 100)"),
    db: Session = Depends(get_db)
):
    """
    Route handler delegating strictly to CollegeService.
    Zero direct database queries inside this route.
    """
    return CollegeService.list_colleges(
        db=db,
        q=q,
        district=district,
        region=region,
        branch=branch,
        seat_type=seat_type,
        status=status,
        sort_by=sort_by,
        sort_order=sort_order,
        page=page,
        page_size=page_size
    )

@router.post(
    "/compare",
    response_model=Dict[str, Any],
    summary="Compare Colleges Alias",
    description="Compare historical cutoffs side-by-side across 2 to 5 colleges.",
    include_in_schema=False
)
def compare_colleges_alias(
    req: CollegeCompareRequest,
    db: Session = Depends(get_db)
):
    return CollegeService.compare_colleges(
        db=db,
        college_ids=req.college_ids,
        seat_type=req.seat_type,
        score_type=req.score_type
    )

@router.get(
    "/{college_id}",
    response_model=CollegeDetail,
    summary="Get College Detail",
    description="Retrieve comprehensive details for a specific college by numeric ID or URL slug."
)
def get_college_by_id(
    college_id: str = Path(..., description="Unique integer ID or slug of the college"),
    db: Session = Depends(get_db)
):
    """
    Route handler delegating strictly to CollegeService.
    """
    return CollegeService.get_college_by_id_or_slug(db=db, id_or_slug=college_id)
