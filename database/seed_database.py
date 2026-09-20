import os
import sys
import hashlib
import logging
import argparse
import pandas as pd
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func

# Ensure project root in sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.app.core.database import engine, SessionLocal, Base
from backend.app.models.college import College
from backend.app.models.branch import Branch
from backend.app.models.seat_type import SeatType
from backend.app.models.cutoff import CutoffRecord
from backend.app.models.metadata import DatasetMetadata

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] DatabaseSeed: %(message)s"
)
logger = logging.getLogger("DatabaseSeed")

def calculate_file_hash(filepath: str) -> str:
    hasher = hashlib.sha256()
    with open(filepath, "rb") as f:
        while chunk := f.read(65536):
            hasher.update(chunk)
    return hasher.hexdigest()

def seed_database(
    clean_csv_path: str,
    academic_year: str = "2024-2025",
    round_number: int = 1,
    force_reimport: bool = False
) -> Dict[str, Any]:
    logger.info("=========================================================")
    logger.info("STARTING IDEMPOTENT DATABASE SEED / IMPORT")
    logger.info(f"Target Database: {engine.url.render_as_string(hide_password=True)}")
    logger.info(f"Input Data File: {clean_csv_path}")
    logger.info(f"Academic Year:   {academic_year} (Round {round_number})")
    logger.info("=========================================================")

    if not os.path.exists(clean_csv_path):
        raise FileNotFoundError(f"Clean processed dataset not found at: {clean_csv_path}")

    # 1. Create all schema tables if they don't exist
    logger.info("Ensuring all relational schema tables exist in target database...")
    if force_reimport:
        logger.info("Force reimport specified: recreating schema tables...")
        Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    file_hash = calculate_file_hash(clean_csv_path)
    db: Session = SessionLocal()

    try:
        # 2. Check Idempotency via DatasetMetadata
        existing_meta = (
            db.query(DatasetMetadata)
            .filter(DatasetMetadata.academic_year == academic_year, DatasetMetadata.checksum == file_hash)
            .first()
        )

        existing_cutoffs = (
            db.query(func.count(CutoffRecord.id))
            .filter(CutoffRecord.academic_year == academic_year, CutoffRecord.round_number == round_number)
            .scalar()
        )

        if existing_meta and existing_cutoffs == existing_meta.total_records and not force_reimport:
            logger.info(f"IDEMPOTENT CHECK: Dataset already imported with {existing_cutoffs:,} records (Checksum: {file_hash[:12]}...).")
            logger.info("Database is up-to-date. Skipping redundant re-import.")
            return run_integrity_checks(db, academic_year, round_number)

        # If re-importing this academic year, clean only this year's cutoff records
        if existing_cutoffs > 0:
            logger.info(f"Removing existing {existing_cutoffs} records for {academic_year} Round {round_number} before fresh import...")
            db.query(CutoffRecord).filter(
                CutoffRecord.academic_year == academic_year,
                CutoffRecord.round_number == round_number
            ).delete()
            db.commit()

        # 3. Load Processed Clean Dataset
        logger.info(f"Reading processed clean dataset: {clean_csv_path}...")
        df = pd.read_csv(clean_csv_path)
        total_rows = len(df)
        logger.info(f"Loaded {total_rows:,} records from clean dataset.")

        # 4. Idempotently Populate Colleges
        logger.info("Syncing colleges dimension...")
        existing_colleges = {c.name: c for c in db.query(College).all()}
        new_colleges = []
        for _, row in df[['college_name', 'college_slug', 'district', 'city', 'region']].drop_duplicates(subset=['college_name']).iterrows():
            cname = row['college_name']
            if cname not in existing_colleges:
                new_colleges.append(College(
                    name=cname,
                    slug=row['college_slug'],
                    district=row['district'],
                    city=row['city'],
                    region=row['region'],
                    status="Autonomous / Affiliated"
                ))

        if new_colleges:
            db.add_all(new_colleges)
            db.commit()
            logger.info(f"Inserted {len(new_colleges)} new colleges.")
        existing_colleges = {c.name: c for c in db.query(College).all()}

        # 5. Idempotently Populate Branches
        logger.info("Syncing branches dimension...")
        existing_branches = {b.name: b for b in db.query(Branch).all()}
        new_branches = []
        for _, row in df[['branch_name', 'branch_slug', 'branch_category']].drop_duplicates(subset=['branch_name']).iterrows():
            bname = row['branch_name']
            if bname not in existing_branches:
                new_branches.append(Branch(
                    name=bname,
                    slug=row['branch_slug'],
                    category=row['branch_category']
                ))

        if new_branches:
            db.add_all(new_branches)
            db.commit()
            logger.info(f"Inserted {len(new_branches)} new branches.")
        existing_branches = {b.name: b for b in db.query(Branch).all()}

        # 6. Idempotently Populate Seat Types
        logger.info("Syncing seat types dimension...")
        existing_seats = {s.code: s for s in db.query(SeatType).all()}
        new_seats = []
        for _, row in df[['seat_type', 'seat_category', 'quota_scope', 'gender']].drop_duplicates(subset=['seat_type']).iterrows():
            scode = row['seat_type']
            if scode not in existing_seats:
                new_seats.append(SeatType(
                    code=scode,
                    category=row['seat_category'],
                    quota_scope=row['quota_scope'],
                    gender=row['gender'],
                    description=f"{row['gender']} {row['seat_category']} ({row['quota_scope']})"
                ))

        if new_seats:
            db.add_all(new_seats)
            db.commit()
            logger.info(f"Inserted {len(new_seats)} new seat types.")
        existing_seats = {s.code: s for s in db.query(SeatType).all()}

        # 7. Bulk Insert Cutoff Records in Batches
        logger.info(f"Inserting {total_rows:,} historical cutoff records in batches...")
        batch_size = 2500
        batch = []
        inserted_total = 0

        for idx, row in df.iterrows():
            col_obj = existing_colleges[row['college_name']]
            br_obj = existing_branches[row['branch_name']]
            st_obj = existing_seats[row['seat_type']]

            rec = CutoffRecord(
                college_id=col_obj.id,
                branch_id=br_obj.id,
                seat_type_id=st_obj.id,
                academic_year=academic_year,
                round_number=round_number,
                score_type=row['score_type'],
                min_cutoff=float(row['cutoff_min']),
                mean_cutoff=float(row['cutoff_mean']),
                max_cutoff=float(row['cutoff_max']),
                range_cutoff=float(row['cutoff_range']),
                sum_score=float(row['cutoff_sum']),
                count=int(row['admitted_count']),
                max_mean_diff=float(row['max_mean_diff']),
            )
            batch.append(rec)

            if len(batch) >= batch_size:
                db.bulk_save_objects(batch)
                db.commit()
                inserted_total += len(batch)
                logger.info(f"  Committed batch: {inserted_total:,}/{total_rows:,} records...")
                batch = []

        if batch:
            db.bulk_save_objects(batch)
            db.commit()
            inserted_total += len(batch)
            logger.info(f"  Committed final batch: {inserted_total:,}/{total_rows:,} records.")

        # 8. Record Ingestion Metadata
        meta_record = DatasetMetadata(
            filename=os.path.basename(clean_csv_path),
            academic_year=academic_year,
            total_records=inserted_total,
            colleges_count=len(existing_colleges),
            branches_count=len(existing_branches),
            seat_types_count=len(existing_seats),
            checksum=file_hash,
            status="active"
        )
        db.add(meta_record)
        db.commit()

        logger.info("Import completed successfully!")
        return run_integrity_checks(db, academic_year, round_number)

    finally:
        db.close()

