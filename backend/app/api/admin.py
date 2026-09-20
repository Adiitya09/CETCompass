from typing import Dict, Any, List, Optional
from fastapi import APIRouter, Depends, UploadFile, File, Form, Query, status
from sqlalchemy.orm import Session

from backend.app.api.deps import get_db, require_admin_user
from backend.app.models.user import User
from backend.app.schemas.admin import (
    AdminStatisticsResponse,
    DataQualityResponse,
    FileValidationResponse,
    ConfirmImportRequest,
    ImportHistoryItem,
    AdminImportResponse
)
from backend.app.services.admin_service import AdminService

router = APIRouter(prefix="/admin", tags=["Admin & System Management"])

@router.get(
    "/statistics",
    response_model=AdminStatisticsResponse,
    summary="Platform Analytics & Statistics",
    description="Retrieve administrative overview: totals, regional breakdown, score types, and ingestion metadata."
)
def get_admin_statistics(
    current_admin: User = Depends(require_admin_user),
    db: Session = Depends(get_db)
):
    """
    Route handler delegating strictly to AdminService.
    Protected: Only accessible by users with 'admin' role.
    """
    return AdminService.get_admin_statistics(db=db)

@router.get(
    "/quality",
    response_model=DataQualityResponse,
    summary="Data Quality Indicators & Audit",
    description="Performs integrity checks on the cutoff dataset: score ranges, min/max ordering, spread sanity, and missingness."
)
def get_data_quality(
    current_admin: User = Depends(require_admin_user),
    db: Session = Depends(get_db)
):
    """
    Protected: Only accessible by users with 'admin' role.
    """
    return AdminService.get_data_quality_indicators(db=db)

@router.post(
    "/validate",
    response_model=FileValidationResponse,
    status_code=status.HTTP_200_OK,
    summary="Validate Dataset File (Without Ingestion)",
    description="Pre-screens an uploaded Excel (.xlsx, .xls) or CSV (.csv) file for schema conformance, anomalies, and returns sample preview rows."
)
def validate_dataset(
    file: Optional[UploadFile] = File(None, description="Uploaded Excel or CSV file"),
    file_path: Optional[str] = Form(None, description="Optional local server file path to validate"),
    current_admin: User = Depends(require_admin_user),
    db: Session = Depends(get_db)
):
    """
    Protected: Only accessible by users with 'admin' role.
    Does NOT alter the database. Saves verified file into staging storage.
    """
    return AdminService.validate_uploaded_file(file=file, file_path=file_path)

@router.post(
    "/confirm-import",
    response_model=AdminImportResponse,
    status_code=status.HTTP_200_OK,
    summary="Confirm & Execute Dataset Ingestion",
    description="Executes dataset ingestion from a pre-validated staged file inside an atomic transaction. Rolls back automatically on error."
)
def confirm_dataset_import(
    req: ConfirmImportRequest,
    current_admin: User = Depends(require_admin_user),
    db: Session = Depends(get_db)
):
    """
    Protected: Only accessible by users with 'admin' role.
    Enforces atomic transaction safety and records an audit log in import_logs.
    """
    result = AdminService.confirm_and_ingest_dataset(
        db=db,
        staged_file_id=req.staged_file_id,
        clear_existing=req.clear_existing,
        admin_user=current_admin
    )
    return AdminImportResponse(
        success=True,
        message="Dataset imported and committed atomically.",
        import_id=result.get("import_id"),
        stats=result.get("stats", {})
    )

@router.get(
    "/history",
    response_model=List[ImportHistoryItem],
    summary="Dataset Import History & Audit Logs",
    description="Retrieves chronological audit history of all past dataset imports, including record counts, status, and error logs."
)
def get_import_history(
    limit: int = Query(50, ge=1, le=100),
    current_admin: User = Depends(require_admin_user),
    db: Session = Depends(get_db)
):
    """
    Protected: Only accessible by users with 'admin' role.
    """
    return AdminService.get_import_history(db=db, limit=limit)

@router.post(
    "/import",
    response_model=AdminImportResponse,
    status_code=status.HTTP_200_OK,
    summary="Direct Dataset Import (Backward Compatible)",
    description="Direct dataset ingestion pipeline from an uploaded file or server path with atomic transaction safety."
)
def direct_import_dataset(
    file: Optional[UploadFile] = File(None, description="Uploaded Excel or CSV file"),
    file_path: Optional[str] = Form(None, description="Optional local file path to ingest"),
    clear_existing: bool = Form(True, description="Whether to clear existing cutoff records before import"),
    current_admin: User = Depends(require_admin_user),
    db: Session = Depends(get_db)
):
    """
    Protected: Only accessible by users with 'admin' role.
    """
    stats = AdminService.process_file_import(
        db=db,
        file=file,
        file_path=file_path,
        clear_existing=clear_existing,
        admin_user=current_admin
    )
    return AdminImportResponse(
        success=True,
        message="Dataset imported and processed successfully.",
        stats=stats
    )

# Backward-compatible aliases
@router.get("/dataset/summary", response_model=Dict[str, Any], include_in_schema=False)
def dataset_summary_alias(
    current_admin: User = Depends(require_admin_user),
    db: Session = Depends(get_db)
):
    stats = AdminService.get_admin_statistics(db=db)
    return {
        "metadata": stats.dataset_metadata,
        "totals": {
            "colleges": stats.colleges_count,
            "branches": stats.branches_count,
            "seat_types": stats.seat_types_count,
            "cutoff_records": stats.cutoff_records_count
        },
        "score_types": stats.score_types_distribution,
        "regions": stats.regions_distribution
    }

@router.post("/dataset/upload", response_model=Dict[str, Any], include_in_schema=False)
def dataset_upload_alias(
    file: UploadFile = File(...),
    current_admin: User = Depends(require_admin_user),
    db: Session = Depends(get_db)
):
    stats = AdminService.process_file_import(db=db, file=file, clear_existing=True, admin_user=current_admin)
    return {
        "success": True,
        "message": "Dataset uploaded and ingested successfully",
        "stats": stats
    }
