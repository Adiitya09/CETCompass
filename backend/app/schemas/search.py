from typing import List, Optional
from pydantic import BaseModel, ConfigDict

class SearchCollegeItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    slug: str
    code: Optional[str] = None
    city: str
    district: str
    region: str
    status: str

class SearchBranchItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    slug: str
    category: str

class SearchDistrictItem(BaseModel):
    district: str
    region: str
    colleges_count: int

class SearchResponse(BaseModel):
    query: str
    total_matches: int
    colleges: List[SearchCollegeItem]
    branches: List[SearchBranchItem]
    locations: List[SearchDistrictItem]
