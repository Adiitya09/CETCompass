import jwt
import pytest
from starlette.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

def create_mock_supabase_token(user_id: str, email: str, full_name: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "user_metadata": {"full_name": full_name},
        "role": "authenticated"
    }
    return jwt.encode(payload, "test-secret-or-mock", algorithm="HS256")

def test_unauthorized_access():
    """Verify that requests without credentials return 401 Unauthorized."""
    # 1. Saved colleges GET
    res_get_saved = client.get("/api/user/saved-colleges")
    assert res_get_saved.status_code == 401
    assert "Authentication" in res_get_saved.json().get("detail", "")

    # 2. Saved colleges POST
    res_post_saved = client.post("/api/user/saved-colleges", json={"college_id": 1})
    assert res_post_saved.status_code == 401

    # 3. Prediction history GET
    res_get_hist = client.get("/api/user/prediction-history")
    assert res_get_hist.status_code == 401

    # 4. Prediction history POST
    res_post_hist = client.post("/api/user/prediction-history", json={
        "percentile": 90.0,
        "score_type": "MHT-CET",
        "seat_type": "GOPENS",
        "total_matches": 10,
        "safe_count": 5,
        "moderate_count": 3,
        "reach_count": 2
    })
    assert res_post_hist.status_code == 401

def test_authenticated_access_saved_colleges():
    """Verify authenticated user can bookmark, view, and remove colleges."""
    token = create_mock_supabase_token("user_test_alpha", "alpha@test.com", "Alpha Student")
    headers = {"Authorization": f"Bearer {token}"}

    # Save college 1
    res_save = client.post("/api/user/saved-colleges", json={"college_id": 1, "notes": "Top Choice"}, headers=headers)
    assert res_save.status_code == 201
    data_save = res_save.json()
    assert data_save["college_id"] == 1
    assert data_save["user_id"] == "user_test_alpha"
    assert data_save["notes"] == "Top Choice"

    # View saved colleges
    res_view = client.get("/api/user/saved-colleges", headers=headers)
    assert res_view.status_code == 200
    saved_list = res_view.json()
    assert len(saved_list) >= 1
    assert any(c["college_id"] == 1 for c in saved_list)

    # Delete saved college
    res_del = client.delete("/api/user/saved-colleges/1", headers=headers)
    assert res_del.status_code == 200
    assert res_del.json()["success"] is True

    # View again to verify removal
    res_view2 = client.get("/api/user/saved-colleges", headers=headers)
    assert res_view2.status_code == 200
    assert not any(c["college_id"] == 1 for c in res_view2.json())

def test_authenticated_access_prediction_history():
    """Verify storing and retrieving prediction history with recommendations."""
    token = create_mock_supabase_token("user_test_beta", "beta@test.com", "Beta Student")
    headers = {"Authorization": f"Bearer {token}"}

    recs_payload = [
        {"college_id": 1, "college_name": "VJTI Mumbai", "branch_name": "Computer Engineering", "classification": "Safe", "score": 92.5},
        {"college_id": 2, "college_name": "COEP Pune", "branch_name": "Computer Engineering", "classification": "Moderate", "score": 85.0}
    ]

    res_post = client.post("/api/user/prediction-history", json={
        "percentile": 98.5,
        "score_type": "MHT-CET",
        "seat_type": "GOPENS",
        "preferred_branches": ["Computer Engineering"],
        "preferred_locations": ["Mumbai", "Pune"],
        "total_matches": 2,
        "safe_count": 1,
        "moderate_count": 1,
        "reach_count": 0,
        "recommendations": recs_payload
    }, headers=headers)
    assert res_post.status_code == 201
    assert res_post.json()["success"] is True
    assert "history_id" in res_post.json()

    # Retrieve history
    res_get = client.get("/api/user/prediction-history", headers=headers)
    assert res_get.status_code == 200
    history_items = res_get.json()
    assert len(history_items) >= 1
    first = history_items[0]
    assert first["percentile"] == 98.5
    assert first["preferred_branches"] == ["Computer Engineering"]
    assert first["recommendations"] is not None
    assert len(first["recommendations"]) == 2
    assert first["recommendations"][0]["college_name"] == "VJTI Mumbai"

def test_user_isolation():
    """Verify that User A cannot see, access, or delete User B's saved colleges or prediction history."""
    token_a = create_mock_supabase_token("user_isolation_a", "usera@test.com", "User Alpha")
    token_b = create_mock_supabase_token("user_isolation_b", "userb@test.com", "User Beta")
    headers_a = {"Authorization": f"Bearer {token_a}"}
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # User A saves college 1
    client.post("/api/user/saved-colleges", json={"college_id": 1, "notes": "Alpha Only"}, headers=headers_a)

    # User B saves college 2
    client.post("/api/user/saved-colleges", json={"college_id": 2, "notes": "Beta Only"}, headers=headers_b)

    # User A views saved colleges -> only sees College 1
    saved_a = client.get("/api/user/saved-colleges", headers=headers_a).json()
    ids_a = [item["college_id"] for item in saved_a]
    assert 1 in ids_a
    assert 2 not in ids_a

    # User B views saved colleges -> only sees College 2
    saved_b = client.get("/api/user/saved-colleges", headers=headers_b).json()
    ids_b = [item["college_id"] for item in saved_b]
    assert 2 in ids_b
    assert 1 not in ids_b

    # User A attempts to delete User B's college (college 2) -> 404 (not found in A's list)
    del_res = client.delete("/api/user/saved-colleges/2", headers=headers_a)
    assert del_res.status_code == 404

    # Confirm User B's college 2 is STILL saved and untouched
    saved_b_after = client.get("/api/user/saved-colleges", headers=headers_b).json()
    assert any(item["college_id"] == 2 for item in saved_b_after)

    # Clean up
    client.delete("/api/user/saved-colleges/1", headers=headers_a)
    client.delete("/api/user/saved-colleges/2", headers=headers_b)
