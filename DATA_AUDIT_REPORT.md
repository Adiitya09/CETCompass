# Comprehensive Data Audit Report: MHT-CET Historical College Cutoffs

**Dataset Audited**: `data/college_data_cleaned.xlsx`  
**Sheet Analyzed**: `'Sheet'`  
**Date of Audit**: September 2026  
**Auditor**: Lead Full-Stack & Data Engineer  

---

## Executive Summary

The provided dataset contains official historical CAP round admission cutoff statistics for Maharashtra engineering colleges. An exhaustive programmatic audit was conducted across all 37 columns and 28,377 rows.

- **Integrity**: The core 11 columns contain **28,377 complete records with 0 missing values**.
- **Duplicates**: **0 duplicate rows** exist across all core features or primary natural keys.
- **Mathematical Validity**: 100% of rows satisfy $\text{min} \le \text{mean} \le \text{max}$, $(\text{max} - \text{min}) = \text{max-min}$, and $(\text{sum} / \text{count}) \approx \text{mean}$.
- **Extraneous Content**: Columns 11 through 36 (`Unnamed: 11` to `Unnamed: 36`) contain stray Excel pivot labels (only present in 45 rows) and contain no institutional data; these must be dropped deterministically.
- **Data Usability**: **100% of the 28,377 rows can be used reliably** for institutional modeling and student recommendations once deterministic text whitespace normalization is applied.

---

## 17-Point Programmatic Audit

### 1. Number of Rows
- **Total Rows**: `28,377`
- *Note*: An empty sheet named `'Sheet1'` with shape `(0, 0)` is present in the Excel workbook. The active data resides in sheet `'Sheet'`.

### 2. Number of Columns
- **Total Columns in Raw File**: `37`
- **Core Institutional Columns**: `11`
- **Extraneous / Scratch Columns**: `26` (`Unnamed: 11` through `Unnamed: 36`)

### 3. Column Names
1. `college_name`
2. `score_type`
3. `seat_type`
4. `branch`
5. `sum`
6. `count`
7. `max`
8. `min`
9. `mean`
10. `max-min`
11. `max-mean`
12. `Unnamed: 11` to `Unnamed: 36` (26 columns containing sporadic pivot labels)

### 4. Data Types (Raw vs. Processed)
| Column | Raw Type | Target SQL Type | Description |
| :--- | :--- | :--- | :--- |
| `college_name` | `object` (string) | `VARCHAR(300)` | Full institution name |
| `score_type` | `object` (string) | `VARCHAR(50)` | Examination system (`MHT-CET`, `JEE(Main)`, `Merit`) |
| `seat_type` | `object` (string) | `VARCHAR(50)` | CAP quota category code (e.g. `GOPENS`, `TFWS`) |
| `branch` | `object` (string) | `VARCHAR(255)` | Engineering branch title |
| `sum` | `float64` | `DOUBLE PRECISION` | Sum of percentiles in cohort |
| `count` | `int64` | `INTEGER` | Number of admitted candidates in cohort |
| `max` | `float64` | `DOUBLE PRECISION` | Highest admitted percentile |
| `min` | `float64` | `DOUBLE PRECISION` | Lowest admitted percentile (Cutoff threshold) |
| `mean` | `float64` | `DOUBLE PRECISION` | Cohort average percentile |
| `max-min` | `float64` | `DOUBLE PRECISION` | Percentile spread between topper and cutoff |
| `max-mean` | `float64` | `DOUBLE PRECISION` | Spread between topper and cohort average |

### 5. Missing Values
- **Core Columns**: Exactly `0` missing values across all 28,377 rows.
  - `college_name`: 0 nulls (100% complete)
  - `score_type`: 0 nulls (100% complete)
  - `seat_type`: 0 nulls (100% complete)
  - `branch`: 0 nulls (100% complete)
  - `sum`: 0 nulls (100% complete)
  - `count`: 0 nulls (100% complete)
  - `max`: 0 nulls (100% complete)
  - `min`: 0 nulls (100% complete)
  - `mean`: 0 nulls (100% complete)
  - `max-min`: 0 nulls (100% complete)
  - `max-mean`: 0 nulls (100% complete)
- **Extraneous Columns (`Unnamed: 11` to `Unnamed: 36`)**: Missing in 28,343 to 28,377 rows (99.85%+ nulls).

### 6. Duplicate Records
- **Exact Full Row Duplicates**: `0`
- **Core 11 Columns Duplicates**: `0`
- **Primary Key Duplicates** on `(college_name, branch, seat_type, score_type)`: `0`
- *Conclusion*: Every single row in the dataset represents a distinct institutional quota allotment.

### 7. Unique Colleges
- **Count**: `326` unique engineering colleges.
- Covers government, autonomous, university departments, and private-unaided colleges across Maharashtra.

### 8. Unique Branches
- **Count**: `95` unique engineering disciplines.
- Top branches by frequency:
  1. *Computer Engineering*: 4,512 records
  2. *Electronics and Telecommunication Engg*: 4,299 records
  3. *Mechanical Engineering*: 3,235 records
  4. *Computer Science and Engineering*: 2,664 records
  5. *Electrical Engineering*: 2,587 records
  6. *Information Technology*: 2,500 records
  7. *Civil Engineering*: 2,275 records
  8. *Artificial Intelligence and Data Science*: 1,130 records

### 9. Unique Seat Types
- **Count**: `77` unique CAP seat categories.
- Includes Open categories (`GOPENS`, `GOPENH`, `GOPENO`, `LOPENS`, `LOPENH`, `LOPENO`), Reserved quotas (`OBC`, `SC`, `ST`, `VJNT`, `EWS`), Tuition Fee Waivers (`TFWS`), All India seats (`AI`), Minority seats (`MI`), Defence (`DEF`), and Persons with Disabilities (`PWD`).

