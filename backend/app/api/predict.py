from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.app.api.deps import get_db, get_current_user
from backend.app.models.user import User
from backend.app.schemas.predict import PredictRequest, PredictResponse
from backend.app.services.prediction_service import PredictionService

router = APIRouter(prefix="/predict", tags=["Recommendation Engine"])

@router.post(
    "",
    response_model=PredictResponse,
    summary="Predict College Recommendations",
    description=(
        "Executes transparent, historical cutoff-based recommendation engine. "
        "Calculates Safe, Moderate, and Reach classifications with transparent confidence scores. "
        "Does NOT guarantee admission."
    )
)
def predict_recommendations(
    req: PredictRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Route handler delegating strictly to PredictionService.
    Zero direct database queries inside this route.
    """
    return PredictionService.run_prediction(db=db, req=req, user_id=str(current_user.id) if current_user else None)
