from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func

from backend.app.models.college import College
from backend.app.models.branch import Branch
from backend.app.models.seat_type import SeatType
from backend.app.models.cutoff import CutoffRecord
from backend.app.models.metadata import DatasetMetadata

class MetadataService:
    @staticmethod
    def get_branches(
        db: Session,
        category: Optional[str] = None,
        search: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Retrieves all canonical branches with offerings count and category grouping.
        """
        query = db.query(Branch)
        if category and category.strip():
            query = query.filter(Branch.category.ilike(category.strip()))
        if search and search.strip():
            query = query.filter(Branch.name.ilike(f"%{search.strip()}%"))

        branches = query.order_by(Branch.category, Branch.name).all()

        # Batch query offering counts
        counts_query = (
            db.query(
                CutoffRecord.branch_id,
                func.count(func.distinct(CutoffRecord.college_id)).label("colleges_count")
            )
            .group_by(CutoffRecord.branch_id)
            .all()
        )
        counts_map = {b_id: count for b_id, count in counts_query}

        grouped: Dict[str, List[Dict[str, Any]]] = {}
        all_branches = []

        for b in branches:
            colleges_count = counts_map.get(b.id, 0)
            item = {
                "id": b.id,
                "name": b.name,
                "slug": b.slug,
                "category": b.category,
                "colleges_count": colleges_count
            }
            all_branches.append(item)
            cat = b.category
            if cat not in grouped:
                grouped[cat] = []
            grouped[cat].append(item)

        return {
            "total": len(branches),
            "categories": sorted(list(grouped.keys())),
            "grouped": grouped,
            "all_branches": all_branches
        }

    @staticmethod
    def get_seat_types(
        db: Session,
        category: Optional[str] = None,
        search: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Retrieves all 77 seat categories with descriptions and quota scopes.
        """
        query = db.query(SeatType)
        if category and category.strip():
            query = query.filter(SeatType.category.ilike(category.strip()))
        if search and search.strip():
            pat = f"%{search.strip()}%"
            query = query.filter(
                (SeatType.code.ilike(pat)) | (SeatType.description.ilike(pat))
            )

        seat_types = query.order_by(SeatType.category, SeatType.code).all()

        grouped: Dict[str, List[Dict[str, Any]]] = {}
        all_seat_types = []

        for s in seat_types:
            item = {
                "id": s.id,
                "code": s.code,
                "category": s.category,
                "quota_scope": s.quota_scope,
                "gender": s.gender,
                "description": s.description
            }
            all_seat_types.append(item)
            cat = s.category
            if cat not in grouped:
                grouped[cat] = []
            grouped[cat].append(item)

        return {
            "total": len(seat_types),
            "categories": sorted(list(grouped.keys())),
            "grouped": grouped,
            "all_seat_types": all_seat_types
        }

    @staticmethod
    def get_locations(db: Session) -> Dict[str, Any]:
        """
        Retrieves all Maharashtra districts and regions with college distribution counts.
        """
        district_counts = (
            db.query(College.district, College.region, func.count(College.id))
            .group_by(College.district, College.region)
            .order_by(func.count(College.id).desc())
            .all()
        )

        districts = []
        regions_map: Dict[str, List[str]] = {}

        for dist, reg, count in district_counts:
            districts.append({
                "district": dist,
                "region": reg,
                "colleges_count": count
            })
            if reg not in regions_map:
                regions_map[reg] = []
            regions_map[reg].append(dist)

        return {
            "total_districts": len(districts),
            "districts": districts,
            "regions": regions_map
        }

    @staticmethod
    def get_system_stats(db: Session) -> Dict[str, Any]:
        """
        Returns high-level statistics across all entities.
        """
        colleges_count = db.query(College).count()
        branches_count = db.query(Branch).count()
        seat_types_count = db.query(SeatType).count()
        cutoffs_count = db.query(CutoffRecord).count()
        districts_count = db.query(func.count(func.distinct(College.district))).scalar() or 0
        latest_meta = db.query(DatasetMetadata).order_by(DatasetMetadata.id.desc()).first()

        return {
            "colleges_count": colleges_count,
            "branches_count": branches_count,
            "seat_types_count": seat_types_count,
            "cutoff_records_count": cutoffs_count,
            "districts_count": districts_count,
            "last_ingested_at": latest_meta.ingested_at if latest_meta else None,
            "dataset_filename": latest_meta.filename if latest_meta else "college_data_cleaned.xlsx"
        }
