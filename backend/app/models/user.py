from sqlalchemy import Column, Integer, String, Float, Text, ForeignKey, DateTime, func, UniqueConstraint
from sqlalchemy.orm import relationship
from backend.app.core.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(String(255), primary_key=True, index=True)  # Supabase Auth user ID or guest UUID
    email = Column(String(255), unique=True, nullable=False, index=True)
    full_name = Column(String(255), nullable=True)
    role = Column(String(50), default="student", nullable=False, index=True)  # student, admin
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    # Relationships
    saved_colleges = relationship("SavedCollege", back_populates="user", cascade="all, delete-orphan")
    predictions = relationship("PredictionHistory", back_populates="user", cascade="all, delete-orphan")

class SavedCollege(Base):
    __tablename__ = "saved_colleges"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(String(255), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    college_id = Column(Integer, ForeignKey("colleges.id", ondelete="CASCADE"), nullable=False, index=True)
    branch_id = Column(Integer, ForeignKey("branches.id", ondelete="SET NULL"), nullable=True, index=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=func.now())

    # Relationships
    user = relationship("User", back_populates="saved_colleges")
    college = relationship("College", back_populates="saved_by")
    branch = relationship("Branch", back_populates="saved_by")

    __table_args__ = (
        UniqueConstraint("user_id", "college_id", "branch_id", name="uq_user_saved_college_branch"),
    )

class PredictionHistory(Base):
    __tablename__ = "prediction_history"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(String(255), ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)
    percentile = Column(Float, nullable=False)
    score_type = Column(String(50), nullable=False)
    seat_type = Column(String(50), nullable=False)
    preferred_branches = Column(Text, nullable=True)  # JSON string
    preferred_locations = Column(Text, nullable=True)  # JSON string
    total_matches = Column(Integer, nullable=False, default=0)
    safe_count = Column(Integer, nullable=False, default=0)
    moderate_count = Column(Integer, nullable=False, default=0)
    reach_count = Column(Integer, nullable=False, default=0)
    recommendations_json = Column(Text, nullable=True)  # JSON string of generated recommendations
    created_at = Column(DateTime, default=func.now(), index=True)

    # Relationships
    user = relationship("User", back_populates="predictions")
