import os
import re
import pandas as pd
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session

from backend.app.core.database import engine, SessionLocal, Base
from backend.app.models.college import College
from backend.app.models.branch import Branch
from backend.app.models.seat_type import SeatType
from backend.app.models.cutoff import CutoffRecord
from backend.app.models.metadata import DatasetMetadata
from backend.app.data.location_mapping import resolve_location
from backend.app.data.seat_type_mapping import parse_seat_type
from backend.app.data.branch_category_mapping import categorize_branch

def slugify(text: str) -> str:
    text = text.lower().strip()
    text = re.sub(r'[\s/()_,\.\-]+', '-', text)
    text = re.sub(r'[^a-z0-9\-]', '', text)
    return text.strip('-')[:250]

def ingest_dataset(excel_path: str, db: Optional[Session] = None, clear_existing: bool = True) -> Dict[str, Any]:
    print(f"Starting ingestion from: {excel_path}")
    if not os.path.exists(excel_path):
        raise FileNotFoundError(f"Dataset file not found at: {excel_path}")

    # Ensure tables exist
    Base.metadata.create_all(bind=engine)

    close_session_at_end = False
    if db is None:
        db = SessionLocal()
        close_session_at_end = True

    try:
        # Read Excel or CSV
        if excel_path.lower().endswith('.csv'):
            print(f"Loading CSV file '{excel_path}'...")
            df = pd.read_csv(excel_path)
        else:
            xl = pd.ExcelFile(excel_path)
            sheet_name = 'Sheet' if 'Sheet' in xl.sheet_names else xl.sheet_names[0]
            print(f"Loading sheet '{sheet_name}'...")
            df = xl.parse(sheet_name)

        total_rows = len(df)
        print(f"Parsed {total_rows} rows from file.")

        # Ensure required core columns exist
        core_cols = ['college_name', 'score_type', 'seat_type', 'branch', 'min', 'max', 'mean', 'count']
        for col in core_cols:
            if col not in df.columns:
                raise ValueError(f"Missing required column in dataset: {col}")

        # Auto-compute derived columns if not provided
        if 'max-min' not in df.columns:
            df['max-min'] = df['max'] - df['min']
        if 'max-mean' not in df.columns:
            df['max-mean'] = df['max'] - df['mean']
        if 'sum' not in df.columns:
            df['sum'] = df['mean'] * df['count']

        if clear_existing:
            print("Clearing existing cutoff records and metadata...")
            db.query(CutoffRecord).delete()
            db.query(DatasetMetadata).delete()
            # Do NOT commit yet so that any rollback restores previous state!


        # 1. Populate Colleges
        unique_colleges = df['college_name'].dropna().unique()
        print(f"Ingesting {len(unique_colleges)} unique colleges...")
        existing_colleges = db.query(College).all()
        college_cache = {c.name.strip(): c for c in existing_colleges}
        college_slug_cache = {c.slug: c for c in existing_colleges}
        existing_slugs = set(college_slug_cache.keys())
        new_colleges = []

        for cname in unique_colleges:
            clean_cname = cname.strip()
            base_slug = slugify(clean_cname)
            if clean_cname not in college_cache and base_slug not in college_slug_cache:
                dist, city, reg = resolve_location(clean_cname)
                slug = base_slug
                counter = 1
                while slug in existing_slugs:
                    counter += 1
                    slug = f"{base_slug}-{counter}"
                existing_slugs.add(slug)

                col_obj = College(
                    name=clean_cname,
                    slug=slug,
                    district=dist,
                    city=city,
                    region=reg,
                    status="Autonomous / Affiliated"
                )
                new_colleges.append(col_obj)
                college_cache[clean_cname] = col_obj
                college_slug_cache[slug] = col_obj

        if new_colleges:
            db.add_all(new_colleges)
            db.commit()
            all_cols = db.query(College).all()
            college_cache = {c.name.strip(): c for c in all_cols}
            college_slug_cache = {c.slug: c for c in all_cols}

        # 2. Populate Branches
        unique_branches = df['branch'].dropna().unique()
        print(f"Ingesting {len(unique_branches)} unique branches...")
        existing_branches = db.query(Branch).all()
        branch_cache = {b.name.strip(): b for b in existing_branches}
        branch_slug_cache = {b.slug: b for b in existing_branches}
        existing_br_slugs = set(branch_slug_cache.keys())
        new_branches = []

        for bname in unique_branches:
            clean_bname = bname.strip()
            base_slug = slugify(clean_bname)
            if clean_bname not in branch_cache and base_slug not in branch_slug_cache:
                cat = categorize_branch(clean_bname)
                slug = base_slug
                counter = 1
                while slug in existing_br_slugs:
                    counter += 1
                    slug = f"{base_slug}-{counter}"
                existing_br_slugs.add(slug)

                br_obj = Branch(
                    name=clean_bname,
                    slug=slug,
                    category=cat
                )
                new_branches.append(br_obj)
                branch_cache[clean_bname] = br_obj
                branch_slug_cache[slug] = br_obj

        if new_branches:
            db.add_all(new_branches)
            db.commit()
            all_brs = db.query(Branch).all()
            branch_cache = {b.name.strip(): b for b in all_brs}
            branch_slug_cache = {b.slug: b for b in all_brs}

        # 3. Populate Seat Types
        unique_seat_types = df['seat_type'].dropna().unique()
        print(f"Ingesting {len(unique_seat_types)} unique seat types...")
        seat_cache = {s.code: s for s in db.query(SeatType).all()}
        new_seats = []

        for scode in unique_seat_types:
            if scode not in seat_cache:
                cat, scope, gender, desc = parse_seat_type(scode)
                st_obj = SeatType(
                    code=scode,
                    category=cat,
                    quota_scope=scope,
                    gender=gender,
                    description=desc
                )
                new_seats.append(st_obj)

        if new_seats:
            db.add_all(new_seats)
            db.commit()
            seat_cache = {s.code: s for s in db.query(SeatType).all()}

        # 4. Populate Cutoff Records in Batches
        print(f"Ingesting {total_rows} cutoff records...")
        batch_size = 2000
        cutoff_records = []
        inserted_count = 0

        for idx, row in df.iterrows():
            col_name = row['college_name']
            br_name = row['branch']
            st_code = row['seat_type']

            col_obj = college_cache.get(col_name) or college_cache.get(col_name.strip()) or college_slug_cache.get(slugify(col_name))
            br_obj = branch_cache.get(br_name) or branch_cache.get(br_name.strip()) or branch_slug_cache.get(slugify(br_name))
            st_obj = seat_cache.get(st_code) or seat_cache.get(st_code.strip())

            college_id = col_obj.id
            branch_id = br_obj.id
            seat_type_id = st_obj.id

            rec = CutoffRecord(
                college_id=college_id,
                branch_id=branch_id,
                seat_type_id=seat_type_id,
                score_type=str(row['score_type']).strip(),
                min_cutoff=float(row['min']),
                max_cutoff=float(row['max']),
                mean_cutoff=float(row['mean']),
                sum_score=float(row['sum']),
                count=int(row['count']),
                range_cutoff=float(row['max-min']),
                max_mean_diff=float(row['max-mean']),
            )
            cutoff_records.append(rec)

            if len(cutoff_records) >= batch_size:
                db.bulk_save_objects(cutoff_records)
                db.flush()
                inserted_count += len(cutoff_records)
                print(f"  Processed {inserted_count}/{total_rows} records...")
                cutoff_records = []

        if cutoff_records:
            db.bulk_save_objects(cutoff_records)
            db.flush()
            inserted_count += len(cutoff_records)

        # 5. Record metadata
        meta = DatasetMetadata(
            filename=os.path.basename(excel_path),
            total_records=inserted_count,
            colleges_count=len(college_cache),
            branches_count=len(branch_cache),
            seat_types_count=len(seat_cache),
            status="active"
        )
        db.add(meta)
        db.commit()

        print(f"\nIngestion Complete Successfully!")
        print(f"- Cutoff Records: {inserted_count}")
        print(f"- Colleges: {len(college_cache)}")
        print(f"- Branches: {len(branch_cache)}")
        print(f"- Seat Types: {len(seat_cache)}")

        return {
            "success": True,
            "total_records": inserted_count,
            "colleges_count": len(college_cache),
            "branches_count": len(branch_cache),
            "seat_types_count": len(seat_cache),
        }

    finally:
        if close_session_at_end:
            db.close()

if __name__ == "__main__":
    dataset_file = os.path.join(
        os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))),
        "data", "college_data_cleaned.xlsx"
    )
    ingest_dataset(dataset_file)
