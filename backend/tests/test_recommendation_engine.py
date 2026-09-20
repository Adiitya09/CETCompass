import pytest
from recommendation_service import (
    RecommendationEngine,
    RecommendationConfig,
    RecommendationCategory,
    StudentProfile,
    CutoffStats,
    DISCLAIMER_TEXT
)

@pytest.fixture
def engine():
    return RecommendationEngine()

@pytest.fixture
def sample_cutoffs():
    return [
        CutoffStats(
            college_id=1,
            college_name="COEP Technological University",
            college_slug="coep-technological-university",
            district="Pune",
            city="Pune",
            region="Pune Region",
            branch_id=1,
            branch_name="Computer Engineering",
            branch_category="Computer Science & IT",
            seat_type="GOPENS",
            score_type="MHT-CET",
            min_cutoff=99.77,
            mean_cutoff=99.85,
            max_cutoff=100.0,
            range_cutoff=0.23,
            count=37
        ),
        CutoffStats(
            college_id=2,
            college_name="Pune Institute of Computer Technology",
            college_slug="pict-pune",
            district="Pune",
            city="Pune",
            region="Pune Region",
            branch_id=1,
            branch_name="Computer Engineering",
            branch_category="Computer Science & IT",
            seat_type="GOPENS",
            score_type="MHT-CET",
            min_cutoff=99.40,
            mean_cutoff=99.60,
            max_cutoff=99.90,
            range_cutoff=0.50,
            count=30
        ),
        CutoffStats(
            college_id=3,
            college_name="Vishwakarma Institute of Technology",
            college_slug="vit-pune",
            district="Pune",
            city="Pune",
            region="Pune Region",
            branch_id=1,
            branch_name="Computer Engineering",
            branch_category="Computer Science & IT",
            seat_type="GOPENS",
            score_type="MHT-CET",
            min_cutoff=98.80,
            mean_cutoff=99.10,
            max_cutoff=99.50,
            range_cutoff=0.70,
            count=45
        ),
        CutoffStats(
            college_id=4,
            college_name="Pimpri Chinchwad College of Engineering",
            college_slug="pccoe-pune",
            district="Pune",
            city="Pune",
            region="Pune Region",
            branch_id=2,
            branch_name="Mechanical Engineering",
            branch_category="Mechanical & Automation",
            seat_type="GOPENS",
            score_type="MHT-CET",
            min_cutoff=86.50,
            mean_cutoff=90.20,
            max_cutoff=94.00,
            range_cutoff=7.50,
            count=25
        ),
        CutoffStats(
            college_id=5,
            college_name="Government College of Engineering, Karad",
            college_slug="gcoe-karad",
            district="Satara",
            city="Karad",
            region="Pune Region",
            branch_id=3,
            branch_name="Civil Engineering",
            branch_category="Civil & Environmental",
            seat_type="TFWS",
            score_type="MHT-CET",
            min_cutoff=72.00,
            mean_cutoff=78.50,
            max_cutoff=84.00,
            range_cutoff=12.00,
            count=3
        ),
        CutoffStats(
            college_id=6,
            college_name="Government College of Engineering, Karad",
            college_slug="gcoe-karad",
            district="Satara",
            city="Karad",
            region="Pune Region",
            branch_id=3,
            branch_name="Civil Engineering",
            branch_category="Civil & Environmental",
            seat_type="EWS",
            score_type="MHT-CET",
            min_cutoff=68.00,
            mean_cutoff=74.00,
            max_cutoff=80.00,
            range_cutoff=12.00,
            count=6
        ),
    ]

# 1. High Percentile Student Test
def test_high_percentile(engine, sample_cutoffs):
    student = StudentProfile(percentile=99.88, seat_type="GOPENS", score_type="MHT-CET")
    results = engine.evaluate_all(student, sample_cutoffs)

    assert len(results) > 0
    # COEP min cutoff is 99.77, mean 99.85 -> student (99.88) exceeds mean -> SAFE
    coep_res = next(r for r in results if r.college_name == "COEP Technological University")
    assert coep_res.recommendation_category == RecommendationCategory.SAFE
    assert coep_res.cutoff_gap > 0
    assert coep_res.recommendation_score >= 70.0
    # Top recommendation with large safety buffer has score >= 90.0
    assert results[0].recommendation_score >= 90.0
    assert "definitely get" not in coep_res.explanation.lower()
    assert coep_res.disclaimer == DISCLAIMER_TEXT

