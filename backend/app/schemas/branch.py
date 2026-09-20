from typing import List
from pydantic import BaseModel, ConfigDict

class BranchResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    slug: str
    category: str
    colleges_count: int

class BranchCategoryGroup(BaseModel):
    category: str
    branches: List[BranchResponse]
