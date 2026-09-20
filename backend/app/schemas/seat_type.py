from pydantic import BaseModel, ConfigDict

class SeatTypeResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    code: str
    category: str
    quota_scope: str
    gender: str
    description: str
