"""
College Recommendation Engine Service
======================================
Independent, deterministic recommendation engine for Maharashtra Engineering Admissions.
Uses verified historical cutoff statistics (min, mean, max, count, range).
Does NOT claim to guarantee admission.
"""

from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional, Union
from enum import Enum

class RecommendationCategory(str, Enum):
    SAFE = "SAFE"
    MODERATE = "MODERATE"
    REACH = "REACH"
    UNLIKELY = "UNLIKELY"

@dataclass
class RecommendationConfig:
    """
    Configurable thresholds and weights for the recommendation algorithm.
    Stored in configuration rather than hardcoded throughout the code.
    """
    # Safe category thresholds:
    # A candidate is SAFE if: gap >= safe_min_gap OR candidate_percentile >= mean_cutoff
    safe_min_gap: float = 3.0
    
    # Moderate category thresholds:
    # A candidate is MODERATE if: gap >= moderate_min_gap and below safe threshold
    moderate_min_gap: float = 0.0
    
    # Reach category buffer:
    # A candidate is REACH if: gap >= -reach_max_gap and below moderate threshold
    reach_max_gap: float = 4.0
    
    # Recommendation score bounds
    min_score: float = 5.0
    max_score: float = 99.0

    # Minimum admitted count considered stable
    high_confidence_count: int = 15
    medium_confidence_count: int = 5

DEFAULT_CONFIG = RecommendationConfig()

DISCLAIMER_TEXT = (
    "Recommendations are based on historical CAP round cutoff statistics and do not guarantee admission. "
    "Actual cutoffs fluctuate annually based on exam difficulty, applicant registrations, and seat matrix revisions."
)

@dataclass
class StudentProfile:
    """Inputs representing the student's credentials and preferences."""
    percentile: float
    seat_type: str = "GOPENS"
    score_type: str = "MHT-CET"
    preferred_branches: Optional[List[str]] = None
    preferred_locations: Optional[List[str]] = None
    preferred_categories: Optional[List[str]] = None

    def validate(self):
        if self.percentile is None:
            raise ValueError("Student percentile is required.")
        if not isinstance(self.percentile, (int, float)):
            raise TypeError("Student percentile must be a numeric value.")
        if self.percentile < 0.0 or self.percentile > 100.0:
            raise ValueError(f"Percentile must be between 0.00 and 100.00, got {self.percentile}.")
        if not self.seat_type or not isinstance(self.seat_type, str):
            raise ValueError("Seat type must be a non-empty string.")
        if not self.score_type or not isinstance(self.score_type, str):
            raise ValueError("Score type must be a non-empty string.")

@dataclass
class CutoffStats:
    """Historical cutoff statistics for a college + branch + seat type combination."""
    college_id: int
    college_name: str
    college_slug: str
    district: str
    city: str
    region: str
    branch_id: int
    branch_name: str
    branch_category: str
    seat_type: str
    score_type: str
    min_cutoff: float
    mean_cutoff: float
    max_cutoff: float
    range_cutoff: float
    count: int

    def validate(self):
        if self.min_cutoff > self.max_cutoff:
            raise ValueError(f"Invalid cutoffs: min ({self.min_cutoff}) cannot exceed max ({self.max_cutoff}).")
        if self.count < 1:
            raise ValueError(f"Invalid count: admitted count ({self.count}) must be >= 1.")

