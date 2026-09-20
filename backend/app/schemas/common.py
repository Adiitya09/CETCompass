from typing import List, Optional, Any, Generic, TypeVar
from pydantic import BaseModel, Field

T = TypeVar("T")

class PaginationParams(BaseModel):
    page: int = Field(default=1, ge=1, description="Page number starting from 1")
    page_size: int = Field(default=20, ge=1, le=100, description="Items per page (max 100)")

class PaginatedResponse(BaseModel, Generic[T]):
    total: int
    page: int
    page_size: int
    total_pages: int
    data: List[T]

class StandardSuccessResponse(BaseModel):
    success: bool = True
    message: str
    data: Optional[Any] = None

class StandardErrorResponse(BaseModel):
    status: str = "error"
    code: str
    message: str
    detail: Optional[Any] = None
