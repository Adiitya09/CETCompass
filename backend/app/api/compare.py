from typing import Dict, Any
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.app.api.deps import get_db
from backend.app.schemas.college import CollegeCompareRequest
from backend.app.services.college_service import CollegeService

router = APIRouter(prefix="/compare", tags=["College Comparison"])

@router.post(
    "",
    response_model=Dict[str, Any],
    summary="Compare Colleges",
    description="Compare historical cutoffs side-by-side across 2 to 5 colleges for given seat type and score type."
)
def compare_colleges(
    req: CollegeCompareRequest,
    db: Session = Depends(get_db)
):
    """
    Route handler delegating strictly to CollegeService.
    Zero direct database queries inside this route.
    """
    return CollegeService.compare_colleges(
        db=db,
        college_ids=req.college_ids,
        seat_type=req.seat_type,
        score_type=req.score_type
    )
