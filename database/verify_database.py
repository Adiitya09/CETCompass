import os
import sys
import logging
from sqlalchemy import func
from sqlalchemy.orm import Session

# Add project root to sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.app.core.database import engine, SessionLocal
from backend.app.models.college import College
from backend.app.models.branch import Branch
from backend.app.models.seat_type import SeatType
from backend.app.models.cutoff import CutoffRecord
from backend.app.models.metadata import DatasetMetadata

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("DBVerification")

def run_full_verification():
    db: Session = SessionLocal()
    try:
        logger.info("Connecting to database: %s", engine.url.render_as_string(hide_password=True))
        
        # 1. Basic entity counts
        colleges_count = db.query(func.count(College.id)).scalar()
        branches_count = db.query(func.count(Branch.id)).scalar()
        seat_types_count = db.query(func.count(SeatType.id)).scalar()
        cutoff_count = db.query(func.count(CutoffRecord.id)).scalar()
        meta_count = db.query(func.count(DatasetMetadata.id)).scalar()

        print("\n========================================================")
        print("DATABASE ENTITY COUNTS")
        print("========================================================")
        print(f"Colleges Table:        {colleges_count:,} records")
        print(f"Branches Table:        {branches_count:,} records")
        print(f"Seat Types Table:      {seat_types_count:,} records")
        print(f"Cutoff Records Table:  {cutoff_count:,} records")
        print(f"Dataset Metadata:      {meta_count} records")
        print("========================================================")

        # 2. Foreign Key Integrity Checks
        orphan_colleges = (
            db.query(func.count(CutoffRecord.id))
            .filter(~CutoffRecord.college_id.in_(db.query(College.id)))
            .scalar()
        )
        orphan_branches = (
            db.query(func.count(CutoffRecord.id))
            .filter(~CutoffRecord.branch_id.in_(db.query(Branch.id)))
            .scalar()
        )
        orphan_seats = (
            db.query(func.count(CutoffRecord.id))
            .filter(~CutoffRecord.seat_type_id.in_(db.query(SeatType.id)))
            .scalar()
        )

        print("\n========================================================")
        print("RELATIONAL & REFERENTIAL INTEGRITY")
        print("========================================================")
        print(f"Orphaned College FKs:  {orphan_colleges} (Must be 0)")
        print(f"Orphaned Branch FKs:   {orphan_branches} (Must be 0)")
        print(f"Orphaned SeatType FKs: {orphan_seats} (Must be 0)")

        # 3. Domain and Mathematical Invariance Checks
        inverted_cutoffs = (
            db.query(func.count(CutoffRecord.id))
            .filter(CutoffRecord.min_cutoff > CutoffRecord.max_cutoff)
            .scalar()
        )
        out_of_bounds = (
            db.query(func.count(CutoffRecord.id))
            .filter((CutoffRecord.min_cutoff < 0.0) | (CutoffRecord.max_cutoff > 100.0))
            .scalar()
        )
        invalid_cohort_counts = (
            db.query(func.count(CutoffRecord.id))
            .filter(CutoffRecord.count < 1)
            .scalar()
        )

        print(f"Inverted Cutoffs (min > max):     {inverted_cutoffs} (Must be 0)")
        print(f"Score Bounds Violations:          {out_of_bounds} (Must be 0)")
        print(f"Cohort Size Invalids (count < 1): {invalid_cohort_counts} (Must be 0)")
        print("========================================================")

        # 4. Multi-Year & Score Type Distribution
        score_types_dist = (
            db.query(CutoffRecord.score_type, func.count(CutoffRecord.id))
            .group_by(CutoffRecord.score_type)
            .all()
        )
        print("\n========================================================")
        print("SCORE SYSTEM BREAKDOWN")
        print("========================================================")
        for st, count in score_types_dist:
            print(f" - {st:15}: {count:,} records ({(count/cutoff_count)*100:.2f}%)")
        print("========================================================")

        # 5. Fast Query Benchmark Check (Testing composite index speed)
        import time
        t0 = time.time()
        # Query simulating top cutoff search: GOPENS in Pune
        pune_open = (
            db.query(CutoffRecord)
            .join(College, CutoffRecord.college_id == College.id)
            .join(SeatType, CutoffRecord.seat_type_id == SeatType.id)
            .filter(College.district == "Pune", SeatType.code == "GOPENS")
            .filter(CutoffRecord.min_cutoff >= 90.0)
            .order_by(CutoffRecord.min_cutoff.desc())
            .limit(10)
            .all()
        )
        elapsed_ms = (time.time() - t0) * 1000
        print(f"\nIndexed Query Benchmark: Filtered 28k+ rows in {elapsed_ms:.2f} ms")
        for r in pune_open[:3]:
            print(f"  * {r.college.name[:40]} | {r.branch.name[:25]} | Cutoff: {r.min_cutoff:.2f}%")

        assert orphan_colleges == 0, "FK violation: orphan colleges"
        assert orphan_branches == 0, "FK violation: orphan branches"
        assert orphan_seats == 0, "FK violation: orphan seats"
        assert inverted_cutoffs == 0, "Data error: min > max"
        assert out_of_bounds == 0, "Data error: out of bounds"
        assert cutoff_count == 28377, f"Row count error: expected 28377, got {cutoff_count}"

        print("\n>>> ALL 6 INTEGRITY CHECKS PASSED SUCCESSFULLY! <<<\n")

    finally:
        db.close()

if __name__ == "__main__":
    run_full_verification()
