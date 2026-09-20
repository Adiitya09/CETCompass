import math
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import or_, func, desc, asc

from backend.app.models.college import College
from backend.app.models.branch import Branch
from backend.app.models.seat_type import SeatType
from backend.app.models.cutoff import CutoffRecord
from backend.app.schemas.college import (
    CollegeDetail,
    CutoffSummary,
    CollegeCompareRequest
)
from backend.app.core.errors import NotFoundError, ValidationError

class CollegeService:
    @staticmethod
    def list_colleges(
        db: Session,
        q: Optional[str] = None,
        district: Optional[str] = None,
        region: Optional[str] = None,
        branch: Optional[str] = None,
        seat_type: Optional[str] = None,
        status: Optional[str] = None,
        sort_by: str = "name",
        sort_order: str = "asc",
        page: int = 1,
        page_size: int = 20
    ) -> Dict[str, Any]:
        """
        Retrieves paginated, filtered, and sorted colleges.
        """
        query = db.query(College)

        # 1. Text Search Filter
        if q and q.strip():
            pattern = f"%{q.strip()}%"
            query = query.filter(
                or_(
                    College.name.ilike(pattern),
                    College.city.ilike(pattern),
                    College.district.ilike(pattern),
                    College.code.ilike(pattern)
                )
            )

        # 2. Categorical Filters
        if district and district.strip():
            query = query.filter(College.district.ilike(district.strip()))

        if region and region.strip():
            query = query.filter(College.region.ilike(region.strip()))

        if status and status.strip():
            query = query.filter(College.status.ilike(status.strip()))

        if branch and branch.strip() and seat_type and seat_type.strip():
            query = query.join(CutoffRecord, CutoffRecord.college_id == College.id)\
                         .join(Branch, CutoffRecord.branch_id == Branch.id)\
                         .join(SeatType, CutoffRecord.seat_type_id == SeatType.id)\
                         .filter(Branch.name.ilike(branch.strip()))\
                         .filter(or_(SeatType.code.ilike(seat_type.strip()), SeatType.category.ilike(seat_type.strip())))\
                         .distinct()
        elif branch and branch.strip():
            query = query.join(CutoffRecord, CutoffRecord.college_id == College.id)\
                         .join(Branch, CutoffRecord.branch_id == Branch.id)\
                         .filter(Branch.name.ilike(branch.strip()))\
                         .distinct()
        elif seat_type and seat_type.strip():
            query = query.join(CutoffRecord, CutoffRecord.college_id == College.id)\
                         .join(SeatType, CutoffRecord.seat_type_id == SeatType.id)\
                         .filter(or_(SeatType.code.ilike(seat_type.strip()), SeatType.category.ilike(seat_type.strip())))\
                         .distinct()

        # 3. Total Count
        total = query.count()
        total_pages = math.ceil(total / page_size) if total > 0 else 1

        # 4. Sorting
        order_fn = desc if sort_order.lower() == "desc" else asc
        if sort_by == "code":
            query = query.order_by(order_fn(College.code))
        elif sort_by == "city":
            query = query.order_by(order_fn(College.city))
        elif sort_by == "district":
            query = query.order_by(order_fn(College.district))
        else:
            query = query.order_by(order_fn(College.name))

        # 5. Pagination
        colleges = query.offset((page - 1) * page_size).limit(page_size).all()

        # 6. Aggregate Cutoffs per College
        college_ids = [c.id for c in colleges]
        stats_map = {}
        if college_ids:
            stats_rows = (
                db.query(
                    CutoffRecord.college_id,
                    func.count(func.distinct(CutoffRecord.branch_id)).label("branches_count"),
                    func.min(CutoffRecord.min_cutoff).label("min_cutoff"),
                    func.max(CutoffRecord.max_cutoff).label("max_cutoff")
                )
                .filter(CutoffRecord.college_id.in_(college_ids))
                .group_by(CutoffRecord.college_id)
                .all()
            )
            for row in stats_rows:
                stats_map[row.college_id] = {
                    "branches_count": row.branches_count,
                    "min_cutoff": round(row.min_cutoff, 2) if row.min_cutoff is not None else None,
                    "max_cutoff": round(row.max_cutoff, 2) if row.max_cutoff is not None else None
                }

        items = []
        for c in colleges:
            c_stats = stats_map.get(c.id, {"branches_count": 0, "min_cutoff": None, "max_cutoff": None})
            items.append({
                "id": c.id,
                "name": c.name,
                "slug": c.slug,
                "code": c.code,
                "district": c.district,
                "city": c.city,
                "region": c.region,
                "status": c.status,
                "branches_count": c_stats["branches_count"],
                "min_overall_cutoff": c_stats["min_cutoff"],
                "max_overall_cutoff": c_stats["max_cutoff"]
            })

        return {
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": total_pages,
            "data": items
        }

    @staticmethod
    def get_college_by_id_or_slug(db: Session, id_or_slug: str) -> CollegeDetail:
        """
        Retrieves complete college profile including cutoffs and offered branches.
        """
        if id_or_slug.isdigit():
            college = db.query(College).filter(College.id == int(id_or_slug)).first()
        else:
            college = db.query(College).filter(College.slug == id_or_slug.strip()).first()

        if not college:
            raise NotFoundError(f"College with identifier '{id_or_slug}' not found.")

        cutoffs = (
            db.query(CutoffRecord)
            .join(Branch, CutoffRecord.branch_id == Branch.id)
            .join(SeatType, CutoffRecord.seat_type_id == SeatType.id)
            .filter(CutoffRecord.college_id == college.id)
            .order_by(Branch.name, CutoffRecord.min_cutoff.desc())
            .all()
        )

        cutoff_list = []
        branches_set = set()
        seat_types_set = set()

        for r in cutoffs:
            branches_set.add(r.branch.name)
            seat_types_set.add(r.seat_type.code)
            cutoff_list.append(CutoffSummary(
                id=r.id,
                branch_id=r.branch.id,
                branch_name=r.branch.name,
                branch_category=r.branch.category,
                seat_type_id=r.seat_type.id,
                seat_type_code=r.seat_type.code,
                seat_type_description=r.seat_type.description,
                score_type=r.score_type,
                min_cutoff=r.min_cutoff,
                mean_cutoff=r.mean_cutoff,
                max_cutoff=r.max_cutoff,
                count=r.count,
                range_cutoff=r.range_cutoff
            ))

        return CollegeDetail(
            id=college.id,
            name=college.name,
            slug=college.slug,
            code=college.code,
            district=college.district,
            city=college.city,
            region=college.region,
            status=college.status,
            cutoffs=cutoff_list,
            available_branches=sorted(list(branches_set)),
            available_seat_types=sorted(list(seat_types_set))
        )

    @staticmethod
    def compare_colleges(
        db: Session,
        college_ids: List[int],
        seat_type: Optional[str] = "GOPENS",
        score_type: Optional[str] = "MHT-CET"
    ) -> Dict[str, Any]:
        """
        Generates side-by-side comparison for 2 to 5 colleges.
        """
        if len(college_ids) < 2 or len(college_ids) > 5:
            raise ValidationError("You must provide between 2 and 5 college IDs to compare.")

        colleges = db.query(College).filter(College.id.in_(college_ids)).all()
        if not colleges:
            raise NotFoundError("No matching colleges found for the provided IDs.")

        result = []
        for c in colleges:
            query = (
                db.query(CutoffRecord)
                .join(Branch, CutoffRecord.branch_id == Branch.id)
                .join(SeatType, CutoffRecord.seat_type_id == SeatType.id)
                .filter(CutoffRecord.college_id == c.id)
                .filter(CutoffRecord.score_type == score_type)
            )
            if seat_type:
                query = query.filter(SeatType.code == seat_type)

            cutoffs = query.order_by(CutoffRecord.min_cutoff.desc()).all()
            branch_stats = []
            min_cutoffs = []
            max_cutoffs = []
            mean_cutoffs = []

            for r in cutoffs:
                r_range = r.range_cutoff if r.range_cutoff is not None else (r.max_cutoff - r.min_cutoff)
                branch_stats.append({
                    "branch_name": r.branch.name,
                    "category": r.branch.category,
                    "seat_type": r.seat_type.code,
                    "min_cutoff": round(r.min_cutoff, 2),
                    "mean_cutoff": round(r.mean_cutoff, 2),
                    "max_cutoff": round(r.max_cutoff, 2),
                    "range_cutoff": round(r_range, 2),
                    "count": r.count
                })
                min_cutoffs.append(r.min_cutoff)
                max_cutoffs.append(r.max_cutoff)
                mean_cutoffs.append(r.mean_cutoff)

            # College overall stats for this score type / seat type
            min_overall = round(min(min_cutoffs), 2) if min_cutoffs else None
            max_overall = round(max(max_cutoffs), 2) if max_cutoffs else None
            mean_overall = round(sum(mean_cutoffs) / len(mean_cutoffs), 2) if mean_cutoffs else None
            range_overall = round(max_overall - min_overall, 2) if (min_overall is not None and max_overall is not None) else None

            # Distinct seat types available across this college
            seat_rows = (
                db.query(SeatType.code)
                .join(CutoffRecord, CutoffRecord.seat_type_id == SeatType.id)
                .filter(CutoffRecord.college_id == c.id)
                .distinct()
                .all()
            )
            available_seat_types = sorted([st[0] for st in seat_rows if st[0]])

            # Total distinct branches offered across all quotas
            total_distinct_branches = (
                db.query(func.count(func.distinct(CutoffRecord.branch_id)))
                .filter(CutoffRecord.college_id == c.id)
                .scalar() or 0
            )

            result.append({
                "id": c.id,
                "name": c.name,
                "slug": c.slug,
                "code": c.code,
                "district": c.district,
                "city": c.city,
                "region": c.region,
                "status": c.status,
                "total_branches": len(branch_stats),
                "total_offered_branches": total_distinct_branches,
                "available_seat_types": available_seat_types,
                "min_cutoff_overall": min_overall,
                "mean_cutoff_overall": mean_overall,
                "max_cutoff_overall": max_overall,
                "range_cutoff_overall": range_overall,
                "branches": branch_stats
            })

        return {
            "colleges": result,
            "comparison_params": {
                "college_ids": college_ids,
                "seat_type": seat_type,
                "score_type": score_type
            }
        }
