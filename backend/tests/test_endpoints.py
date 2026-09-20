import pytest
from starlette.testclient import TestClient
from backend.app.main import app
from backend.app.core.config import settings

client = TestClient(app)

# ---------------------------------------------------------
# 1. Core Endpoints
# ---------------------------------------------------------

def test_root():
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert "CETCompass" in data["message"]
    assert "disclaimer" in data

def test_health_check():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["database"] == "connected"

# ---------------------------------------------------------
# 2. Colleges Endpoints: GET /api/colleges, GET /api/colleges/{college_id}
# ---------------------------------------------------------

def test_get_colleges_pagination():
    response = client.get("/api/colleges?page=1&page_size=10")
    assert response.status_code == 200
    data = response.json()
    assert "total" in data
    assert "data" in data
    assert data["page"] == 1
    assert data["page_size"] == 10
    assert len(data["data"]) == 10
    assert data["total"] >= 320

def test_get_colleges_filter_district():
    response = client.get("/api/colleges?district=Pune&page_size=5")
    assert response.status_code == 200
    data = response.json()
    assert len(data["data"]) > 0
    for col in data["data"]:
        assert col["district"] == "Pune"

def test_get_colleges_filter_search():
    response = client.get("/api/colleges?q=Engineering&page_size=5")
    assert response.status_code == 200
    data = response.json()
    assert len(data["data"]) > 0

def test_get_colleges_sorting():
    res_asc = client.get("/api/colleges?sort_by=name&sort_order=asc&page_size=5")
    res_desc = client.get("/api/colleges?sort_by=name&sort_order=desc&page_size=5")
    assert res_asc.status_code == 200
    assert res_desc.status_code == 200
    first_asc = res_asc.json()["data"][0]["name"]
    first_desc = res_desc.json()["data"][0]["name"]
    assert first_asc != first_desc

