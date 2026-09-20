from sqlalchemy import Column, Integer, String, DateTime, func
from sqlalchemy.orm import relationship
from backend.app.core.database import Base

class Branch(Base):
    __tablename__ = "branches"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(255), unique=True, nullable=False, index=True)
    slug = Column(String(270), unique=True, nullable=False, index=True)
    category = Column(String(100), nullable=False, index=True)
    created_at = Column(DateTime, default=func.now())

    # Relationships
    cutoffs = relationship("CutoffRecord", back_populates="branch", cascade="all, delete-orphan")
    saved_by = relationship("SavedCollege", back_populates="branch", cascade="all, delete-orphan")
