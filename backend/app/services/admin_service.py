import os
import uuid
import shutil
import math
import pandas as pd
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_
from fastapi import UploadFile

from backend.app.models.metadata import DatasetMetadata, ImportLog
from backend.app.models.college import College
from backend.app.models.branch import Branch
from backend.app.models.seat_type import SeatType
from backend.app.models.cutoff import CutoffRecord
from backend.app.models.user import User, SavedCollege, PredictionHistory
from backend.app.schemas.admin import (
    AdminStatisticsResponse,
    DataQualityResponse,
    FileValidationResponse,
    ValidationErrorItem,
    ImportHistoryItem
)
from backend.app.data.ingest import ingest_dataset
from backend.app.core.errors import ValidationError, AppException
from backend.app.core.config import settings

MAX_FILE_SIZE = 50 * 1024 * 1024  # 50 MB

class AdminService:
    @staticmethod
    def get_admin_statistics(db: Session) -> AdminStatisticsResponse:
        """
        Gathers comprehensive platform-wide analytics and data distribution metrics.
        """
        colleges_count = db.query(College).count()
        branches_count = db.query(Branch).count()
        seat_types_count = db.query(SeatType).count()
        cutoff_records_count = db.query(CutoffRecord).count()
        districts_count = db.query(func.count(func.distinct(College.district))).scalar() or 0
        users_count = db.query(User).count()
        saved_colleges_count = db.query(SavedCollege).count()
        predictions_count = db.query(PredictionHistory).count()

        # Score type distribution
        score_types = (
            db.query(CutoffRecord.score_type, func.count(CutoffRecord.id))
            .group_by(CutoffRecord.score_type)
            .all()
        )
        score_types_distribution = {st: cnt for st, cnt in score_types}

        # Regions distribution
        regions = (
            db.query(College.region, func.count(College.id))
            .group_by(College.region)
            .all()
        )
        regions_distribution = {rg: cnt for rg, cnt in regions}

        # Metadata record
        latest = db.query(DatasetMetadata).order_by(DatasetMetadata.id.desc()).first()
        dataset_meta = None
        if latest:
            dataset_meta = {
                "id": latest.id,
                "filename": latest.filename,
                "total_records": latest.total_records,
                "ingested_at": latest.ingested_at.isoformat() if latest.ingested_at else None,
                "status": latest.status
            }

        return AdminStatisticsResponse(
            colleges_count=colleges_count,
            branches_count=branches_count,
            seat_types_count=seat_types_count,
            cutoff_records_count=cutoff_records_count,
            districts_count=districts_count,
            users_count=users_count,
            saved_colleges_count=saved_colleges_count,
            predictions_count=predictions_count,
            score_types_distribution=score_types_distribution,
            regions_distribution=regions_distribution,
            dataset_metadata=dataset_meta
        )

    @staticmethod
    def get_data_quality_indicators(db: Session) -> DataQualityResponse:
        """
        Runs comprehensive data sanity and integrity checks against the production cutoff database.
        Detects out-of-bounds percentiles, min-max inversions, null keys, and completeness.
        """
        total_records = db.query(CutoffRecord).count()

        if total_records == 0:
            return DataQualityResponse(
                total_active_records=0,
                completeness_score=0.0,
                checks_passed=False,
                score_integrity={"mht_cet_out_of_bounds": 0, "negative_scores": 0},
                spread_sanity={"min_greater_than_max": 0, "invalid_spread": 0},
                missingness_rates={"null_colleges": 0, "null_branches": 0, "null_seat_types": 0},
                orphaned_records={"orphaned_count": 0},
                audit_summary="No active cutoff records found in production database."
            )

        # 1. Score Integrity: MHT-CET percentiles must be within [0.0, 100.0]
        mht_cet_out_of_bounds = db.query(CutoffRecord).filter(
            CutoffRecord.score_type == "MHT-CET",
            or_(CutoffRecord.min_cutoff < 0.0, CutoffRecord.max_cutoff > 100.0, CutoffRecord.mean_cutoff > 100.0)
        ).count()

        negative_scores = db.query(CutoffRecord).filter(
            or_(CutoffRecord.min_cutoff < 0.0, CutoffRecord.max_cutoff < 0.0)
        ).count()

        # 2. Spread Sanity: min_cutoff <= max_cutoff, mean within [min, max], range >= 0
        min_greater_than_max = db.query(CutoffRecord).filter(
            CutoffRecord.min_cutoff > CutoffRecord.max_cutoff
        ).count()

        invalid_mean_spread = db.query(CutoffRecord).filter(
            or_(CutoffRecord.mean_cutoff < CutoffRecord.min_cutoff, CutoffRecord.mean_cutoff > CutoffRecord.max_cutoff)
        ).count()

        # 3. Missingness checks
        null_colleges = db.query(CutoffRecord).filter(CutoffRecord.college_id.is_(None)).count()
        null_branches = db.query(CutoffRecord).filter(CutoffRecord.branch_id.is_(None)).count()
        null_seat_types = db.query(CutoffRecord).filter(CutoffRecord.seat_type_id.is_(None)).count()

        # 4. Orphaned checks (referential integrity)
        orphaned_colleges = db.query(CutoffRecord).outerjoin(College, CutoffRecord.college_id == College.id).filter(College.id.is_(None)).count()
        orphaned_branches = db.query(CutoffRecord).outerjoin(Branch, CutoffRecord.branch_id == Branch.id).filter(Branch.id.is_(None)).count()
        orphaned_seat_types = db.query(CutoffRecord).outerjoin(SeatType, CutoffRecord.seat_type_id == SeatType.id).filter(SeatType.id.is_(None)).count()
        orphaned_count = orphaned_colleges + orphaned_branches + orphaned_seat_types

        total_anomalies = (
            mht_cet_out_of_bounds + negative_scores +
            min_greater_than_max + invalid_mean_spread +
            null_colleges + null_branches + null_seat_types +
            orphaned_count
        )

        checks_passed = (total_anomalies == 0)
        completeness_score = round(max(0.0, min(100.0, (1.0 - (total_anomalies / (total_records * 4))) * 100.0)), 2)

        summary = (
            f"Production dataset audit complete: {total_records:,} records evaluated. "
            f"All sanity checks passed with 0 anomalies detected."
            if checks_passed else
            f"Audit found {total_anomalies} anomalies across {total_records:,} records. Investigation recommended."
        )

        return DataQualityResponse(
            total_active_records=total_records,
            completeness_score=completeness_score,
            checks_passed=checks_passed,
            score_integrity={
                "mht_cet_out_of_bounds": mht_cet_out_of_bounds,
                "negative_scores": negative_scores,
                "score_system": "MHT-CET & JEE(Main) verified"
            },
            spread_sanity={
                "min_greater_than_max": min_greater_than_max,
                "invalid_mean_spread": invalid_mean_spread,
                "range_integrity": "Consistent"
            },
            missingness_rates={
                "null_colleges": null_colleges,
                "null_branches": null_branches,
                "null_seat_types": null_seat_types
            },
            orphaned_records={
                "orphaned_count": orphaned_count,
                "orphaned_colleges": orphaned_colleges,
                "orphaned_branches": orphaned_branches,
                "orphaned_seat_types": orphaned_seat_types
            },
            audit_summary=summary
        )

    @staticmethod
    def validate_uploaded_file(
        file: Optional[UploadFile] = None,
        file_path: Optional[str] = None
    ) -> FileValidationResponse:
        """
        Validates an uploaded Excel or CSV dataset file without modifying the database.
        Checks file size, schema headers, data formats, value anomalies, and produces a preview.
        Saves the verified file into staging storage for subsequent confirmation.
        """
        if not file and not file_path:
            raise ValidationError("Please provide an uploaded file or existing server file path for validation.")

        staged_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "uploads", "staged")
        os.makedirs(staged_dir, exist_ok=True)

        staged_file_id = uuid.uuid4().hex[:16]

        if file:
            filename = file.filename or "uploaded_dataset.xlsx"
            ext = os.path.splitext(filename)[1].lower()
            if ext not in [".xlsx", ".xls", ".csv"]:
                raise ValidationError("Only Excel (.xlsx, .xls) and CSV (.csv) files are supported for dataset maintenance.")

            staged_path = os.path.join(staged_dir, f"{staged_file_id}{ext}")
            
            # Save file and enforce size limits
            bytes_written = 0
            with open(staged_path, "wb") as buffer:
                while chunk := file.file.read(1024 * 1024):  # 1MB chunks
                    bytes_written += len(chunk)
                    if bytes_written > MAX_FILE_SIZE:
                        buffer.close()
                        if os.path.exists(staged_path):
                            os.remove(staged_path)
                        raise ValidationError(f"File size exceeds maximum allowed limit of {MAX_FILE_SIZE // (1024 * 1024)}MB.")
                    buffer.write(chunk)
            file_size = bytes_written
        else:
            if not os.path.exists(file_path):
                raise ValidationError(f"Server file not found at path: {file_path}")
            filename = os.path.basename(file_path)
            ext = os.path.splitext(filename)[1].lower()
            if ext not in [".xlsx", ".xls", ".csv"]:
                raise ValidationError("Only Excel (.xlsx, .xls) and CSV (.csv) files are supported.")
            file_size = os.path.getsize(file_path)
            if file_size > MAX_FILE_SIZE:
                raise ValidationError(f"File size ({file_size / (1024*1024):.1f}MB) exceeds limit of 50MB.")
            staged_path = os.path.join(staged_dir, f"{staged_file_id}{ext}")
            shutil.copyfile(file_path, staged_path)

        # Parse file into DataFrame
        try:
            if ext == ".csv":
                df = pd.read_csv(staged_path)
            else:
                xl = pd.ExcelFile(staged_path)
                sheet_name = 'Sheet' if 'Sheet' in xl.sheet_names else xl.sheet_names[0]
                df = xl.parse(sheet_name)
        except Exception as exc:
            if os.path.exists(staged_path):
                os.remove(staged_path)
            raise ValidationError(f"Failed to parse file: {str(exc)}")

        total_rows = len(df)
        if total_rows == 0:
            if os.path.exists(staged_path):
                os.remove(staged_path)
            raise ValidationError("The provided dataset file contains 0 rows of data.")

        # Schema Validation
        required_cols = ['college_name', 'score_type', 'seat_type', 'branch', 'min', 'max', 'mean', 'count']
        missing_cols = [c for c in required_cols if c not in df.columns]

        errors: List[ValidationErrorItem] = []
        if missing_cols:
            errors.append(ValidationErrorItem(
                row=0,
                column=", ".join(missing_cols),
                error=f"Missing required columns in dataset: {', '.join(missing_cols)}",
                severity="ERROR"
            ))
            return FileValidationResponse(
                valid=False,
                filename=filename,
                file_size_bytes=file_size,
                file_type=ext.upper().strip('.'),
                total_rows=total_rows,
                valid_rows=0,
                error_count=len(errors),
                warning_count=0,
                errors=errors,
                preview_rows=[],
                detected_colleges=0,
                detected_branches=0,
                detected_seat_types=0,
                staged_file_id=None,
                message=f"Schema validation failed: Missing required columns: {', '.join(missing_cols)}"
            )

        # Detailed row validation (inspecting up to first 5,000 rows for high performance)
        sample_limit = min(5000, total_rows)
        error_count = 0
        warning_count = 0

        for idx, row in df.iloc[:sample_limit].iterrows():
            row_num = int(idx) + 2  # 1-indexed plus header row

            # Empty text checks
            for field in ['college_name', 'branch', 'seat_type', 'score_type']:
                val = str(row.get(field, "")).strip()
                if not val or val.lower() == "nan":
                    error_count += 1
                    if len(errors) < 30:
                        errors.append(ValidationErrorItem(
                            row=row_num,
                            column=field,
                            value=None,
                            error=f"Row {row_num}: Missing or null value for '{field}'",
                            severity="ERROR"
                        ))

            # Numeric checks
            try:
                min_c = float(row.get('min', 0))
                max_c = float(row.get('max', 0))
                mean_c = float(row.get('mean', 0))

                if math.isnan(min_c) or math.isnan(max_c) or math.isnan(mean_c):
                    error_count += 1
                    if len(errors) < 30:
                        errors.append(ValidationErrorItem(
                            row=row_num,
                            column="cutoffs",
                            value=None,
                            error=f"Row {row_num}: NaN detected in cutoff statistics",
                            severity="ERROR"
                        ))
                elif min_c > max_c:
                    error_count += 1
                    if len(errors) < 30:
                        errors.append(ValidationErrorItem(
                            row=row_num,
                            column="min/max",
                            value=f"min={min_c}, max={max_c}",
                            error=f"Row {row_num}: Minimum cutoff ({min_c}) exceeds maximum cutoff ({max_c})",
                            severity="ERROR"
                        ))

                stype = str(row.get('score_type', '')).strip().upper()
                if "MHT" in stype and (min_c < 0.0 or max_c > 100.001):
                    warning_count += 1
                    if len(errors) < 30:
                        errors.append(ValidationErrorItem(
                            row=row_num,
                            column="score_range",
                            value=f"{min_c} - {max_c}",
                            error=f"Row {row_num}: Percentile score outside standard 0-100 range",
                            severity="WARNING"
                        ))
            except (ValueError, TypeError):
                error_count += 1
                if len(errors) < 30:
                    errors.append(ValidationErrorItem(
                        row=row_num,
                        column="numeric_parsing",
                        value=None,
                        error=f"Row {row_num}: Cutoff fields must contain numeric values",
                        severity="ERROR"
                    ))

        # Distinct counts
        detected_colleges = int(df['college_name'].dropna().nunique())
        detected_branches = int(df['branch'].dropna().nunique())
        detected_seat_types = int(df['seat_type'].dropna().nunique())

        # Generate sample preview rows (first 15 rows)
        preview_sample = df.head(15).fillna("").to_dict(orient="records")
        clean_preview: List[Dict[str, Any]] = []
        for r in preview_sample:
            clean_preview.append({
                "college_name": str(r.get("college_name", "")),
                "branch": str(r.get("branch", "")),
                "seat_type": str(r.get("seat_type", "")),
                "score_type": str(r.get("score_type", "")),
                "min": float(r.get("min", 0)) if r.get("min") != "" else 0.0,
                "mean": float(r.get("mean", 0)) if r.get("mean") != "" else 0.0,
                "max": float(r.get("max", 0)) if r.get("max") != "" else 0.0,
                "count": int(r.get("count", 0)) if r.get("count") != "" else 0,
            })

        is_valid = (error_count == 0)
        valid_rows = total_rows - error_count

        msg = (
            f"Validation passed: {total_rows:,} rows verified across {detected_colleges} colleges and {detected_branches} branches."
            if is_valid else
            f"Validation detected {error_count} errors and {warning_count} warnings in {total_rows:,} rows."
        )

        return FileValidationResponse(
            valid=is_valid,
            filename=filename,
            file_size_bytes=file_size,
            file_type=ext.upper().strip('.'),
            total_rows=total_rows,
            valid_rows=valid_rows,
            error_count=error_count,
            warning_count=warning_count,
            errors=errors,
            preview_rows=clean_preview,
            detected_colleges=detected_colleges,
            detected_branches=detected_branches,
            detected_seat_types=detected_seat_types,
            staged_file_id=staged_file_id if is_valid else None,
            message=msg
        )

    @staticmethod
    def confirm_and_ingest_dataset(
        db: Session,
        staged_file_id: str,
        clear_existing: bool = True,
        admin_user: Optional[User] = None
    ) -> Dict[str, Any]:
        """
        Executes dataset ingestion from a verified staged file inside an atomic database transaction.
        If any database or processing error occurs, rolls back cleanly to preserve production data intact,
        and logs the outcome in import_logs.
        """
        staged_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "uploads", "staged")
        candidates = [f for f in os.listdir(staged_dir) if f.startswith(staged_file_id)] if os.path.exists(staged_dir) else []

        if not candidates:
            raise ValidationError("Staged file not found or expired. Please upload and validate the file again.")

        target_file = os.path.join(staged_dir, candidates[0])
        file_size = os.path.getsize(target_file)
        filename = candidates[0]
        admin_id = admin_user.id if admin_user else "admin_master"

        # Begin atomic transaction safety wrapper
        try:
            stats = ingest_dataset(target_file, db=db, clear_existing=clear_existing)

            # Record successful audit log
            import_log = ImportLog(
                filename=filename,
                file_size_bytes=file_size,
                total_rows=stats.get("total_records", 0),
                valid_rows=stats.get("total_records", 0),
                error_count=0,
                colleges_count=stats.get("colleges_count", 0),
                branches_count=stats.get("branches_count", 0),
                seat_types_count=stats.get("seat_types_count", 0),
                status="SUCCESS",
                error_summary="Import completed and committed atomically.",
                imported_by=admin_id
            )
            db.add(import_log)
            db.commit()
            db.refresh(import_log)

            return {
                "import_id": import_log.id,
                "stats": stats
            }
        except Exception as exc:
            db.rollback()

            # Record failure in ImportLog in an isolated session
            from backend.app.database.session import SessionLocal
            audit_session = SessionLocal()
            try:
                failed_log = ImportLog(
                    filename=filename,
                    file_size_bytes=file_size,
                    total_rows=0,
                    valid_rows=0,
                    error_count=1,
                    status="FAILED",
                    error_summary=str(exc)[:1900],
                    imported_by=admin_id
                )
                audit_session.add(failed_log)
                audit_session.commit()
            finally:
                audit_session.close()

            raise AppException(
                f"Ingestion failed and was safely rolled back: {str(exc)}",
                status_code=500,
                code="INGESTION_ROLLBACK"
            )

    @staticmethod
    def get_import_history(db: Session, limit: int = 50) -> List[ImportHistoryItem]:
        """
        Retrieves the audit trail of dataset imports.
        """
        records = db.query(ImportLog).order_by(ImportLog.id.desc()).limit(limit).all()
        return [
            ImportHistoryItem(
                id=r.id,
                filename=r.filename,
                file_size_bytes=r.file_size_bytes,
                total_records=r.total_rows,
                valid_rows=r.valid_rows,
                error_count=r.error_count,
                colleges_count=r.colleges_count,
                branches_count=r.branches_count,
                seat_types_count=r.seat_types_count,
                status=r.status,
                error_summary=r.error_summary,
                imported_by=r.imported_by,
                created_at=r.created_at.isoformat() if r.created_at else ""
            )
            for r in records
        ]

    @staticmethod
    def process_file_import(
        db: Session,
        file: Optional[UploadFile] = None,
        file_path: Optional[str] = None,
        clear_existing: bool = True,
        admin_user: Optional[User] = None
    ) -> Dict[str, Any]:
        """
        Direct import helper maintaining backward compatibility.
        """
        validation = AdminService.validate_uploaded_file(file=file, file_path=file_path)
        if not validation.valid or not validation.staged_file_id:
            first_err = validation.errors[0].error if validation.errors else "File validation failed."
            raise ValidationError(first_err)

        result = AdminService.confirm_and_ingest_dataset(
            db=db,
            staged_file_id=validation.staged_file_id,
            clear_existing=clear_existing,
            admin_user=admin_user
        )
        return result["stats"]
