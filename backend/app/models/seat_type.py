from sqlalchemy import Column, Integer, String, Text, DateTime, func
from sqlalchemy.orm import relationship
from backend.app.core.database import Base

class SeatType(Base):
    __tablename__ = "seat_types"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    code = Column(String(50), unique=True, nullable=False, index=True)
    category = Column(String(50), nullable=False, index=True)  # OPEN, OBC, SC, ST, VJNT, EWS, TFWS, AI, etc.
    quota_scope = Column(String(50), nullable=False)  # State Level, Home University, Other than Home University, All India
    gender = Column(String(20), nullable=False)  # General, Ladies
    description = Column(Text, nullable=False)
    created_at = Column(DateTime, default=func.now())

    # Relationships
    cutoffs = relationship("CutoffRecord", back_populates="seat_type", cascade="all, delete-orphan")
