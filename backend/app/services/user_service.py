import json
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import desc

from backend.app.models.user import User, SavedCollege, PredictionHistory
from backend.app.models.college import College
from backend.app.models.branch import Branch
from backend.app.schemas.user import (
    SavedCollegeCreate,
    SavedCollegeResponse,
    HistoryCreate,
    HistoryResponse
)
from backend.app.core.errors import NotFoundError, ConflictError

class UserService:
    @staticmethod
    def ensure_user(db: Session, user_id: str) -> User:
        """Finds user or creates a baseline profile."""
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            user = User(
                id=user_id,
                email=f"{user_id}@student.org",
                full_name="Student Candidate",
                role="student"
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        return user

    @staticmethod
    def get_saved_colleges(db: Session, user_id: str) -> List[SavedCollegeResponse]:
        """Retrieves all bookmarked colleges for the user."""
        UserService.ensure_user(db, user_id)
        saved = (
            db.query(SavedCollege)
            .filter(SavedCollege.user_id == user_id)
            .order_by(desc(SavedCollege.created_at))
            .all()
        )

        items = []
        for s in saved:
            items.append(SavedCollegeResponse(
                id=s.id,
                user_id=s.user_id,
                college_id=s.college.id,
                college_name=s.college.name,
                college_slug=s.college.slug,
                district=s.college.district,
                branch_id=s.branch.id if s.branch else None,
                branch_name=s.branch.name if s.branch else None,
                notes=s.notes,
                created_at=s.created_at
            ))
        return items

    @staticmethod
    def save_college(
        db: Session,
        user_id: str,
        college_id: int,
        branch_id: Optional[int] = None,
        notes: Optional[str] = None
    ) -> SavedCollegeResponse:
        """Bookmarks a college for the user (idempotent)."""
        UserService.ensure_user(db, user_id)

        college = db.query(College).filter(College.id == college_id).first()
        if not college:
            raise NotFoundError(f"College with ID {college_id} does not exist.")

        branch = None
        if branch_id:
            branch = db.query(Branch).filter(Branch.id == branch_id).first()
            if not branch:
                raise NotFoundError(f"Branch with ID {branch_id} does not exist.")

        # Check existing bookmark
        existing = (
            db.query(SavedCollege)
            .filter(
                SavedCollege.user_id == user_id,
                SavedCollege.college_id == college_id,
                SavedCollege.branch_id == branch_id
            )
            .first()
        )
        if existing:
            return SavedCollegeResponse(
                id=existing.id,
                user_id=existing.user_id,
                college_id=existing.college.id,
                college_name=existing.college.name,
                college_slug=existing.college.slug,
                district=existing.college.district,
                branch_id=existing.branch.id if existing.branch else None,
                branch_name=existing.branch.name if existing.branch else None,
                notes=existing.notes,
                created_at=existing.created_at
            )

        saved_obj = SavedCollege(
            user_id=user_id,
            college_id=college_id,
            branch_id=branch_id,
            notes=notes
        )
        db.add(saved_obj)
        db.commit()
        db.refresh(saved_obj)

        return SavedCollegeResponse(
            id=saved_obj.id,
            user_id=saved_obj.user_id,
            college_id=saved_obj.college.id,
            college_name=saved_obj.college.name,
            college_slug=saved_obj.college.slug,
            district=saved_obj.college.district,
            branch_id=saved_obj.branch.id if saved_obj.branch else None,
            branch_name=saved_obj.branch.name if saved_obj.branch else None,
            notes=saved_obj.notes,
            created_at=saved_obj.created_at
        )

    @staticmethod
    def delete_saved_college_by_college_id(
        db: Session,
        user_id: str,
        college_id: int
    ) -> bool:
        """
        Removes a bookmarked college for the user strictly by college_id.
        """
        records = (
            db.query(SavedCollege)
            .filter(SavedCollege.user_id == user_id, SavedCollege.college_id == college_id)
            .all()
        )

        if not records:
            raise NotFoundError(f"No saved college found with ID {college_id} for user.")

        for rec in records:
            db.delete(rec)
        db.commit()
        return True

    @staticmethod
    def get_prediction_history(
        db: Session,
        user_id: str,
        limit: int = 20
    ) -> List[HistoryResponse]:
        """Retrieves prediction runs executed by the user."""
        UserService.ensure_user(db, user_id)
        history = (
            db.query(PredictionHistory)
            .filter(PredictionHistory.user_id == user_id)
            .order_by(desc(PredictionHistory.created_at))
            .limit(limit)
            .all()
        )

        items = []
        for h in history:
            branches = json.loads(h.preferred_branches) if h.preferred_branches else []
            locations = json.loads(h.preferred_locations) if h.preferred_locations else []
            recs = json.loads(h.recommendations_json) if h.recommendations_json else None
            items.append(HistoryResponse(
                id=h.id,
                percentile=h.percentile,
                score_type=h.score_type,
                seat_type=h.seat_type,
                preferred_branches=branches,
                preferred_locations=locations,
                total_matches=h.total_matches,
                safe_count=h.safe_count,
                moderate_count=h.moderate_count,
                reach_count=h.reach_count,
                recommendations=recs,
                created_at=h.created_at
            ))
        return items

    @staticmethod
    def record_prediction_history(
        db: Session,
        user_id: str,
        req: HistoryCreate
    ) -> int:
        """Explicitly records a prediction calculation run."""
        UserService.ensure_user(db, user_id)
        recs_json = json.dumps(req.recommendations) if req.recommendations else None
        hist = PredictionHistory(
            user_id=user_id,
            percentile=req.percentile,
            score_type=req.score_type,
            seat_type=req.seat_type,
            preferred_branches=json.dumps(req.preferred_branches) if req.preferred_branches else None,
            preferred_locations=json.dumps(req.preferred_locations) if req.preferred_locations else None,
            total_matches=req.total_matches,
            safe_count=req.safe_count,
            moderate_count=req.moderate_count,
            reach_count=req.reach_count,
            recommendations_json=recs_json
        )
        db.add(hist)
        db.commit()
        db.refresh(hist)
        return hist.id
