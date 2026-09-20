import pytest
from backend.app.services.predictor import calculate_classification_and_score
from backend.app.core.database import SessionLocal
from backend.app.schemas.predict import PredictRequest
from backend.app.services.predictor import predict_colleges

def test_calculate_classification_safe():
    # Student percentile 95, min cutoff 90 -> delta = +5.0 -> Safe
    classification, score, label = calculate_classification_and_score(
        percentile=95.0,
        min_cutoff=90.0,
        mean_cutoff=92.0,
        max_cutoff=96.0,
        count=15,
        range_cutoff=6.0
    )
    assert classification == "Safe"
    assert score >= 80.0
    assert "High" in label

def test_calculate_classification_moderate():
    # Student percentile 91.5, min cutoff 90.0 -> delta = +1.5 -> Moderate
    classification, score, label = calculate_classification_and_score(
        percentile=91.5,
        min_cutoff=90.0,
        mean_cutoff=93.0,
        max_cutoff=96.0,
        count=10,
        range_cutoff=6.0
    )
    assert classification == "Moderate"
    assert 65.0 <= score <= 85.0
    assert "Moderate" in label

def test_calculate_classification_reach():
    # Student percentile 88.0, min cutoff 90.0 -> delta = -2.0 -> Reach
    classification, score, label = calculate_classification_and_score(
        percentile=88.0,
        min_cutoff=90.0,
        mean_cutoff=92.0,
        max_cutoff=95.0,
        count=8,
        range_cutoff=5.0,
        reach_buffer=4.0
    )
    assert classification == "Reach"
    assert score < 70.0
    assert "Ambitious" in label

def test_predict_colleges_real_db():
    db = SessionLocal()
    try:
        req = PredictRequest(
            percentile=90.0,
            score_type="MHT-CET",
            seat_type="GOPENS",
            preferred_districts=["Pune"],
            page=1,
            page_size=10
        )
        resp = predict_colleges(db, req)
        assert resp.summary.total_matches > 0
        assert resp.summary.safe_count >= 0
        assert resp.summary.reach_count >= 0
        assert len(resp.results) <= 10
        assert resp.disclaimer is not None
        for item in resp.results:
            assert item.district == "Pune"
            assert item.classification in ["Safe", "Moderate", "Reach"]
            assert item.category in ["SAFE", "MODERATE", "REACH"]
            assert item.student_percentile == 90.0
            assert item.historical_min <= item.historical_max
            assert item.historical_min <= item.historical_mean <= item.historical_max
            assert isinstance(item.cutoff_gap, float)
            assert item.cutoff_gap == pytest.approx(round(90.0 - item.historical_min, 4), rel=1e-4)
            assert isinstance(item.explanation, str)
            assert len(item.explanation) > 15
            # Non-guarantee check
            assert "100% guarantee" not in item.explanation.lower()
            assert "guaranteed" not in item.explanation.lower()
    finally:
        db.close()


def test_college_list_filter_seat_type():
    from backend.app.services.college_service import CollegeService
    db = SessionLocal()
    try:
        # Search colleges with TFWS seat type
        resp = CollegeService.list_colleges(db=db, seat_type="TFWS", page=1, page_size=10)
        assert resp["total"] > 0
        assert len(resp["data"]) <= 10
    finally:
        db.close()

