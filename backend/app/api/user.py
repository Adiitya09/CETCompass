from typing import List, Dict, Any
from fastapi import APIRouter, Depends, Path, Query, status
from sqlalchemy.orm import Session

from backend.app.api.deps import get_db, get_authenticated_user
from backend.app.models.user import User
from backend.app.schemas.user import (
    SavedCollegeCreate,
    SavedCollegeResponse,
    HistoryCreate,
    HistoryResponse
)
from backend.app.services.user_service import UserService

router = APIRouter(prefix="/user", tags=["User & Dashboard"])

@router.get(
    "/saved-colleges",
    response_model=List[SavedCollegeResponse],
    summary="Get Saved Colleges",
    description="Retrieve list of bookmarked colleges for the authenticated student."
)
def get_saved_colleges(
    current_user: User = Depends(get_authenticated_user),
    db: Session = Depends(get_db)
):
    """
    Route handler delegating strictly to UserService.
    Zero direct database queries inside this route.
    """
    return UserService.get_saved_colleges(db=db, user_id=str(current_user.id))

@router.post(
    "/saved-colleges",
    response_model=SavedCollegeResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Save College",
    description="Bookmark a college and optional branch to the authenticated student's profile."
)
def save_college(
    req: SavedCollegeCreate,
    current_user: User = Depends(get_authenticated_user),
    db: Session = Depends(get_db)
):
    """
    Route handler delegating strictly to UserService.
    Zero direct database queries inside this route.
    """
    return UserService.save_college(
        db=db,
        user_id=str(current_user.id),
        college_id=req.college_id,
        branch_id=req.branch_id,
        notes=req.notes
    )

@router.delete(
    "/saved-colleges/{college_id}",
    response_model=Dict[str, Any],
    summary="Remove Saved College",
    description="Remove a college from the authenticated student's saved list by college ID."
)
def delete_saved_college(
    college_id: int = Path(..., description="ID of the college to remove from saved list"),
    current_user: User = Depends(get_authenticated_user),
    db: Session = Depends(get_db)
):
    """
    Route handler delegating strictly to UserService.
    Zero direct database queries inside this route.
    """
    UserService.delete_saved_college_by_college_id(
        db=db,
        user_id=str(current_user.id),
        college_id=college_id
    )
    return {
        "success": True,
        "message": f"College {college_id} removed from saved list."
    }

@router.get(
    "/prediction-history",
    response_model=List[HistoryResponse],
    summary="Get Prediction History",
    description="Retrieve past recommendation calculation runs executed by the authenticated user."
)
def get_prediction_history(
    limit: int = Query(20, ge=1, le=100, description="Max history items to retrieve"),
    current_user: User = Depends(get_authenticated_user),
    db: Session = Depends(get_db)
):
    """
    Route handler delegating strictly to UserService.
    Zero direct database queries inside this route.
    """
    return UserService.get_prediction_history(db=db, user_id=str(current_user.id), limit=limit)

@router.post(
    "/prediction-history",
    response_model=Dict[str, Any],
    status_code=status.HTTP_201_CREATED,
    summary="Record Prediction History",
    description="Record an explicit prediction calculation entry to user history."
)
def record_prediction_history(
    req: HistoryCreate,
    current_user: User = Depends(get_authenticated_user),
    db: Session = Depends(get_db)
):
    """
    Route handler delegating strictly to UserService.
    Zero direct database queries inside this route.
    """
    hist_id = UserService.record_prediction_history(db=db, user_id=str(current_user.id), req=req)
    return {"success": True, "history_id": hist_id}

# Backward-compatibility alias
@router.get("/history", response_model=List[HistoryResponse], include_in_schema=False)
def get_history_alias(
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_authenticated_user),
    db: Session = Depends(get_db)
):
    return UserService.get_prediction_history(db=db, user_id=str(current_user.id), limit=limit)
