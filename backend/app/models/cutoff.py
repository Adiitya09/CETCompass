from sqlalchemy import Column, Integer, Float, String, ForeignKey, Index, DateTime, func, UniqueConstraint
from sqlalchemy.orm import relationship
from backend.app.core.database import Base

class CutoffRecord(Base):
    __tablename__ = "cutoff_records"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    college_id = Column(Integer, ForeignKey("colleges.id", ondelete="CASCADE"), nullable=False, index=True)
    branch_id = Column(Integer, ForeignKey("branches.id", ondelete="CASCADE"), nullable=False, index=True)
    seat_type_id = Column(Integer, ForeignKey("seat_types.id", ondelete="CASCADE"), nullable=False, index=True)
    
    academic_year = Column(String(20), default="2024-2025", nullable=False, index=True)
    round_number = Column(Integer, default=1, nullable=False)
    score_type = Column(String(50), nullable=False, index=True)  # MHT-CET, JEE(Main), Merit
    min_cutoff = Column(Float, nullable=False, index=True)  # Cutoff barrier threshold
    mean_cutoff = Column(Float, nullable=False)
    max_cutoff = Column(Float, nullable=False)
    range_cutoff = Column(Float, nullable=False)  # max - min
    sum_score = Column(Float, nullable=False)
    count = Column(Integer, nullable=False)  # Cohort size
    max_mean_diff = Column(Float, nullable=False)  # max - mean
    created_at = Column(DateTime, default=func.now())

    # Relationships
    college = relationship("College", back_populates="cutoffs")
    branch = relationship("Branch", back_populates="cutoffs")
    seat_type = relationship("SeatType", back_populates="cutoffs")

    __table_args__ = (
        UniqueConstraint(
            "college_id", "branch_id", "seat_type_id", "score_type", "academic_year", "round_number",
            name="uq_cutoff_entry"
        ),
        Index("idx_cutoffs_pred_lookup", "score_type", "seat_type_id", "min_cutoff"),
        Index("idx_cutoffs_college_branch", "college_id", "branch_id"),
        Index("idx_cutoffs_year_score", "academic_year", "score_type"),
    )
