from typing import List, Optional
from pydantic import BaseModel, Field

class PredictRequest(BaseModel):
    percentile: float = Field(..., ge=0.0, le=100.0, description="MHT-CET or JEE(Main) Percentile score")
    score_type: str = Field(default="MHT-CET", min_length=1, description="MHT-CET or JEE(Main)")
    seat_type: str = Field(default="GOPENS", min_length=1, description="Seat category code, e.g. GOPENS, LOPENH, TFWS, EWS, AI")
    preferred_branches: Optional[List[str]] = Field(default=None, description="Filter by branch names")
    preferred_categories: Optional[List[str]] = Field(default=None, description="Filter by branch categories")
    preferred_districts: Optional[List[str]] = Field(default=None, description="Filter by districts")
    preferred_regions: Optional[List[str]] = Field(default=None, description="Filter by regions")
    classification: Optional[str] = Field(default="all", description="all, safe, moderate, reach")
    reach_buffer: float = Field(default=4.0, ge=0.0, le=15.0, description="Percentile reach buffer")
    sort_by: str = Field(default="recommendation_score", description="recommendation_score, min_cutoff_desc, min_cutoff_asc, college_name")
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=20, ge=1, le=100)

class PredictionItem(BaseModel):
    # Core Requested Fields
    college: str = Field(..., description="College institution name")
    branch: str = Field(..., description="Engineering branch/discipline name")
    seat_type: str = Field(..., description="Seat allotment quota code")
    student_percentile: float = Field(..., description="Candidate entrance percentile")
    historical_min: float = Field(..., description="Minimum historical CAP round cutoff")
    historical_max: float = Field(..., description="Maximum historical CAP round cutoff")
    historical_mean: float = Field(..., description="Mean admitted candidate score in historical cohort")
    cutoff_gap: float = Field(..., description="Score margin (student_percentile - historical_min)")
    recommendation_score: float = Field(..., description="Empirical fit score between 0 and 100")
    category: str = Field(..., description="SAFE, MODERATE, or REACH classification")
    explanation: str = Field(..., description="Plain-English explanation of why this college was recommended")

    # Extended Identifiers & Relational Fields
    college_id: int
    college_name: str
    college_slug: str
    district: str
    city: str
    region: str
    branch_id: int
    branch_name: str
    branch_category: str
    seat_type_code: str
    seat_type_description: str
    score_type: str
    min_cutoff: float
    mean_cutoff: float
    max_cutoff: float
    count: int
    range_cutoff: float
    delta: float
    classification: str  # Safe, Moderate, Reach
    admission_chance_label: str  # Very High, High, Moderate / Competitive, Ambitious / Reach

class PredictSummary(BaseModel):
    total_matches: int
    safe_count: int
    moderate_count: int
    reach_count: int
    user_percentile: float
    score_type: str
    seat_type: str

class PredictResponse(BaseModel):
    summary: PredictSummary
    disclaimer: str
    results: List[PredictionItem]
    page: int
    page_size: int
    total_pages: int