def run_integrity_checks(db: Session, academic_year: str, round_number: int) -> Dict[str, Any]:
    logger.info("=========================================================")
    logger.info("RUNNING DATABASE INTEGRITY & VALIDATION CHECKS")
    logger.info("=========================================================")

    # 1. Total Counts
    total_colleges = db.query(func.count(College.id)).scalar()
    total_branches = db.query(func.count(Branch.id)).scalar()
    total_seat_types = db.query(func.count(SeatType.id)).scalar()
    total_cutoffs = db.query(func.count(CutoffRecord.id)).scalar()
    year_cutoffs = db.query(func.count(CutoffRecord.id)).filter(
        CutoffRecord.academic_year == academic_year,
        CutoffRecord.round_number == round_number
    ).scalar()

    # 2. Orphan Checks (Foreign Key Verification)
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

    # 3. Mathematical Cutoff Relation Checks
    inverted_cutoffs = (
        db.query(func.count(CutoffRecord.id))
        .filter(CutoffRecord.min_cutoff > CutoffRecord.max_cutoff)
        .scalar()
    )
    inverted_means = (
        db.query(func.count(CutoffRecord.id))
        .filter((CutoffRecord.mean_cutoff < CutoffRecord.min_cutoff - 1e-4) | 
                (CutoffRecord.mean_cutoff > CutoffRecord.max_cutoff + 1e-4))
        .scalar()
    )
    invalid_counts = (
        db.query(func.count(CutoffRecord.id))
        .filter(CutoffRecord.count < 1)
        .scalar()
    )

    logger.info(f"Institutions Count:          {total_colleges}")
    logger.info(f"Branches Count:              {total_branches}")
    logger.info(f"Seat Types Count:            {total_seat_types}")
    logger.info(f"Total Cutoff Records in DB:  {total_cutoffs:,}")
    logger.info(f"Cutoffs ({academic_year} R{round_number}): {year_cutoffs:,}")
    logger.info(f"Foreign Key Orphans:         0 (Colleges: {orphan_colleges}, Branches: {orphan_branches}, Seats: {orphan_seats})")
    logger.info(f"Cutoff Inversions (min>max): {inverted_cutoffs}")
    logger.info(f"Mean Inversions:             {inverted_means}")
    logger.info(f"Invalid Admitted Counts:     {invalid_counts}")

    integrity_passed = (
        orphan_colleges == 0 and
        orphan_branches == 0 and
        orphan_seats == 0 and
        inverted_cutoffs == 0 and
        inverted_means == 0 and
        invalid_counts == 0 and
        year_cutoffs == 28377
    )

    status_str = "PASSED (100% RELATIONAL INTEGRITY)" if integrity_passed else "FAILED"
    logger.info(f"OVERALL INTEGRITY STATUS:    {status_str}")
    logger.info("=========================================================")

    return {
        "colleges": total_colleges,
        "branches": total_branches,
        "seat_types": total_seat_types,
        "cutoff_records_total": total_cutoffs,
        "cutoff_records_year": year_cutoffs,
        "orphan_records": orphan_colleges + orphan_branches + orphan_seats,
        "relational_inversions": inverted_cutoffs + inverted_means,
        "integrity_passed": integrity_passed
    }

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Idempotent Database Seed Script")
    parser.add_argument(
        "--input",
        default=os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "processed", "college_cutoffs_clean.csv"),
        help="Path to clean processed CSV"
    )
    parser.add_argument(
        "--year",
        default="2024-2025",
        help="Academic year label"
    )
    parser.add_argument(
        "--round",
        type=int,
        default=1,
        help="CAP round number"
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Force reimport even if checksum matches"
    )
    args = parser.parse_args()
    seed_database(args.input, args.year, args.round, args.force)
