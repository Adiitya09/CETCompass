from typing import Dict, Any
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.app.api.deps import get_db
from backend.app.api import (
    colleges,
    branches,
    seat_types,
    search,
    predict,
    compare,
    user,
    admin
)
from backend.app.services.metadata_service import MetadataService

api_router = APIRouter()

# Core Domain Routers
api_router.include_router(colleges.router)
api_router.include_router(branches.router)
api_router.include_router(seat_types.router)
api_router.include_router(search.router)
api_router.include_router(predict.router)
api_router.include_router(compare.router)
api_router.include_router(user.router)
api_router.include_router(admin.router)

# Metadata / Aggregation endpoints
@api_router.get(
    "/stats",
    tags=["Metadata & Stats"],
    summary="Platform Statistics",
    description="High-level aggregated statistics of the platform."
)
def get_system_stats(db: Session = Depends(get_db)):
    return MetadataService.get_system_stats(db=db)

@api_router.get(
    "/locations",
    tags=["Metadata & Stats"],
    summary="List Locations",
    description="Maharashtra districts and administrative regions with college distribution counts."
)
def get_locations(db: Session = Depends(get_db)):
    return MetadataService.get_locations(db=db)
