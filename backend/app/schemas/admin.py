from typing import Dict, Any, List, Optional
from pydantic import BaseModel
from datetime import datetime

class AdminStatisticsResponse(BaseModel):
    colleges_count: int
    branches_count: int
    seat_types_count: int
    cutoff_records_count: int
    districts_count: int
    users_count: int
    saved_colleges_count: int
    predictions_count: int
    score_types_distribution: Dict[str, int]
    regions_distribution: Dict[str, int]
    dataset_metadata: Optional[Dict[str, Any]] = None

class DataQualityResponse(BaseModel):
    total_active_records: int
    completeness_score: float
    checks_passed: bool
    score_integrity: Dict[str, Any]
    spread_sanity: Dict[str, Any]
    missingness_rates: Dict[str, Any]
    orphaned_records: Dict[str, Any]
    audit_summary: str

class ValidationErrorItem(BaseModel):
    row: int
    column: str
    value: Optional[str] = None
    error: str
    severity: str = "ERROR"  # ERROR or WARNING

class FileValidationResponse(BaseModel):
    valid: bool
    filename: str
    file_size_bytes: int
    file_type: str
    total_rows: int
    valid_rows: int
    error_count: int
    warning_count: int
    errors: List[ValidationErrorItem]
    preview_rows: List[Dict[str, Any]]
    detected_colleges: int
    detected_branches: int
    detected_seat_types: int
    staged_file_id: Optional[str] = None
    message: str

class ConfirmImportRequest(BaseModel):
    staged_file_id: str
    clear_existing: bool = True

class ImportHistoryItem(BaseModel):
    id: int
    filename: str
    file_size_bytes: Optional[int] = None
    total_records: int
    valid_rows: int
    error_count: int
    colleges_count: int
    branches_count: int
    seat_types_count: int
    status: str
    error_summary: Optional[str] = None
    imported_by: Optional[str] = None
    created_at: str

class AdminImportResponse(BaseModel):
    success: bool
    message: str
    import_id: Optional[int] = None
    stats: Dict[str, Any]
