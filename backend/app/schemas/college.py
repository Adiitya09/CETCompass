from typing import List, Optional
from pydantic import BaseModel, ConfigDict

class CutoffSummary(BaseModel):
    id: int
    branch_id: int
    branch_name: str
    branch_category: str
    seat_type_id: int
    seat_type_code: str
    seat_type_description: str
    score_type: str
    min_cutoff: float
    mean_cutoff: float
    max_cutoff: float
    count: int
    range_cutoff: float

class CollegeBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    slug: str
    code: Optional[str] = None
    district: str
    city: str
    region: str
    status: str

class CollegeListItem(CollegeBase):
    branches_count: int
    min_overall_cutoff: Optional[float] = None
    max_overall_cutoff: Optional[float] = None

class CollegeDetail(CollegeBase):
    cutoffs: List[CutoffSummary]
    available_branches: List[str]
    available_seat_types: List[str]

class CollegeCompareRequest(BaseModel):
    college_ids: List[int]
    seat_type: Optional[str] = "GOPENS"
    score_type: Optional[str] = "MHT-CET"
