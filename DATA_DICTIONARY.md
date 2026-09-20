# Data Dictionary: Maharashtra Engineering Admissions Cutoff Dataset

This document defines the schema, field types, constraints, domain values, and semantic definitions for all entities and attributes used in the **College Predictor** platform.

---

## 1. Raw Dataset Columns (`college_data_cleaned.xlsx`)

The raw spreadsheet contains 11 active institutional columns and 26 extraneous scratch columns.

| Column Name | Raw Type | Target SQL Type | Nullable | Domain / Value Range | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `college_name` | String | `VARCHAR(300)` | No | 326 unique institutions | Full official name of the engineering college as recorded in DTE/CET Cell records. |
| `score_type` | String | `VARCHAR(50)` | No | `MHT-CET`, `JEE(Main)`, `Merit` | The examination or qualification channel used for this allotment cohort. |
| `seat_type` | String | `VARCHAR(50)` | No | 77 CAP quota codes | Centralized Admission Process (CAP) seat allocation category code (e.g. `GOPENS`, `TFWS`, `AI`). |
| `branch` | String | `VARCHAR(255)` | No | 95 engineering disciplines | Specialization or academic degree course (e.g., `Computer Engineering`, `Information Technology`). |
| `sum` | Float | `DOUBLE PRECISION` | No | `[0.0047, 9076.73]` | Sum of percentile scores for all candidates admitted under this specific college, branch, and seat quota. |
| `count` | Integer | `INTEGER` | No | `[1, 92]` | Total number of candidates admitted into this quota cohort. Corresponds to sampled seat volume. |
| `max` | Float | `DOUBLE PRECISION` | No | `[0.0047, 100.00]` | Highest percentile score among candidates admitted into this cohort (topper score). |
| `min` | Float | `DOUBLE PRECISION` | No | `[0.0047, 99.84]` | **Cutoff Percentile**. Lowest percentile score admitted into this quota. Serves as the historical barrier threshold. |
| `mean` | Float | `DOUBLE PRECISION` | No | `[0.0047, 99.91]` | Arithmetic mean ($\text{sum} / \text{count}$) of percentiles admitted into this quota. Represents central admission tendency. |
| `max-min` | Float | `DOUBLE PRECISION` | No | `[0.00, 95.86]` | Cutoff spread ($\text{max} - \text{min}$). Measures admission score dispersion across the admitted cohort. |
| `max-mean` | Float | `DOUBLE PRECISION` | No | `[0.00, 66.98]` | Distance between topper score and cohort average ($\text{max} - \text{mean}$). |
| `Unnamed: 11` to `Unnamed: 36` | Mixed | *N/A (Dropped)* | Yes | Stray pivot calculations | 26 scratch columns containing ad-hoc regression notes and labels; pruned by pipeline. |

---

## 2. Processed PostgreSQL Relational Entities

### Table: `colleges`
Stores verified engineering institutions across Maharashtra.

| Field Name | Type | Key | Constraints | Description |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `INTEGER` | PK | `AUTOINCREMENT` | Unique system identifier. |
| `name` | `VARCHAR(300)` | Unique | `NOT NULL, INDEXED` | Standardized canonical institution title (whitespace normalized). |
| `slug` | `VARCHAR(320)` | Unique | `NOT NULL, INDEXED` | URL-safe slug for routing (e.g. `coep-technological-university`). |
| `code` | `VARCHAR(50)` | None | `NULLABLE, INDEXED` | DTE institutional code if available. |
| `district` | `VARCHAR(100)` | None | `NOT NULL, INDEXED` | Administrative District in Maharashtra (e.g., `Pune`, `Mumbai`, `Nagpur`). |
| `city` | `VARCHAR(100)` | None | `NOT NULL` | City, Taluka, or campus location. |
| `region` | `VARCHAR(100)` | None | `NOT NULL, INDEXED` | Educational division (`Pune Region`, `Mumbai Region`, `Vidarbha`, `Marathwada`, etc.). |
| `status` | `VARCHAR(100)` | None | `DEFAULT 'Autonomous / Affiliated'` | Accreditation status. |
| `created_at` | `TIMESTAMP` | None | `DEFAULT NOW()` | Record creation timestamp. |

---

### Table: `branches`
Stores engineering academic disciplines and specializations.

| Field Name | Type | Key | Constraints | Description |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `INTEGER` | PK | `AUTOINCREMENT` | Unique branch identifier. |
| `name` | `VARCHAR(255)` | Unique | `NOT NULL, INDEXED` | Canonical course title (e.g., `Artificial Intelligence and Data Science`). |
| `slug` | `VARCHAR(270)` | Unique | `NOT NULL, INDEXED` | URL-safe slug. |
| `category` | `VARCHAR(100)` | None | `NOT NULL, INDEXED` | Faculty group (`Computer Science & IT`, `AI & Data`, `Electronics & Electrical`, `Mechanical`, `Civil`, `Chemical`). |
| `created_at` | `TIMESTAMP` | None | `DEFAULT NOW()` | Record creation timestamp. |

