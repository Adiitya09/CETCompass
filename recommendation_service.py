"""
Root export of recommendation_service for easy access and standalone testing.
"""
from backend.app.services.recommendation_service import (
    RecommendationCategory,
    RecommendationConfig,
    StudentProfile,
    CutoffStats,
    RecommendationResult,
    RecommendationEngine,
    DEFAULT_CONFIG,
    DISCLAIMER_TEXT
)

__all__ = [
    "RecommendationCategory",
    "RecommendationConfig",
    "StudentProfile",
    "CutoffStats",
    "RecommendationResult",
    "RecommendationEngine",
    "DEFAULT_CONFIG",
    "DISCLAIMER_TEXT"
]
