from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import or_, func

from backend.app.models.college import College
from backend.app.models.branch import Branch
from backend.app.schemas.search import (
    SearchResponse,
    SearchCollegeItem,
    SearchBranchItem,
    SearchDistrictItem
)

class SearchService:
    @staticmethod
    def unified_search(
        db: Session,
        query: Optional[str] = None,
        limit: int = 10
    ) -> SearchResponse:
        """
        Conducts an indexed cross-entity search over colleges, branches, and districts.
        """
        clean_q = (query or "").strip()
        if not clean_q:
            return SearchResponse(
                query="",
                total_matches=0,
                colleges=[],
                branches=[],
                locations=[]
            )

        pattern = f"%{clean_q}%"

        # 1. Search Colleges
        colleges = (
            db.query(College)
            .filter(
                or_(
                    College.name.ilike(pattern),
                    College.code.ilike(pattern),
                    College.city.ilike(pattern),
                    College.district.ilike(pattern)
                )
            )
            .limit(limit)
            .all()
        )
        college_items = [
            SearchCollegeItem(
                id=c.id,
                name=c.name,
                slug=c.slug,
                code=c.code,
                city=c.city,
                district=c.district,
                region=c.region,
                status=c.status
            )
            for c in colleges
        ]

        # 2. Search Branches
        branches = (
            db.query(Branch)
            .filter(
                or_(
                    Branch.name.ilike(pattern),
                    Branch.category.ilike(pattern)
                )
            )
            .limit(limit)
            .all()
        )
        branch_items = [
            SearchBranchItem(
                id=b.id,
                name=b.name,
                slug=b.slug,
                category=b.category
            )
            for b in branches
        ]

        # 3. Search Districts
        districts = (
            db.query(College.district, College.region, func.count(College.id).label("colleges_count"))
            .filter(
                or_(
                    College.district.ilike(pattern),
                    College.region.ilike(pattern)
                )
            )
            .group_by(College.district, College.region)
            .limit(limit)
            .all()
        )
        district_items = [
            SearchDistrictItem(
                district=d.district,
                region=d.region,
                colleges_count=d.colleges_count
            )
            for d in districts
        ]

        total_matches = len(college_items) + len(branch_items) + len(district_items)

        return SearchResponse(
            query=clean_q,
            total_matches=total_matches,
            colleges=college_items,
            branches=branch_items,
            locations=district_items
        )