@dataclass
class RecommendationResult:
    """Output recommendation for a single college + branch combination."""
    college_id: int
    college_name: str
    college_slug: str
    district: str
    city: str
    region: str
    branch_id: int
    branch_name: str
    branch_category: str
    seat_type: str
    score_type: str
    
    # Historical cutoff information
    min_cutoff: float
    mean_cutoff: float
    max_cutoff: float
    range_cutoff: float
    count: int
    
    # Student specific metrics
    student_percentile: float
    cutoff_gap: float
    recommendation_category: RecommendationCategory
    recommendation_score: float
    explanation: str
    disclaimer: str = DISCLAIMER_TEXT

    def to_dict(self) -> Dict[str, Any]:
        return {
            "college": {
                "id": self.college_id,
                "name": self.college_name,
                "slug": self.college_slug,
                "district": self.district,
                "city": self.city,
                "region": self.region
            },
            "branch": {
                "id": self.branch_id,
                "name": self.branch_name,
                "category": self.branch_category
            },
            "seat_type": self.seat_type,
            "score_type": self.score_type,
            "historical_cutoff": {
                "min_cutoff": self.min_cutoff,
                "mean_cutoff": self.mean_cutoff,
                "max_cutoff": self.max_cutoff,
                "range_cutoff": self.range_cutoff,
                "count": self.count
            },
            "student_percentile": self.student_percentile,
            "cutoff_gap": round(self.cutoff_gap, 4),
            "recommendation_category": self.recommendation_category.value,
            "recommendation_score": round(self.recommendation_score, 1),
            "explanation": self.explanation,
            "disclaimer": self.disclaimer
        }

