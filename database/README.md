# Database Architecture & Migration Guide: College Predictor

This directory contains the relational database architecture, SQL migrations, idempotent seed pipelines, and verification scripts for the **College Predictor** web application.

---

## 1. Entity-Relationship (ER) Architecture

```mermaid
erDiagram
    COLLEGES ||--o{ CUTOFF_RECORDS : "offers cutoffs"
    BRANCHES ||--o{ CUTOFF_RECORDS : "categorized by"
    SEAT_TYPES ||--o{ CUTOFF_RECORDS : "allocated under"
    
    USERS ||--o{ SAVED_COLLEGES : "bookmarks"
    COLLEGES ||--o{ SAVED_COLLEGES : "saved by"
    BRANCHES ||--o{ SAVED_COLLEGES : "targeted in"
    
    USERS ||--o{ PREDICTION_HISTORY : "records runs"

    COLLEGES {
        int id PK
        varchar name UK
        varchar slug UK
        varchar code
        varchar district
        varchar city
        varchar region
        varchar status
        timestamp created_at
        timestamp updated_at
    }

    BRANCHES {
        int id PK
        varchar name UK
        varchar slug UK
        varchar category
        timestamp created_at
        timestamp updated_at
    }

    SEAT_TYPES {
        int id PK
        varchar code UK
        varchar category
        varchar quota_scope
        varchar gender
        text description
        timestamp created_at
    }

    CUTOFF_RECORDS {
        int id PK
        int college_id FK
        int branch_id FK
        int seat_type_id FK
        varchar academic_year
        int round_number
        varchar score_type
        float min_cutoff
        float mean_cutoff
        float max_cutoff
        float range_cutoff
        float sum_score
        int count
        float max_mean_diff
        timestamp created_at
    }

    USERS {
        varchar id PK
        varchar email UK
        varchar full_name
        varchar role
        timestamp created_at
        timestamp updated_at
    }

    SAVED_COLLEGES {
        int id PK
        varchar user_id FK
        int college_id FK
        int branch_id FK
        text notes
        timestamp created_at
    }

    PREDICTION_HISTORY {
        int id PK
        varchar user_id FK
        float percentile
        varchar score_type
        varchar seat_type
        text preferred_branches
        text preferred_locations
        int total_matches
        int safe_count
        int moderate_count
        int reach_count
        timestamp created_at
    }

    DATASET_METADATA {
        int id PK
        varchar filename
        varchar academic_year
        int total_records
        int colleges_count
        int branches_count
        int seat_types_count
        varchar checksum
        varchar status
        timestamp ingested_at
    }
```

---

## 2. Design Principles & Multi-Year Scalability

1. **Normalized Dimensions**:
   - `colleges` (326 rows), `branches` (94 rows), and `seat_types` (77 rows) are decoupled from the 28,377 fact cutoff records. This eliminates string redundancy and ensures lightning-fast queries.
2. **Multi-Year & Multi-Round Scalability**:
   - `cutoff_records` incorporates `academic_year` (e.g. `'2024-2025'`) and `round_number` (`1`, `2`, `3`).
   - When new CAP round cutoffs are published annually, records are appended without altering existing institutional IDs.
3. **Idempotency Guarantee**:
   - Composite unique constraint:
     ```sql
     CONSTRAINT uq_cutoff_entry UNIQUE (college_id, branch_id, seat_type_id, score_type, academic_year, round_number)
     ```
   - Re-running the seed script automatically checks the SHA-256 file checksum and record counts. Duplicate records cannot be created.
4. **Sub-Millisecond Query Optimization**:
   - `idx_cutoffs_pred_lookup`: Composite index on `(score_type, seat_type_id, min_cutoff)` for filtering 28,000+ cutoffs in under 5 milliseconds.
   - `idx_colleges_district` and `idx_colleges_region` for geographic faceted filtering.

---

## 3. Database Setup & PostgreSQL Migration

### A. Environment Configuration (`.env`)
```bash
# Local SQLite fallback:
DATABASE_URL=sqlite:///./college_predictor.db

# Supabase / Production PostgreSQL:
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
```

### B. Applying Migrations (PostgreSQL / Supabase)
You can apply `database/migrations/001_initial_schema.sql` directly:
- **Via psql**:
  ```bash
  psql $DATABASE_URL -f database/migrations/001_initial_schema.sql
  ```
- **Via Supabase Dashboard**:
  Paste the contents of `database/migrations/001_initial_schema.sql` into the **Supabase SQL Editor** and click **Run**.

---

## 4. Seeding & Verification

### Running the Idempotent Seed Pipeline
```bash
# Seed the database from clean processed dataset:
python database/seed_database.py --year 2024-2025 --round 1

# Force re-import if dataset file is refreshed:
python database/seed_database.py --force
```

### Running Database Integrity Checks
```bash
python database/verify_database.py
```
Validates:
1. Exact row count matches (28,377 records).
2. Zero orphaned foreign keys.
3. Zero cutoff mathematical inversions ($\text{min} \le \text{mean} \le \text{max}$).
4. Zero score bounds violations ($0.0 \le \text{score} \le 100.0$).
5. Benchmark index query performance.
