import math
from typing import List, Dict, Any, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_

from backend.app.models.college import College
from backend.app.models.branch import Branch
from backend.app.models.seat_type import SeatType
from backend.app.models.cutoff import CutoffRecord
from backend.app.schemas.predict import PredictRequest, PredictResponse, PredictSummary, PredictionItem

DISCLAIMER_TEXT = (
    "Recommendations and classifications are estimated strictly using historical MHT-CET / JEE CAP round "
    "cutoff statistics. Actual cutoffs vary annually based on applicant counts, seat matrices, and exam normalization. "
    "This tool provides educational guidance, not an official admission guarantee."
)

def calculate_classification_and_score(
    percentile: float,
    min_cutoff: float,
    mean_cutoff: float,
    max_cutoff: float,
    count: int,
    range_cutoff: float,
    reach_buffer: float = 4.0
) -> Tuple[str, float, str]:
    """
    Computes (classification, recommendation_score, admission_chance_label)
    based on historical cutoff statistics.
    Never invents or fabricates data.
    """
    delta = round(percentile - min_cutoff, 4)

    # 1. Classification
    if delta >= 3.0 or percentile >= mean_cutoff:
        classification = "Safe"
        chance_label = "Very High (Likely Admitted)" if delta >= 6.0 else "High (Favorable)"
    elif delta >= 0.0:
        classification = "Moderate"
        chance_label = "Moderate (Competitive Target)"
    elif delta >= -reach_buffer:
        classification = "Reach"
        chance_label = "Ambitious (Reach / Subsequent Rounds)"
    else:
        classification = "Difficult"
        chance_label = "Low Chance"

    # 2. Recommendation Score (0 - 100)
    if delta >= 10.0:
        base_score = 95.0 + min(4.0, (delta - 10.0) * 0.2)
    elif delta >= 0.0:
        # Scale between 70 and 95
        base_score = 70.0 + (delta / 10.0) * 25.0
    elif delta >= -reach_buffer:
        # Scale between 40 and 70
        norm = (delta + reach_buffer) / reach_buffer  # 0 to 1
        base_score = 40.0 + norm * 30.0
    else:
        # Below reach buffer
        base_score = max(10.0, 40.0 + delta * 3.0)

    # Cohort mean adjustment: bonus if student is above cohort mean
    if percentile >= mean_cutoff:
        base_score += min(5.0, (percentile - mean_cutoff) * 0.5)
    elif percentile < mean_cutoff and delta >= 0:
        base_score -= min(3.0, (mean_cutoff - percentile) * 0.3)

    # Cohort size stability confidence
    if count >= 10:
        base_score += 2.0
    elif count <= 2:
        base_score -= 2.0

    score = round(max(5.0, min(99.0, base_score)), 1)

    return classification, score, chance_label

