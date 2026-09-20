# College Predictor — Current Status Audit

**Audit Date**: September 16, 2026  
**Repository Scope**: Full-stack Next.js (App Router, Turbopack, React 19) + FastAPI + SQLite/PostgreSQL  
**Dataset Scale**: 326 Engineering Colleges, 28,377 Cutoff Records, 94 Disciplines, 77 Seat Categories  

---

## 1. Executive Summary

The **College Predictor** is a mature, full-stack application that has successfully undergone major frontend UI/UX elevation, API stabilization, and strict type-checking passes. The core architecture uses real admission cutoffs from official Maharashtra CET CAP rounds. 

This audit distinguishes what is **genuinely implemented and functional** versus what is **mocked, hardcoded, or requires production configuration**.

---

## 2. Status Breakdown by Category

### A. Fully Functional Features

1. **Database & Entity Relational Integrity**:
   - SQLite instance (`college_predictor.db`) contains **326 colleges**, **94 branches**, **77 seat types**, and **28,377 cutoff records**.
   - Verified relational integrity: 0 orphaned foreign keys, 0 inverted cutoffs (`min <= max`), 0 cohort size anomalies (`count >= 1`), and 0 out-of-bounds percentiles.
   - Sub-4ms query benchmarks on multi-column indexed queries (`(score_type, seat_type_id, min_cutoff)` and `(college_id, branch_id)`).

2. **Core Recommendation Engine**:
   - Fully calculated in backend (`backend/app/services/predictor.py`).
   - Categorizes outcomes into **Safe** ($\Delta \ge +3.0\%$ or $\ge \text{mean}$), **Moderate** ($0.0\% \le \Delta < 3.0\%$), **Reach** ($-4.0\% \le \Delta < 0.0\%$), and **Difficult**.
   - Computes weighted recommendation scores ($0$ to $99$) factoring score delta, cohort mean proximity, and historical cohort sample size stability.
   - Comprehensive sorting (by recommendation score, min cutoff asc/desc, college name) and server-side pagination.

3. **College Search & Directory (`/colleges`)**:
   - Server-side filtered query handling with district filtering, text search across college names and cities, and pagination.
   - Does not load the 28k dataset into client memory.

4. **College Details (`/colleges/[id]`)**:
   - Dynamically loads verified college profile, DTE code, region, district, autonomy status, available branches, and seat quotas from the database.
   - Interactive percentile simulator comparing candidate scores against historical cutoffs.

5. **College Comparison Matrix (`/compare`)**:
   - Compares 2 to 3 colleges across overlapping branches and seat categories.
   - Computes lowest cutoff, highest cutoff, cohort mean, and cutoff spread with tabular numerical alignment.
   - Synchronized across URL query parameters and local storage comparison tray.

6. **Admin Dataset Maintenance Portal (`/admin`)**:
   - Protected by `X-Admin-Key` header or admin Bearer token.
   - Live platform telemetry (6 metric cards, quality indicators).
   - Staged dataset import wizard supporting CSV and Excel files with validation, error detection tables, preview, and transactional commit with rollback safety.

7. **User Dashboard (`/dashboard`)**:
   - Profile overview, comparison tray shortcut, saved colleges listing, and expandable prediction history drawer.

8. **Automated Quality Assurance**:
   - **Backend**: 64 passing pytest tests (`backend/tests/`) covering endpoints, recommendation boundaries, user isolation, and admin imports.
   - **Frontend**: Strict TypeScript (`npx tsc --noEmit`) passes with 0 errors.
   - **Production Build**: Next.js 16 (`npm run build`) compiles all 12 routes in ~1.1s.

---

### B. Partially Functional Features

1. **Recommendation Explainability**:
   - Currently returns `delta`, `classification`, `recommendation_score`, and `admission_chance_label`.
   - Lacks a dedicated plain-English `reason` string (e.g., *"Your percentile is above the historical maximum cutoff"* or *"Your percentile is within the historical cutoff range"*) as required by Phase 3.

