import os
import io
import pytest
import pandas as pd
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.core.config import settings
from backend.app.database.session import SessionLocal
from backend.app.models.cutoff import CutoffRecord
from backend.app.models.metadata import ImportLog

client = TestClient(app)

ADMIN_HEADERS = {"X-Admin-Key": settings.ADMIN_API_KEY}
STUDENT_HEADERS = {"X-User-Id": "student_candidate_123"}
GUEST_HEADERS = {"X-User-Id": "guest_anonymous"}

def test_admin_role_authorization_and_forbidden():
    """
    Ensure unauthenticated users receive 401 and non-admin users (students/guests)
    receive 403 Forbidden across all administrative endpoints.
    """
    admin_routes = [
        ("GET", "/api/admin/statistics"),
        ("GET", "/api/admin/quality"),
        ("GET", "/api/admin/history"),
        ("POST", "/api/admin/validate"),
        ("POST", "/api/admin/confirm-import"),
        ("POST", "/api/admin/import"),
    ]

    for method, path in admin_routes:
        # 1. Unauthenticated -> 401
        res_unauth = client.request(method, path)
        assert res_unauth.status_code == 401, f"{method} {path} should return 401 for unauthenticated request"

        # 2. Student credentials -> 403 Forbidden
        res_forbidden = client.request(method, path, headers=STUDENT_HEADERS)
        assert res_forbidden.status_code == 403, f"{method} {path} should return 403 for student request"
        assert res_forbidden.json()["code"] == "FORBIDDEN"

        # 3. Guest credentials -> 403 Forbidden
        res_guest_forbidden = client.request(method, path, headers=GUEST_HEADERS)
        assert res_guest_forbidden.status_code == 403, f"{method} {path} should return 403 for guest request"

def test_admin_statistics():
    """
    Verify platform analytics return accurate counts for colleges, branches, seat types, and cutoffs.
    """
    response = client.get("/api/admin/statistics", headers=ADMIN_HEADERS)
    assert response.status_code == 200
    data = response.json()

    assert data["colleges_count"] >= 320
    assert data["branches_count"] == 94
    assert data["seat_types_count"] == 77
    assert data["cutoff_records_count"] == 28377
    assert "MHT-CET" in data["score_types_distribution"]
    assert "JEE(Main)" in data["score_types_distribution"]
    assert len(data["regions_distribution"]) >= 6

def test_admin_data_quality():
    """
    Verify data quality audit indicators check score integrity, spread sanity, and missingness.
    """
    response = client.get("/api/admin/quality", headers=ADMIN_HEADERS)
    assert response.status_code == 200
    data = response.json()

    assert data["total_active_records"] == 28377
    assert data["checks_passed"] is True
    assert data["completeness_score"] >= 99.0
    assert data["score_integrity"]["mht_cet_out_of_bounds"] == 0
    assert data["spread_sanity"]["min_greater_than_max"] == 0
    assert data["missingness_rates"]["null_colleges"] == 0
    assert "audit_summary" in data

def test_admin_validate_file_invalid_schema():
    """
    Verify that validating an invalid file returns valid=False with error details,
    and CRITICALLY does not alter the production database.
    """
    db = SessionLocal()
    initial_count = db.query(CutoffRecord).count()
    db.close()

    # Invalid CSV missing required columns
    csv_content = "some_random_column,another_column\nval1,val2\nval3,val4\n"
    files = {"file": ("invalid_schema.csv", io.BytesIO(csv_content.encode("utf-8")), "text/csv")}

    response = client.post("/api/admin/validate", headers=ADMIN_HEADERS, files=files)
    assert response.status_code == 200
    data = response.json()

    assert data["valid"] is False
    assert data["error_count"] > 0
    assert len(data["errors"]) > 0
    assert "Missing required columns" in data["errors"][0]["error"]
    assert data["staged_file_id"] is None

    # Verify production database was NOT altered
    db = SessionLocal()
    post_count = db.query(CutoffRecord).count()
    db.close()
    assert post_count == initial_count