def predict_colleges(db: Session, req: PredictRequest) -> PredictResponse:
    # 1. Find the seat type object
    seat_type = db.query(SeatType).filter(SeatType.code == req.seat_type).first()
    if not seat_type:
        # Fallback to GOPENS if specified code not found
        seat_type = db.query(SeatType).filter(SeatType.code == "GOPENS").first()
    
    seat_type_id = seat_type.id if seat_type else None

    # 2. Build Base Query
    query = (
        db.query(CutoffRecord)
        .join(College, CutoffRecord.college_id == College.id)
        .join(Branch, CutoffRecord.branch_id == Branch.id)
        .join(SeatType, CutoffRecord.seat_type_id == SeatType.id)
        .filter(CutoffRecord.score_type == req.score_type)
    )

    if seat_type_id:
        query = query.filter(CutoffRecord.seat_type_id == seat_type_id)

    # Filter out cutoffs that are far outside reach buffer
    cutoff_ceiling = req.percentile + req.reach_buffer
    query = query.filter(CutoffRecord.min_cutoff <= cutoff_ceiling)

    # 3. Filter by preferred branches
    if req.preferred_branches:
        query = query.filter(Branch.name.in_(req.preferred_branches))
    elif req.preferred_categories:
        query = query.filter(Branch.category.in_(req.preferred_categories))

    # 4. Filter by locations
    if req.preferred_districts:
        query = query.filter(College.district.in_(req.preferred_districts))
    elif req.preferred_regions:
        query = query.filter(College.region.in_(req.preferred_regions))

    records = query.all()

    # 5. Process, Classify, and Score
    items: List[PredictionItem] = []
    safe_count = 0
    moderate_count = 0
    reach_count = 0

    target_class = (req.classification or "all").lower()

    for r in records:
        classification, score, chance_label = calculate_classification_and_score(
            percentile=req.percentile,
            min_cutoff=r.min_cutoff,
            mean_cutoff=r.mean_cutoff,
            max_cutoff=r.max_cutoff,
            count=r.count,
            range_cutoff=r.range_cutoff,
            reach_buffer=req.reach_buffer
        )

        if classification == "Safe":
            safe_count += 1
        elif classification == "Moderate":
            moderate_count += 1
        elif classification == "Reach":
            reach_count += 1

        # Apply classification filter
        if target_class != "all" and classification.lower() != target_class:
            continue

        delta_val = round(req.percentile - r.min_cutoff, 4)

        # Generate truthful, explainable rationale based strictly on historical cutoff data
        if req.percentile >= r.max_cutoff:
            explanation_text = f"Your percentile ({req.percentile:.2f}) is above the historical maximum cutoff ({r.max_cutoff:.2f}%) for this combination."
        elif req.percentile >= r.min_cutoff:
            explanation_text = f"Your percentile ({req.percentile:.2f}) is within the historical cutoff range ({r.min_cutoff:.2f}% – {r.max_cutoff:.2f}%)."
        elif classification == "Reach":
            gap_mag = abs(delta_val)
            explanation_text = f"Your percentile ({req.percentile:.2f}) is within {gap_mag:.2f}% of the historical cutoff barrier ({r.min_cutoff:.2f}%). Recommended for subsequent CAP rounds."
        else:
            explanation_text = f"Your percentile ({req.percentile:.2f}) is below the historical minimum cutoff ({r.min_cutoff:.2f}%)."

        item = PredictionItem(
            college=r.college.name,
            branch=r.branch.name,
            seat_type=r.seat_type.code,
            student_percentile=req.percentile,
            historical_min=r.min_cutoff,
            historical_max=r.max_cutoff,
            historical_mean=r.mean_cutoff,
            cutoff_gap=delta_val,
            category=classification.upper(),
            explanation=explanation_text,
            college_id=r.college.id,
            college_name=r.college.name,
            college_slug=r.college.slug,
            district=r.college.district,
            city=r.college.city,
            region=r.college.region,
            branch_id=r.branch.id,
            branch_name=r.branch.name,
            branch_category=r.branch.category,
            seat_type_code=r.seat_type.code,
            seat_type_description=r.seat_type.description,
            score_type=r.score_type,
            min_cutoff=r.min_cutoff,
            mean_cutoff=r.mean_cutoff,
            max_cutoff=r.max_cutoff,
            count=r.count,
            range_cutoff=r.range_cutoff,
            delta=delta_val,
            classification=classification,
            recommendation_score=score,
            admission_chance_label=chance_label
        )
        items.append(item)

    # 6. Sorting
    if req.sort_by == "recommendation_score":
        items.sort(key=lambda x: (x.recommendation_score, x.delta), reverse=True)
    elif req.sort_by == "min_cutoff_desc":
        items.sort(key=lambda x: x.min_cutoff, reverse=True)
    elif req.sort_by == "min_cutoff_asc":
        items.sort(key=lambda x: x.min_cutoff)
    elif req.sort_by == "college_name":
        items.sort(key=lambda x: x.college_name)

    total_matches = len(items)
    total_pages = math.ceil(total_matches / req.page_size) if total_matches > 0 else 1

    # 7. Pagination
    start = (req.page - 1) * req.page_size
    end = start + req.page_size
    paged_items = items[start:end]

    summary = PredictSummary(
        total_matches=total_matches,
        safe_count=safe_count,
        moderate_count=moderate_count,
        reach_count=reach_count,
        user_percentile=req.percentile,
        score_type=req.score_type,
        seat_type=req.seat_type
    )

    return PredictResponse(
        summary=summary,
        disclaimer=DISCLAIMER_TEXT,
        results=paged_items,
        page=req.page,
        page_size=req.page_size,
        total_pages=total_pages
    )
