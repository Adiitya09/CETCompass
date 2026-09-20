from starlette.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

def test_health_check():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"

def test_get_stats():
    response = client.get("/api/stats")
    assert response.status_code == 200
    data = response.json()
    assert data["colleges_count"] == 326
    assert data["branches_count"] == 94
    assert data["seat_types_count"] == 77
    assert data["cutoff_records_count"] == 28377

def test_get_colleges_pagination():
    response = client.get("/api/colleges?page=1&page_size=5")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 326
    assert len(data["data"]) == 5

def test_get_college_detail():
    # Test getting COEP or first college
    col_res = client.get("/api/colleges?page=1&page_size=1")
    first_col = col_res.json()["data"][0]
    col_id = first_col["id"]

    response = client.get(f"/api/colleges/{col_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == first_col["name"]
    assert len(data["cutoffs"]) > 0

def test_predict_api():
    payload = {
        "percentile": 92.5,
        "score_type": "MHT-CET",
        "seat_type": "GOPENS",
        "preferred_districts": ["Pune"],
        "page": 1,
        "page_size": 15
    }
    response = client.post("/api/predict", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "summary" in data
    assert "results" in data
    assert data["summary"]["user_percentile"] == 92.5
    assert len(data["results"]) > 0

def test_branches_endpoint():
    response = client.get("/api/branches")
    assert response.status_code == 200
    data = response.json()
    assert "categories" in data
    assert len(data["categories"]) > 0

def test_seat_types_endpoint():
    response = client.get("/api/seat-types")
    assert response.status_code == 200
    data = response.json()
    assert "all_seat_types" in data
    assert len(data["all_seat_types"]) == 77

def test_locations_endpoint():
    response = client.get("/api/locations")
    assert response.status_code == 200
    data = response.json()
    assert "districts" in data
    assert len(data["districts"]) > 0

def test_compare_colleges_endpoint():
    col_res = client.get("/api/colleges?page=1&page_size=3")
    colleges = col_res.json()["data"]
    assert len(colleges) >= 2
    ids = [colleges[0]["id"], colleges[1]["id"]]
    response = client.post("/api/compare", json={"college_ids": ids, "seat_type": "GOPENS", "score_type": "MHT-CET"})
    assert response.status_code == 200
    data = response.json()
    assert "colleges" in data
    assert len(data["colleges"]) == 2
    first = data["colleges"][0]
    assert "name" in first
    assert "available_seat_types" in first
    assert "branches" in first
    if len(first["branches"]) > 0:
        b = first["branches"][0]
        assert "min_cutoff" in b
        assert "max_cutoff" in b
        assert "mean_cutoff" in b
        assert "range_cutoff" in b
        assert "count" in b