2. **Landing Page Quick Predictor Dropdowns**:
   - The quick search widget on the homepage submits real queries to `/predictor`, but its district and seat type dropdown options are hardcoded in the JSX rather than dynamically hydrated from `/api/locations` and `/api/seat-types`.

3. **PostgreSQL Dual Compatibility**:
   - While SQLAlchemy models and migration SQL files (`database/migrations/001_initial_schema.sql`) are written for PostgreSQL, the local runtime uses SQLite. A repeatable ingestion pipeline specifically tested against a live PostgreSQL instance is needed for cloud deployments.

---

### C. Mock / Simulated Features

1. **Supabase Cloud Authentication (`frontend/src/lib/supabase.ts`)**:
   - In the absence of live `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`, the frontend uses a self-contained mock auth client (`LocalAuthClient`).
   - Generates simulated JWT tokens and stores session state in `localStorage` (`cp_supabase_session`).
   - Conforms strictly to the `@supabase/supabase-js` API (`signUp`, `signInWithPassword`, `signOut`, `getSession`, `onAuthStateChange`).
   - Automatically switches to the real Supabase cloud client when environment variables are supplied.

2. **Landing Page Feature Card Copy**:
   - Landing page features section states "up to 5 engineering colleges", whereas the comparator is intentionally bounded to 3 colleges.

---

### D. Missing Backend Functionality

- **Explainable Reason Engine**: Backend calculation for plain-English reason strings per recommendation item.
- **Configurable Classification Thresholds**: Making the $+3.0\%$ Safe margin and $-4.0\%$ Reach buffer adjustable via configuration or query parameters.

---

### E. Missing Database Functionality

- Dedicated automated PostgreSQL migration runner script to facilitate one-command deployment to Supabase/AWS RDS.

---

### F. Missing Authentication Functionality

- Live cloud Supabase project credentials in `.env` (currently blank for local development).
- Email confirmation and password recovery workflows (handled by Supabase when cloud credentials are live).

---

### G. Missing Deployment Configuration

- `Dockerfile` for FastAPI backend.
- `Dockerfile` for Next.js frontend.
- `docker-compose.yml` orchestrating frontend, backend, and PostgreSQL.
- Complete production `.env.example` documenting all secrets and URLs.

---

### H. Known Bugs & Inconsistencies

1. **Prediction Schema**: `PredictionItem` lacks an explicit `reason` string field.
2. **Feature Card Copy**: "Compare across up to 5 engineering colleges" should read "up to 3 engineering colleges".

---

## 3. Recommended Next Steps (Phase Execution)

| Phase | Description | Status |
| :--- | :--- | :--- |
| **Phase 1** | Real Data Verification: Audit and replace any static dropdown options on landing page with live API data. | Ready to start |
| **Phase 2** | Database Verification: Document complete dataset integrity and verify repeatable ingestion pipeline. | Ready to start |
| **Phase 3** | Recommendation Engine: Implement explainable reason generator and boundary test cases. | Ready to start |
| **Phase 4** | End-to-End Predictor: Verify real user journey across high, medium, low, and edge percentiles. | Planned |
| **Phase 5** | College Search: Verify server-side pagination, search, and district filters on `/colleges`. | Planned |
| **Phase 6** | College Details: Verify real data on `/colleges/[id]` (no fake fees/rankings). | Planned |
| **Phase 7** | Compare: Verify 3-college comparison matrix with real cutoffs. | Planned |
| **Phase 8** | Authentication: Test login, registration, logout, protected routes, and user isolation. | Planned |
| **Phase 9** | Dashboard: Verify live user saved colleges and history. | Planned |
| **Phase 10** | Admin: Verify admin auth, telemetry, and safe import wizard. | Planned |
| **Phase 11** | API Quality: Review status codes, CORS, error handling, and OpenAPI schemas. | Planned |
| **Phase 12** | Testing: Execute pytest, strict TypeScript check, Next.js build, and multi-device browser verification. | Planned |
| **Phase 13** | Production Configuration: Dockerfiles, `docker-compose.yml`, production `.env.example`, and deployment guide. | Planned |
| **Final** | Produce `PROJECT_STATUS.md`. | Planned |
