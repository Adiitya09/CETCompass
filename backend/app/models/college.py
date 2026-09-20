from sqlalchemy import Column, Integer, String, DateTime, func
from sqlalchemy.orm import relationship
from backend.app.core.database import Base

class College(Base):
    __tablename__ = "colleges"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(300), unique=True, nullable=False, index=True)
    slug = Column(String(320), unique=True, nullable=False, index=True)
    code = Column(String(50), nullable=True, index=True)
    district = Column(String(100), nullable=False, index=True)
    city = Column(String(100), nullable=False, index=True)
    region = Column(String(100), nullable=False, index=True)
    status = Column(String(100), default="Autonomous / Affiliated")
    created_at = Column(DateTime, default=func.now())

    # Relationships
    cutoffs = relationship("CutoffRecord", back_populates="college", cascade="all, delete-orphan")
    saved_by = relationship("SavedCollege", back_populates="college", cascade="all, delete-orphan")