---

### Table: `seat_types`
Stores centralized admission seat matrix classifications and reservation categories.

| Field Name | Type | Key | Constraints | Description |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `INTEGER` | PK | `AUTOINCREMENT` | Unique seat type identifier. |
| `code` | `VARCHAR(50)` | Unique | `NOT NULL, INDEXED` | Official CET Cell quota code (e.g., `GOPENS`, `TFWS`, `EWS`). |
| `category` | `VARCHAR(50)` | None | `NOT NULL, INDEXED` | Caste / economic reservation category (`OPEN`, `OBC`, `SC`, `ST`, `EWS`, `TFWS`, `AI`). |
| `quota_scope`| `VARCHAR(50)` | None | `NOT NULL` | Geographic pool (`State Level`, `Home University`, `Other than Home University`, `All India`). |
| `gender` | `VARCHAR(20)` | None | `NOT NULL` | `General` (Open to all genders) or `Ladies` (Women-only quota). |
| `description`| `TEXT` | None | `NOT NULL` | Human-readable description explaining reservation rules. |

---

### Table: `cutoff_records`
Stores historical cutoff statistics (28,377 records) linking colleges, branches, and seat quotas.

| Field Name | Type | Key | Constraints | Description |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `INTEGER` | PK | `AUTOINCREMENT` | Unique cutoff record identifier. |
| `college_id` | `INTEGER` | FK | `colleges.id, NOT NULL` | Reference to parent college. |
| `branch_id` | `INTEGER` | FK | `branches.id, NOT NULL` | Reference to course branch. |
| `seat_type_id` | `INTEGER` | FK | `seat_types.id, NOT NULL` | Reference to seat reservation type. |
| `score_type` | `VARCHAR(50)` | None | `NOT NULL, INDEXED` | Scoring examination (`MHT-CET`, `JEE(Main)`, `Merit`). |
| `min_cutoff` | `FLOAT` | None | `NOT NULL, INDEXED` | **Historical Cutoff Threshold**. Lowest percentile score admitted. |
| `mean_cutoff`| `FLOAT` | None | `NOT NULL` | Cohort average admitted score. |
| `max_cutoff` | `FLOAT` | None | `NOT NULL` | Highest admitted percentile (topper score). |
| `sum_score` | `FLOAT` | None | `NOT NULL` | Sum of admitted scores in cohort. |
| `count` | `INTEGER` | None | `NOT NULL` | Admitted cohort size / seat count. |
| `range_cutoff`| `FLOAT` | None | `NOT NULL` | Cohort spread ($\text{max} - \text{min}$). |
| `max_mean_diff`| `FLOAT` | None | `NOT NULL` | Spread between topper and average ($\text{max} - \text{mean}$). |

---

## 3. Quota Decoding Rules for Maharashtra Seat Codes

Maharashtra CAP round seat allocation codes follow standard prefixes, bodies, and suffixes:

1. **Prefix**:
   - `G`: General (Both male and female candidates eligible).
   - `L`: Ladies only reservation (30% women horizontal reservation).
   - `PWD`: Persons with Disability reservation (5% horizontal reservation).
   - `DEF` / `DEFR`: Children of Defence personnel reservation (5% horizontal reservation).
2. **Category Core**:
   - `OPEN`: General Open category.
   - `OBC`: Other Backward Class.
   - `SC`: Scheduled Caste.
   - `ST`: Scheduled Tribe.
   - `VJ`: Vimukta Jati / Denotified Tribes (VJ / DT).
   - `NT1` / `NT2` / `NT3`: Nomadic Tribes (NT-B, NT-C, NT-D).
   - `EWS`: Economically Weaker Section (10% reservation).
   - `TFWS`: Tuition Fee Waiver Scheme (5% supernumerary seats).
   - `AI`: All India Seats (Allotted primarily via JEE Main percentile or MHT-CET).
   - `MI`: Minority Institutions Quota (Linguistic or Religious minority).
   - `ORPHAN`: Orphan Quota (1% reservation).
3. **Suffix (Quota Scope)**:
   - `H`: **Home University (HU)** seats (reserved for candidates originating from the university's geographic jurisdiction).
   - `O`: **Other than Home University (OHU)** seats.
   - `S`: **State Level (SL)** seats (open to all candidates across Maharashtra regardless of university area).