class RecommendationEngine:
    """
    Core independent recommendation algorithm.
    """
    def __init__(self, config: Optional[RecommendationConfig] = None):
        self.config = config or DEFAULT_CONFIG

    def classify(self, percentile: float, cutoff: CutoffStats) -> RecommendationCategory:
        """
        Determines the recommendation category based on configurable thresholds.
        """
        gap = percentile - cutoff.min_cutoff

        if gap >= self.config.safe_min_gap or percentile >= cutoff.mean_cutoff:
            return RecommendationCategory.SAFE
        elif gap >= self.config.moderate_min_gap:
            return RecommendationCategory.MODERATE
        elif gap >= -self.config.reach_max_gap:
            return RecommendationCategory.REACH
        else:
            return RecommendationCategory.UNLIKELY

    def calculate_score(self, percentile: float, cutoff: CutoffStats) -> float:
        """
        Calculates a transparent recommendation score from 5.0 to 99.0.
        Factors in margin gap, proximity to cohort mean, cohort stability, and cutoff range.
        Never outputs 100.0 (no guaranteed admission).
        """
        gap = percentile - cutoff.min_cutoff
        mean_gap = percentile - cutoff.mean_cutoff

        # 1. Margin Component (0 to 50 pts)
        if gap >= 10.0:
            margin_score = 50.0
        elif gap >= 0.0:
            # 35 to 50
            margin_score = 35.0 + (gap / 10.0) * 15.0
        elif gap >= -self.config.reach_max_gap:
            # 15 to 35
            norm = (gap + self.config.reach_max_gap) / self.config.reach_max_gap
            margin_score = 15.0 + norm * 20.0
        else:
            # Below reach
            margin_score = max(5.0, 15.0 + gap * 2.0)

        # 2. Mean Proximity Component (0 to 25 pts)
        if mean_gap >= 0.0:
            mean_score = 20.0 + min(5.0, mean_gap * 0.5)
        else:
            mean_score = max(5.0, 20.0 + mean_gap * 1.5)

        # 3. Cohort Sample Size Confidence (0 to 15 pts)
        if cutoff.count >= self.config.high_confidence_count:
            confidence_score = 15.0
        elif cutoff.count >= self.config.medium_confidence_count:
            confidence_score = 12.0
        elif cutoff.count >= 2:
            confidence_score = 10.0
        else:
            confidence_score = 7.0

        # 4. Range Cushion Component (0 to 10 pts)
        cushion_score = min(10.0, 5.0 + (cutoff.range_cutoff * 0.2))

        # Sum and clamp
        total = margin_score + mean_score + confidence_score + cushion_score
        clamped = max(self.config.min_score, min(self.config.max_score, total))
        return round(clamped, 1)

    def generate_explanation(self, percentile: float, cutoff: CutoffStats, category: RecommendationCategory) -> str:
        """
        Generates clear, educational, transparent explanation without claiming admission guarantees.
        """
        gap = percentile - cutoff.min_cutoff

        if category == RecommendationCategory.SAFE:
            if percentile >= cutoff.mean_cutoff:
                return (
                    f"Your percentile of {percentile:.2f} is {gap:+.2f} points above the historical minimum cutoff ({cutoff.min_cutoff:.2f}) "
                    f"and exceeds the admitted cohort average ({cutoff.mean_cutoff:.2f})."
                )
            else:
                return (
                    f"Your percentile of {percentile:.2f} is {gap:+.2f} points above the historical minimum cutoff ({cutoff.min_cutoff:.2f}), "
                    f"providing a favorable safety margin."
                )
        elif category == RecommendationCategory.MODERATE:
            return (
                f"Your percentile of {percentile:.2f} is close to the historical minimum cutoff ({cutoff.min_cutoff:.2f}) with a {gap:+.2f} point margin, "
                f"making this a realistic, competitive target."
            )
        elif category == RecommendationCategory.REACH:
            return (
                f"Your percentile of {percentile:.2f} is {abs(gap):.2f} points below the historical minimum cutoff ({cutoff.min_cutoff:.2f}). "
                f"This represents an ambitious choice that may become viable in subsequent CAP rounds."
            )
        else:
            return (
                f"Your percentile of {percentile:.2f} is {abs(gap):.2f} points below the historical minimum cutoff ({cutoff.min_cutoff:.2f}), "
                f"indicating low probability based on prior year statistics."
            )

    def evaluate_single(self, student: StudentProfile, cutoff: CutoffStats) -> RecommendationResult:
        """Evaluates a single cutoff record for a student."""
        category = self.classify(student.percentile, cutoff)
        score = self.calculate_score(student.percentile, cutoff)
        explanation = self.generate_explanation(student.percentile, cutoff, category)

        return RecommendationResult(
            college_id=cutoff.college_id,
            college_name=cutoff.college_name,
            college_slug=cutoff.college_slug,
            district=cutoff.district,
            city=cutoff.city,
            region=cutoff.region,
            branch_id=cutoff.branch_id,
            branch_name=cutoff.branch_name,
            branch_category=cutoff.branch_category,
            seat_type=cutoff.seat_type,
            score_type=cutoff.score_type,
            min_cutoff=cutoff.min_cutoff,
            mean_cutoff=cutoff.mean_cutoff,
            max_cutoff=cutoff.max_cutoff,
            range_cutoff=cutoff.range_cutoff,
            count=cutoff.count,
            student_percentile=student.percentile,
            cutoff_gap=student.percentile - cutoff.min_cutoff,
            recommendation_category=category,
            recommendation_score=score,
            explanation=explanation,
            disclaimer=DISCLAIMER_TEXT
        )

    def evaluate_all(
        self,
        student: StudentProfile,
        cutoffs: List[CutoffStats],
        include_unlikely: bool = False
    ) -> List[RecommendationResult]:
        """
        Evaluates and ranks all candidate cutoff records for a student.
        Filters by student preferences (branches, locations, seat type).
        """
        student.validate()

        results: List[RecommendationResult] = []

        for c in cutoffs:
            c.validate()

            # 1. Match score type
            if c.score_type != student.score_type:
                continue

            # 2. Match seat type
            if c.seat_type != student.seat_type:
                continue

            # 3. Match preferred branches if specified
            if student.preferred_branches and c.branch_name not in student.preferred_branches:
                continue

            # 4. Match preferred categories if specified
            if student.preferred_categories and c.branch_category not in student.preferred_categories:
                continue

            # 5. Match preferred locations if specified
            if student.preferred_locations and (c.district not in student.preferred_locations and c.region not in student.preferred_locations):
                continue

            result = self.evaluate_single(student, c)

            if not include_unlikely and result.recommendation_category == RecommendationCategory.UNLIKELY:
                continue

            results.append(result)

        # Rank by recommendation score descending, then by cutoff_gap descending
        results.sort(key=lambda r: (r.recommendation_score, r.cutoff_gap), reverse=True)
        return results
