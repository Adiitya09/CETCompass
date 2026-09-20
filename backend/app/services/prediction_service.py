import json
from typing import Optional
from sqlalchemy.orm import Session

from backend.app.schemas.predict import PredictRequest, PredictResponse
from backend.app.services.predictor import predict_colleges
from backend.app.models.user import PredictionHistory

class PredictionService:
    @staticmethod
    def run_prediction(
        db: Session,
        req: PredictRequest,
        user_id: Optional[str] = None
    ) -> PredictResponse:
        """
        Executes cutoff-based recommendation calculation and optionally logs history for authenticated users.
        """
        response = predict_colleges(db, req)

        # Log prediction run if user is authenticated (not guest)
        if user_id and user_id != "guest_user":
            try:
                recs = [
                    {
                        "college_id": r.college_id,
                        "college_name": r.college_name,
                        "college_slug": r.college_slug,
                        "branch_id": r.branch_id,
                        "branch_name": r.branch_name,
                        "classification": r.classification,
                        "score": r.recommendation_score,
                        "district": r.district,
                        "city": r.city,
                        "min_cutoff": r.min_cutoff,
                        "mean_cutoff": r.mean_cutoff,
                        "max_cutoff": r.max_cutoff
                    }
                    for r in response.results[:10]
                ] if response.results else None

                hist = PredictionHistory(
                    user_id=user_id,
                    percentile=req.percentile,
                    score_type=req.score_type,
                    seat_type=req.seat_type,
                    preferred_branches=json.dumps(req.preferred_branches) if req.preferred_branches else None,
                    preferred_locations=json.dumps(req.preferred_districts) if req.preferred_districts else None,
                    total_matches=response.summary.total_matches,
                    safe_count=response.summary.safe_count,
                    moderate_count=response.summary.moderate_count,
                    reach_count=response.summary.reach_count,
                    recommendations_json=json.dumps(recs) if recs else None
                )
                db.add(hist)
                db.commit()
            except Exception:
                db.rollback()

        return response
