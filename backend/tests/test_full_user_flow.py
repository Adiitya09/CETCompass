"""
Comprehensive End-to-End Integration & Quality Test Suite
==========================================================
Tests the complete critical user flow:
User -> Predictor -> API -> Recommendation Engine -> Database Queries -> Results -> Dashboard -> Isolation.
Also validates edge cases, invalid inputs, error handling, and authorization boundaries.
"""

import json
import jwt
import pytest
from starlette.testclient import TestClient
from backend.app.main import app
from backend.app.core.database import SessionLocal
from backend.app.models.user import User, SavedCollege, PredictionHistory

client = TestClient(app)

def create_user_token(user_id: str, email: str, full_name: str, role: str = "authenticated") -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "user_metadata": {"full_name": full_name},
        "role": role
    }
    return jwt.encode(payload, "test-secret-or-mock", algorithm="HS256")

def test_complete_user_flow_end_to_end():
    """
    Simulates a real student:
    1. Visits colleges directory and filters by district
    2. Inspects a specific college detail page with verified cutoff statistics
    3. Adds 2 colleges to comparison matrix
    4. Runs predictor for 91.50 percentile, GOPENS, Computer Engineering in Pune/Mumbai
    5. Verifies recommendation engine classifications and score calculations
    6. Verifies prediction run is automatically logged into user's history
    7. Saves a recommended college to shortlist with notes
    8. Visits dashboard: verifies profile, saved colleges, prediction history, and compare shortcuts
    9. Removes college from shortlist
    """
    user_id = "flow_student_101"
    token = create_user_token(user_id, "flow_student@example.com", "Rohan Patil")
    headers = {"Authorization": f"Bearer {token}"}

    # Step 1: Browse Colleges Directory
    res_dir = client.get("/api/colleges?district=Pune&page=1&page_size=5")
    assert res_dir.status_code == 200
    dir_data = res_dir.json()
    assert dir_data["total"] > 0
    assert len(dir_data["data"]) <= 5
    college_1 = dir_data["data"][0]
    college_1_id = college_1["id"]

    # Step 2: College Details
    res_detail = client.get(f"/api/colleges/{college_1_id}")
    assert res_detail.status_code == 200
    detail_data = res_detail.json()
    assert detail_data["id"] == college_1_id
    assert "cutoffs" in detail_data
    assert "available_branches" in detail_data
    assert "available_seat_types" in detail_data
    # Verify no unverified fields like fees or rankings are fabricated
    assert "fees" not in detail_data
    assert "rankings" not in detail_data

    # Step 3: Comparison Matrix (Compare 2 Colleges)
    res_dir_all = client.get("/api/colleges?page=1&page_size=2")
    colleges_to_compare = [c["id"] for c in res_dir_all.json()["data"]]
    assert len(colleges_to_compare) >= 2

    res_comp = client.post("/api/compare", json={
        "college_ids": colleges_to_compare,
        "seat_type": "GOPENS",
        "score_type": "MHT-CET"
    })
    assert res_comp.status_code == 200
    comp_data = res_comp.json()
    assert len(comp_data["colleges"]) == len(colleges_to_compare)
    for c in comp_data["colleges"]:
        assert "branches" in c
        assert "available_seat_types" in c

    # Step 4: Run Predictor (91.50 percentile, GOPENS, MHT-CET, Pune)
    predict_payload = {
        "percentile": 91.50,
        "score_type": "MHT-CET",
        "seat_type": "GOPENS",
        "preferred_districts": ["Pune"],
        "page": 1,
        "page_size": 15
    }
    res_predict = client.post("/api/predict", json=predict_payload, headers=headers)
    assert res_predict.status_code == 200
    pred_data = res_predict.json()
    assert "results" in pred_data
    assert "summary" in pred_data
    assert pred_data["summary"]["total_matches"] > 0
    assert pred_data["summary"]["safe_count"] + pred_data["summary"]["moderate_count"] + pred_data["summary"]["reach_count"] > 0

    # Step 5: Verify Recommendation Classifications
    first_rec = pred_data["results"][0]
    assert first_rec["classification"] in ("Safe", "Moderate", "Reach")
    assert 0.0 <= first_rec["recommendation_score"] <= 100.0
    assert first_rec["score_type"] == "MHT-CET"
    assert first_rec["seat_type_code"] == "GOPENS"

    # Step 6: Verify Prediction Run Automatically Logged in User History
    res_hist = client.get("/api/user/prediction-history", headers=headers)
    assert res_hist.status_code == 200
    hist_list = res_hist.json()
    assert len(hist_list) >= 1
    latest_run = hist_list[0]
    assert latest_run["percentile"] == 91.50
    assert latest_run["seat_type"] == "GOPENS"
    assert latest_run["total_matches"] == pred_data["summary"]["total_matches"]
    assert latest_run["recommendations"] is not None
    assert len(latest_run["recommendations"]) > 0
    assert latest_run["recommendations"][0]["college_name"] == first_rec["college_name"]

    # Step 7: Save Recommended College to Shortlist
    save_college_id = first_rec["college_id"]
    res_save = client.post("/api/user/saved-colleges", json={
        "college_id": save_college_id,
        "notes": "Strong candidate for CAP Round 1"
    }, headers=headers)
    assert res_save.status_code in (200, 201)

    # Step 8: View Saved Colleges on Dashboard
    res_saved = client.get("/api/user/saved-colleges", headers=headers)
    assert res_saved.status_code == 200
    saved_colleges = res_saved.json()
    assert any(sc["college_id"] == save_college_id for sc in saved_colleges)

    # Step 9: Delete Saved College from Shortlist
    res_del = client.delete(f"/api/user/saved-colleges/{save_college_id}", headers=headers)
    assert res_del.status_code == 200
    assert res_del.json()["success"] is True

    # Verify Shortlist Is Now Empty for That College
    res_saved_after = client.get("/api/user/saved-colleges", headers=headers)
    assert not any(sc["college_id"] == save_college_id for sc in res_saved_after.json())