# 2. Low Percentile Student Test
def test_low_percentile(engine, sample_cutoffs):
    student = StudentProfile(percentile=55.0, seat_type="GOPENS", score_type="MHT-CET")
    # All GOPENS colleges in sample have cutoffs >= 86.50
    # With include_unlikely=False, all should be filtered out
    results = engine.evaluate_all(student, sample_cutoffs, include_unlikely=False)
    assert len(results) == 0

    # With include_unlikely=True, they should be marked as UNLIKELY
    results_all = engine.evaluate_all(student, sample_cutoffs, include_unlikely=True)
    assert len(results_all) > 0
    for r in results_all:
        assert r.recommendation_category == RecommendationCategory.UNLIKELY
        assert r.recommendation_score < 40.0
        assert "low probability" in r.explanation.lower()

# 3. Boundary Cases Tests
def test_boundary_cases(engine):
    cutoff = CutoffStats(
        college_id=10,
        college_name="Test Engineering College",
        college_slug="test-college",
        district="Pune",
        city="Pune",
        region="Pune Region",
        branch_id=1,
        branch_name="Computer Engineering",
        branch_category="Computer Science & IT",
        seat_type="GOPENS",
        score_type="MHT-CET",
        min_cutoff=90.0,
        mean_cutoff=94.0,
        max_cutoff=98.0,
        range_cutoff=8.0,
        count=20
    )

    # Case A: Exact minimum cutoff match (gap = 0.00) -> MODERATE
    res_exact_min = engine.evaluate_single(StudentProfile(percentile=90.0), cutoff)
    assert res_exact_min.recommendation_category == RecommendationCategory.MODERATE
    assert res_exact_min.cutoff_gap == 0.0
    assert "realistic, competitive" in res_exact_min.explanation.lower()

    # Case B: Exactly at safe threshold (gap = +3.00, student = 93.0) -> SAFE
    res_safe_edge = engine.evaluate_single(StudentProfile(percentile=93.0), cutoff)
    assert res_safe_edge.recommendation_category == RecommendationCategory.SAFE
    assert res_safe_edge.cutoff_gap == 3.0

    # Case C: Just below safe threshold (gap = +2.99) -> MODERATE
    res_mod_edge = engine.evaluate_single(StudentProfile(percentile=92.99), cutoff)
    assert res_mod_edge.recommendation_category == RecommendationCategory.MODERATE

    # Case D: Equal to cohort mean (student = 94.0) -> SAFE
    res_mean = engine.evaluate_single(StudentProfile(percentile=94.0), cutoff)
    assert res_mean.recommendation_category == RecommendationCategory.SAFE

    # Case E: Reach boundary (gap = -4.00, student = 86.0) -> REACH
    res_reach = engine.evaluate_single(StudentProfile(percentile=86.0), cutoff)
    assert res_reach.recommendation_category == RecommendationCategory.REACH
    assert "ambitious" in res_reach.explanation.lower()

    # Case F: Outside reach boundary (gap = -4.01, student = 85.99) -> UNLIKELY
    res_unlikely = engine.evaluate_single(StudentProfile(percentile=85.99), cutoff)
    assert res_unlikely.recommendation_category == RecommendationCategory.UNLIKELY

# 4. Missing Data & Null Input Validation
def test_missing_data(engine):
    with pytest.raises(ValueError, match="Student percentile is required"):
        StudentProfile(percentile=None).validate()