### 10. Unique Score Types
- **Count**: `3` distinct examination channels:
  1. `MHT-CET`: **26,622 records** (93.82%)
  2. `JEE(Main)`: **1,540 records** (5.43%)
  3. `Merit`: **215 records** (0.76%)

### 11. Minimum, Maximum, and Mean Statistics
| Statistic | `min` (Cutoff) | `max` (Topper) | `mean` (Average) | `count` (Cohort) | `sum` | `max-min` | `max-mean` |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Count** | 28,377 | 28,377 | 28,377 | 28,377 | 28,377 | 28,377 | 28,377 |
| **Min** | 0.0047395 | 0.0047395 | 0.0047395 | 1 | 0.0047395 | 0.0000 | 0.0000 |
| **Max** | 99.843394 | 100.0000 | 99.910161 | 92 | 9076.7253 | 95.8622 | 66.9754 |
| **Mean** | 52.1030 | 59.9741 | 55.7749 | 3.6771 | 233.1077 | 7.8711 | 4.1992 |
| **Std Dev** | 28.7005 | 26.1643 | 26.5268 | 5.8079 | 451.5052 | 14.4269 | 7.8386 |
| **Median** | 55.2182 | 64.0609 | 58.5660 | 2 | 84.3826 | 0.0603 | 0.0282 |
| **25% (Q1)**| 26.9008 | 41.1873 | 34.3299 | 1 | 48.1420 | 0.0000 | 0.0000 |
| **75% (Q3)**| 76.9900 | 81.9734 | 78.3911 | 4 | 242.8884 | 9.1840 | 4.8823 |

### 12. Invalid or Suspicious Values
Programmatic assertion checks across all 28,377 rows:
- `count < 1`: **0 records** (All cohorts have at least 1 candidate)
- `min > max`: **0 records** (Zero cutoff inverted values)
- `mean outside [min, max]`: **0 records** (All means strictly lie within min and max)
- `negative scores`: **0 records**
- `scores > 100.0`: **0 records**
- `(max - min) != max-min`: **0 records** (Calculated spreads match exactly)
- `(sum / count) != mean`: **0 records** (Mean aligns with sum divided by count)

### 13. Inconsistent College Names
- **Whitespace Collisions**: 33 college names have irregular double spaces or trailing whitespace inside the institution title.
  - *Example 1*: `"Bhartiya Vidya Bhavan's Sardar Patel Institute  of Technology , Andheri, Mumbai"` (double space after `Institute`, space before comma).
  - *Example 2*: `"Alard  Charitable Trust's Alard College of Engineering and Management, Pune"`.
- *Pipeline Treatment*: Apply regex whitespace compaction `re.sub(r'\s+', ' ', text).strip()` and comma formatting to standardize all names deterministically.

### 14. Inconsistent Branch Names
- **Bracket Spacing Collision**:
  - `"Computer Science and Engineering (Cyber Security)"` vs. `"Computer Science and Engineering(Cyber Security)"`.
- *Pipeline Treatment*: Standardize spacing before parentheses deterministically to merge duplicate strings into a single canonical branch entity.

### 15. Inconsistent Seat-Type Names
- **Irregularities**: `0` whitespace issues. All 77 codes conform to official CET Cell notation.

### 16. Outliers & Distribution Extremes
- **Extremely Low Cutoffs (< 1.00 percentile)**: `329` records.
  - *Analysis*: These occur in Round 3/spot rounds in remote rural colleges or under-subscribed reserved quotas (e.g. `PWDOBCH`, `GSTO`). These are authentic government CAP round records and should **not** be purged.
- **Top Scores (100.00 percentile)**: `3` records (in COEP and VJTI Computer Engineering).
- **Single-Candidate Quotas (`count = 1`)**: `14,058` records.
  - *Analysis*: Standard in CAP seat matrices for special reservation quotas (Orphan, PWD, DEF) where only 1 seat is allotted per college/branch.
- **Large Cohorts (`count > 30`)**: `232` records (General State Level pools in large private universities).

### 17. Unusable Records
- **Corrupted / Unusable Records in Core Data**: **`0`**
- All 28,377 rows contain valid, verifiable institutional cutoff data.
- The 26 `Unnamed` columns are dropped cleanly during ingestion.

---

## Action Plan for Reusable Data Pipeline

1. **Extraction**:
   - Read sheet `'Sheet'` of `college_data_cleaned.xlsx` using Pandas.
2. **Column Pruning**:
   - Retain only the 11 verified core columns; drop extraneous `Unnamed: 11` to `36`.
3. **Deterministic Text Normalization**:
   - Standardize college names by collapsing multiple spaces and normalizing punctuation spacing.
   - Standardize branch names by normalizing bracket spacing.
   - Clean seat types and score types.
4. **Enrichment**:
   - Deterministically derive `district`, `city`, and `region` for all 326 colleges.
   - Categorize branches into 6 canonical engineering faculties.
   - Deconstruct seat types into `category`, `quota_scope`, and `gender`.
5. **Validation**:
   - Ensure 0 missing values in mandatory columns.
   - Assert all percentiles lie in $[0.0, 100.0]$.
   - Assert `min <= mean <= max` and `count >= 1`.
6. **Export**:
   - Write clean, normalized CSV (`data/processed/college_cutoffs_clean.csv`) and relational dimension tables ready for PostgreSQL / Supabase ingestion.