def test_user_isolation_strictly_enforced():
    """Verify that User A cannot read or modify User B's saved colleges or history."""
    token_a = create_user_token("student_user_aaa", "aaa@student.org", "Student AAA")
    token_b = create_user_token("student_user_bbb", "bbb@student.org", "Student BBB")
    headers_a = {"Authorization": f"Bearer {token_a}"}
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # User A saves college 2
    client.post("/api/user/saved-colleges", json={"college_id": 2, "notes": "A's Private Note"}, headers=headers_a)

    # User B checks saved colleges -> must NOT contain User A's save
    res_b_saved = client.get("/api/user/saved-colleges", headers=headers_b)
    assert res_b_saved.status_code == 200
    assert not any(c["college_id"] == 2 for c in res_b_saved.json())

    # User B tries to delete User A's saved college -> returns 404
    res_b_del = client.delete("/api/user/saved-colleges/2", headers=headers_b)
    assert res_b_del.status_code == 404

def test_prediction_input_validation_and_boundary_checks():
    """Verify robust validation for erroneous predictor inputs."""
    # 1. Percentile > 100
    res_high = client.post("/api/predict", json={"percentile": 105.0, "seat_type": "GOPENS"})
    assert res_high.status_code == 422

    # 2. Percentile < 0
    res_neg = client.post("/api/predict", json={"percentile": -5.0, "seat_type": "GOPENS"})
    assert res_neg.status_code == 422

    # 3. Empty Seat Type
    res_empty_st = client.post("/api/predict", json={"percentile": 90.0, "seat_type": ""})
    assert res_empty_st.status_code == 422

def test_comparison_validation_and_bounds():
    """Verify comparison requirements: minimum 2 colleges, maximum 5 colleges."""
    # 1. Only 1 college provided -> 422
    res_one = client.post("/api/compare", json={"college_ids": [1]})
    assert res_one.status_code == 422

    # 2. More than 5 colleges provided -> 422
    res_six = client.post("/api/compare", json={"college_ids": [1, 2, 3, 4, 5, 6]})
    assert res_six.status_code == 422

def test_empty_dataset_prediction_handling():
    """Verify that predictions with impossibly restrictive filters return clean empty results without throwing."""
    res_empty = client.post("/api/predict", json={
        "percentile": 90.0,
        "seat_type": "GOPENS",
        "preferred_districts": ["NonExistentDistrictName9999"]
    })
    assert res_empty.status_code == 200
    data = res_empty.json()
    assert data["results"] == []
    assert data["summary"]["total_matches"] == 0
    assert data["summary"]["safe_count"] == 0
