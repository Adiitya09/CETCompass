from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, ConfigDict

class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    email: str
    full_name: Optional[str] = None
    role: str
    created_at: datetime

class SavedCollegeCreate(BaseModel):
    college_id: int
    branch_id: Optional[int] = None
    notes: Optional[str] = None

class SavedCollegeResponse(BaseModel):
    id: int
    user_id: str
    college_id: int
    college_name: str
    college_slug: str
    district: str
    branch_id: Optional[int] = None
    branch_name: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime

class HistoryCreate(BaseModel):
    percentile: float
    score_type: str
    seat_type: str
    preferred_branches: Optional[List[str]] = None
    preferred_locations: Optional[List[str]] = None
    total_matches: int
    safe_count: int
    moderate_count: int
    reach_count: int
    recommendations: Optional[List[Dict[str, Any]]] = None

class HistoryResponse(BaseModel):
    id: int
    percentile: float
    score_type: str
    seat_type: str
    preferred_branches: Optional[List[str]] = None
    preferred_locations: Optional[List[str]] = None
    total_matches: int
    safe_count: int
    moderate_count: int
    reach_count: int
    recommendations: Optional[List[Dict[str, Any]]] = None
    created_at: datetime