# 5. Invalid Input Validation Tests
def test_invalid_inputs(engine):
    # Negative percentile
    with pytest.raises(ValueError, match="between 0.00 and 100.00"):
        StudentProfile(percentile=-2.5).validate()

    # Percentile > 100
    with pytest.raises(ValueError, match="between 0.00 and 100.00"):
        StudentProfile(percentile=102.5).validate()

    # Non-numeric percentile
    with pytest.raises(TypeError, match="must be a numeric value"):
        StudentProfile(percentile="ninety").validate()

    # Empty seat type
    with pytest.raises(ValueError, match="Seat type must be a non-empty string"):
        StudentProfile(percentile=90.0, seat_type="").validate()

    # Invalid Cutoff stats: min > max
    invalid_cutoff = CutoffStats(
        college_id=1, college_name="Bad College", college_slug="bad",
        district="Pune", city="Pune", region="Pune",
        branch_id=1, branch_name="CSE", branch_category="CS",
        seat_type="GOPENS", score_type="MHT-CET",
        min_cutoff=95.0, mean_cutoff=90.0, max_cutoff=85.0, # min > max!
        range_cutoff=10.0, count=5
    )
    with pytest.raises(ValueError, match="min .* cannot exceed max"):
        invalid_cutoff.validate()

    # Invalid count < 1
    invalid_count = CutoffStats(
        college_id=1, college_name="Bad College", college_slug="bad",
        district="Pune", city="Pune", region="Pune",
        branch_id=1, branch_name="CSE", branch_category="CS",
        seat_type="GOPENS", score_type="MHT-CET",
        min_cutoff=85.0, mean_cutoff=90.0, max_cutoff=95.0,
        range_cutoff=10.0, count=0 # count < 1!
    )
    with pytest.raises(ValueError, match="must be >= 1"):
        invalid_count.validate()

# 6. Different Seat Types Filtering Test
def test_different_seat_types(engine, sample_cutoffs):
    # Test TFWS student
    student_tfws = StudentProfile(percentile=75.0, seat_type="TFWS")
    results_tfws = engine.evaluate_all(student_tfws, sample_cutoffs)
    assert len(results_tfws) == 1
    assert results_tfws[0].seat_type == "TFWS"
    assert results_tfws[0].recommendation_category == RecommendationCategory.SAFE

    # Test EWS student
    student_ews = StudentProfile(percentile=75.0, seat_type="EWS")
    results_ews = engine.evaluate_all(student_ews, sample_cutoffs)
    assert len(results_ews) == 1
    assert results_ews[0].seat_type == "EWS"
    assert results_ews[0].recommendation_category == RecommendationCategory.SAFE

# 7. Different Branches Filtering Test
def test_different_branches(engine, sample_cutoffs):
    student = StudentProfile(
        percentile=92.0,
        seat_type="GOPENS",
        preferred_branches=["Mechanical Engineering"]
    )
    results = engine.evaluate_all(student, sample_cutoffs)
    assert len(results) == 1
    assert results[0].branch_name == "Mechanical Engineering"
    # Mechanical min is 86.50, student is 92.0 -> SAFE
    assert results[0].recommendation_category == RecommendationCategory.SAFE

# 8. Configurable Thresholds Test
def test_configurable_thresholds():
    strict_config = RecommendationConfig(
        safe_min_gap=5.0,   # Stricter safe threshold
        reach_max_gap=2.0   # Tighter reach window
    )
    strict_engine = RecommendationEngine(config=strict_config)

    cutoff = CutoffStats(
        college_id=1, college_name="Col", college_slug="col",
        district="Pune", city="Pune", region="Pune",
        branch_id=1, branch_name="CSE", branch_category="CS",
        seat_type="GOPENS", score_type="MHT-CET",
        min_cutoff=90.0, mean_cutoff=96.0, max_cutoff=99.0,
        range_cutoff=9.0, count=20
    )

    # Candidate with 93.5 (gap = +3.5)
    # Under default config (safe_min_gap = 3.0): SAFE
    default_res = RecommendationEngine().evaluate_single(StudentProfile(percentile=93.5), cutoff)
    assert default_res.recommendation_category == RecommendationCategory.SAFE

    # Under strict config (safe_min_gap = 5.0): MODERATE
    strict_res = strict_engine.evaluate_single(StudentProfile(percentile=93.5), cutoff)
    assert strict_res.recommendation_category == RecommendationCategory.MODERATE

# 9. Disclaimer and Non-Guarantee Verification
def test_no_admission_guarantee_language(engine, sample_cutoffs):
    student = StudentProfile(percentile=100.0, seat_type="GOPENS")
    results = engine.evaluate_all(student, sample_cutoffs)

    forbidden_phrases = [
        "definitely get",
        "guaranteed admission",
        "100% chance of admission",
        "you will get",
        "admission is assured"
    ]

    for r in results:
        for phrase in forbidden_phrases:
            assert phrase not in r.explanation.lower()
        assert r.disclaimer == DISCLAIMER_TEXT
        assert r.recommendation_score <= 99.0  # Must never be 100.0
