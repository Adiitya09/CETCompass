from sqlalchemy import Column, Integer, String, DateTime, Text, func
from backend.app.core.database import Base

class DatasetMetadata(Base):
    __tablename__ = "dataset_metadata"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    filename = Column(String(255), nullable=False)
    academic_year = Column(String(50), default="2024-2025", nullable=False)
    total_records = Column(Integer, nullable=False)
    colleges_count = Column(Integer, nullable=False)
    branches_count = Column(Integer, nullable=False)
    seat_types_count = Column(Integer, nullable=False)
    checksum = Column(String(64), nullable=True)
    status = Column(String(50), default="active", nullable=False)
    ingested_at = Column(DateTime, default=func.now())

class ImportLog(Base):
    __tablename__ = "import_logs"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    filename = Column(String(255), nullable=False)
    file_size_bytes = Column(Integer, nullable=True)
    total_rows = Column(Integer, default=0, nullable=False)
    valid_rows = Column(Integer, default=0, nullable=False)
    error_count = Column(Integer, default=0, nullable=False)
    colleges_count = Column(Integer, default=0, nullable=False)
    branches_count = Column(Integer, default=0, nullable=False)
    seat_types_count = Column(Integer, default=0, nullable=False)
    status = Column(String(50), default="SUCCESS", nullable=False)  # SUCCESS, FAILED, ROLLED_BACK, VALIDATED
    error_summary = Column(Text, nullable=True)
    imported_by = Column(String(100), default="admin", nullable=True)
    created_at = Column(DateTime, default=func.now())