def test_get_college_by_id():
    # First get list
    list_res = client.get("/api/colleges?page_size=1")
    col_id = list_res.json()["data"][0]["id"]
    
    response = client.get(f"/api/colleges/{col_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == col_id
    assert "cutoffs" in data
    assert "available_branches" in data
    assert "available_seat_types" in data

def test_get_college_by_slug():
    list_res = client.get("/api/colleges?page_size=1")
    col_slug = list_res.json()["data"][0]["slug"]
    
    response = client.get(f"/api/colleges/{col_slug}")
    assert response.status_code == 200
    data = response.json()
    assert data["slug"] == col_slug

def test_get_college_not_found():
    response = client.get("/api/colleges/999999")
    assert response.status_code == 404
    data = response.json()
    assert data["status"] == "error"
    assert data["code"] == "NOT_FOUND"

# ---------------------------------------------------------
# 3. Metadata Endpoints: GET /api/branches, GET /api/seat-types, GET /api/search
# ---------------------------------------------------------

def test_get_branches():
    response = client.get("/api/branches")
    assert response.status_code == 200
    data = response.json()
    assert "categories" in data
    assert "grouped" in data
    assert "all_branches" in data
    assert data["total"] == 94

def test_get_branches_filter_category():
    response = client.get("/api/branches?category=Computer%20Science%20%26%20IT")
    assert response.status_code == 200
    data = response.json()
    assert "Computer Science & IT" in data["grouped"]
    assert len(data["grouped"]["Computer Science & IT"]) > 0

def test_get_seat_types():
    response = client.get("/api/seat-types")
    assert response.status_code == 200
    data = response.json()
    assert "categories" in data
    assert "all_seat_types" in data
    assert data["total"] == 77

def test_get_search():
    response = client.get("/api/search?q=Pune&limit=5")
    assert response.status_code == 200
    data = response.json()
    assert data["query"] == "Pune"
    assert "colleges" in data
    assert "branches" in data
    assert "locations" in data
    assert data["total_matches"] > 0

def test_get_search_empty():
    response = client.get("/api/search")
    assert response.status_code == 200
    data = response.json()
    assert data["total_matches"] == 0
    assert len(data["colleges"]) == 0

# ---------------------------------------------------------
# 4. Prediction & Compare: POST /api/predict, POST /api/compare
# ---------------------------------------------------------

def test_post_predict():
    payload = {
        "percentile": 93.0,
        "score_type": "MHT-CET",
        "seat_type": "GOPENS",
        "preferred_districts": ["Pune"],
        "page": 1,
        "page_size": 10
    }
    response = client.post("/api/predict", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "summary" in data
    assert "disclaimer" in data
    assert "results" in data
    assert data["summary"]["user_percentile"] == 93.0
    assert len(data["results"]) > 0
    for item in data["results"]:
        assert item["district"] == "Pune"
        assert item["classification"] in ["Safe", "Moderate", "Reach"]
        assert item["recommendation_score"] >= 5.0

def test_post_predict_validation_error():
    # Percentile > 100
    payload = {
        "percentile": 150.0,
        "score_type": "MHT-CET",
        "seat_type": "GOPENS"
    }
    response = client.post("/api/predict", json=payload)
    assert response.status_code == 422
    data = response.json()
    assert data["status"] == "error"

def test_post_compare_success():
    # Fetch 2 real colleges
    list_res = client.get("/api/colleges?page_size=2")
    col_ids = [c["id"] for c in list_res.json()["data"]]
    
    payload = {
        "college_ids": col_ids,
        "seat_type": "GOPENS",
        "score_type": "MHT-CET"
    }
    response = client.post("/api/compare", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "colleges" in data
    assert len(data["colleges"]) == 2

def test_post_compare_validation_error():
    # Less than 2 colleges
    payload = {
        "college_ids": [1],
        "seat_type": "GOPENS"
    }
    response = client.post("/api/compare", json=payload)
    assert response.status_code == 422 or response.status_code == 400

# ---------------------------------------------------------
# 5. Authenticated User APIs:
# GET /api/user/saved-colleges
# POST /api/user/saved-colleges
# DELETE /api/user/saved-colleges/{college_id}
# GET /api/user/prediction-history
# ---------------------------------------------------------

def test_user_endpoints_unauthorized():
    # Calling saved-colleges without any headers should return 401
    response = client.get("/api/user/saved-colleges")
    assert response.status_code == 401
    assert response.json()["status"] == "error"
    assert response.json()["code"] == "UNAUTHORIZED"

def test_user_saved_colleges_flow():
    headers = {"X-User-Id": "test_student_user_123"}

    # 1. Initial list
    res_list = client.get("/api/user/saved-colleges", headers=headers)
    assert res_list.status_code == 200
    initial_count = len(res_list.json())

    # 2. Get a college to save
    col_res = client.get("/api/colleges?page_size=1")
    target_college_id = col_res.json()["data"][0]["id"]

    # 3. Save the college
    save_res = client.post(
        "/api/user/saved-colleges",
        headers=headers,
        json={"college_id": target_college_id, "notes": "Top choice"}
    )
    assert save_res.status_code == 201
    save_data = save_res.json()
    assert save_data["college_id"] == target_college_id
    assert save_data["notes"] == "Top choice"

    # 4. Verify in list
    res_list_2 = client.get("/api/user/saved-colleges", headers=headers)
    assert res_list_2.status_code == 200
    assert len(res_list_2.json()) == initial_count + 1

    # 5. Delete the saved college
    del_res = client.delete(f"/api/user/saved-colleges/{target_college_id}", headers=headers)
    assert del_res.status_code == 200
    assert del_res.json()["success"] is True

    # 6. Verify removed
    res_list_3 = client.get("/api/user/saved-colleges", headers=headers)
    assert res_list_3.status_code == 200
    assert len(res_list_3.json()) == initial_count

def test_user_prediction_history():
    headers = {"X-User-Id": "test_history_user_456"}

    # Record prediction history
    hist_payload = {
        "percentile": 95.5,
        "score_type": "MHT-CET",
        "seat_type": "GOPENS",
        "preferred_branches": ["Computer Engineering"],
        "preferred_locations": ["Pune"],
        "total_matches": 15,
        "safe_count": 8,
        "moderate_count": 5,
        "reach_count": 2
    }
    create_res = client.post("/api/user/prediction-history", headers=headers, json=hist_payload)
    assert create_res.status_code == 201
    assert "history_id" in create_res.json()

    # Get history
    get_res = client.get("/api/user/prediction-history", headers=headers)
    assert get_res.status_code == 200
    history_items = get_res.json()
    assert len(history_items) >= 1
    assert history_items[0]["percentile"] == 95.5
    assert history_items[0]["seat_type"] == "GOPENS"

# ---------------------------------------------------------
# 6. Admin APIs: POST /api/admin/import, GET /api/admin/statistics
# ---------------------------------------------------------

def test_admin_endpoints_unauthorized_and_forbidden():
    # Without credentials -> 401
    res_unauth = client.get("/api/admin/statistics")
    assert res_unauth.status_code == 401

    # With non-admin user credentials -> 403
    student_headers = {"X-User-Id": "regular_student_user"}
    res_forbidden = client.get("/api/admin/statistics", headers=student_headers)
    assert res_forbidden.status_code == 403
    assert res_forbidden.json()["code"] == "FORBIDDEN"

def test_admin_statistics_authorized():
    admin_headers = {"X-Admin-Key": settings.ADMIN_API_KEY}
    response = client.get("/api/admin/statistics", headers=admin_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["colleges_count"] >= 320
    assert data["branches_count"] == 94
    assert data["seat_types_count"] == 77
    assert data["cutoff_records_count"] == 28377
    assert "score_types_distribution" in data
    assert "regions_distribution" in data

def test_admin_import_authorized():
    admin_headers = {"X-Admin-Key": settings.ADMIN_API_KEY}
    # Test importing from existing default dataset path (clear_existing=False to be fast and safe)
    response = client.post(
        "/api/admin/import",
        headers=admin_headers,
        data={"file_path": settings.DEFAULT_DATASET_PATH, "clear_existing": "true"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "stats" in data