def test_admin_validate_file_valid_csv():
    """
    Verify that validating a valid CSV produces preview rows, statistics, a staged_file_id,
    and does NOT modify the production database.
    """
    db = SessionLocal()
    initial_count = db.query(CutoffRecord).count()
    db.close()

    # Valid CSV content matching data schema
    csv_rows = (
        "college_name,score_type,seat_type,branch,min,max,mean,count\n"
        "College of Engineering Pune,MHT-CET,GOPENS,Computer Engineering,99.2,99.9,99.5,60\n"
        "Veermata Jijabai Technological Institute Mumbai,MHT-CET,GOPENS,Information Technology,98.5,99.4,98.9,60\n"
        "Walchand College of Engineering Sangli,MHT-CET,LOPENH,Electronics Engineering,95.0,97.2,96.1,45\n"
    )
    files = {"file": ("test_valid.csv", io.BytesIO(csv_rows.encode("utf-8")), "text/csv")}

    response = client.post("/api/admin/validate", headers=ADMIN_HEADERS, files=files)
    assert response.status_code == 200
    data = response.json()

    assert data["valid"] is True
    assert data["total_rows"] == 3
    assert data["valid_rows"] == 3
    assert data["error_count"] == 0
    assert data["detected_colleges"] == 3
    assert data["staged_file_id"] is not None
    assert len(data["preview_rows"]) == 3
    assert data["preview_rows"][0]["college_name"] == "College of Engineering Pune"

    # Verify database was NOT touched during validation
    db = SessionLocal()
    post_count = db.query(CutoffRecord).count()
    db.close()
    assert post_count == initial_count

def test_admin_validate_unsupported_file_type():
    """
    Ensure only .xlsx, .xls, and .csv files are accepted.
    """
    files = {"file": ("malicious.exe", io.BytesIO(b"executable binary"), "application/octet-stream")}
    response = client.post("/api/admin/validate", headers=ADMIN_HEADERS, files=files)
    assert response.status_code == 422
    assert "Only Excel (.xlsx, .xls) and CSV (.csv) files are supported" in response.json()["detail"]

def test_admin_confirm_import_transaction_safety_and_rollback():
    """
    Verify transaction safety:
    When a database integrity violation occurs during confirmed import,
    the transaction is rolled back, the production cutoff records are untouched,
    and a FAILED audit log is recorded in import_logs.
    """
    db = SessionLocal()
    initial_count = db.query(CutoffRecord).count()
    db.close()

    # Create CSV with record that already exists in DB to trigger unique constraint violation
    csv_rows = (
        "college_name,score_type,seat_type,branch,min,max,mean,count\n"
        "Government College of Engineering Amravati,MHT-CET,GOPENS,Computer Science and Engineering,96.5,98.2,97.3,60\n"
    )
    files = {"file": ("conflict_test.csv", io.BytesIO(csv_rows.encode("utf-8")), "text/csv")}
    val_res = client.post("/api/admin/validate", headers=ADMIN_HEADERS, files=files)
    assert val_res.status_code == 200
    staged_id = val_res.json()["staged_file_id"]
    assert staged_id is not None

    # Confirm import with clear_existing=False to trigger unique constraint collision
    conf_res = client.post(
        "/api/admin/confirm-import",
        headers=ADMIN_HEADERS,
        json={"staged_file_id": staged_id, "clear_existing": False}
    )
    assert conf_res.status_code == 500
    data = conf_res.json()
    assert data["code"] == "INGESTION_ROLLBACK"
    assert "safely rolled back" in data["message"]

    # Verify production cutoff count was preserved (rollback succeeded)
    db = SessionLocal()
    current_count = db.query(CutoffRecord).count()
    failed_log = db.query(ImportLog).filter(ImportLog.status == "FAILED").order_by(ImportLog.id.desc()).first()
    db.close()

    assert current_count == initial_count
    assert failed_log is not None
    assert failed_log.filename.endswith(".csv")
    assert failed_log.status == "FAILED"

def test_admin_import_history_query():
    """
    Verify /api/admin/history returns chronological audit history items.
    """
    hist_res = client.get("/api/admin/history", headers=ADMIN_HEADERS)
    assert hist_res.status_code == 200
    history = hist_res.json()
    assert isinstance(history, list)
    assert len(history) > 0
    item = history[0]
    assert "status" in item
    assert "filename" in item
    assert "created_at" in item

def test_admin_confirm_invalid_staged_token():
    """
    Confirming with an invalid or expired token must fail safely without crashing.
    """
    conf_res = client.post(
        "/api/admin/confirm-import",
        headers=ADMIN_HEADERS,
        json={"staged_file_id": "non_existent_token_999", "clear_existing": False}
    )
    assert conf_res.status_code == 422
    assert "Staged file not found" in conf_res.json()["detail"]
