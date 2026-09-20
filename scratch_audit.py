import os
import re
import json
import pandas as pd
import numpy as np

file_path = r"e:\E-Dive\College Predictor\data\college_data_cleaned.xlsx"
audit_out_path = r"e:\E-Dive\College Predictor\data_audit_results.json"

print(f"Loading {file_path} for detailed audit...")
xl = pd.ExcelFile(file_path)
print(f"Sheet names found: {xl.sheet_names}")

# Check both sheets
sheet_stats = {}
for s in xl.sheet_names:
    sdf = xl.parse(s)
    sheet_stats[s] = {"shape": list(sdf.shape), "columns": list(sdf.columns)[:15]}
    print(f"Sheet '{s}': Shape {sdf.shape}")

# Active sheet
active_sheet = 'Sheet' if 'Sheet' in xl.sheet_names and xl.parse('Sheet').shape[0] > 0 else xl.sheet_names[0]
df = xl.parse(active_sheet)

print(f"\nAnalyzing active sheet: '{active_sheet}' with {len(df)} rows and {len(df.columns)} columns.")

# 1. Number of rows
n_rows = int(df.shape[0])

# 2. Number of columns
n_cols = int(df.shape[1])

# 3. Column names
col_names = list(df.columns)

# 4. Data types
dtypes = {col: str(df[col].dtype) for col in df.columns}

# 5. Missing values
missing_counts = {col: int(df[col].isnull().sum()) for col in df.columns}

# 6. Duplicate records
# In entire dataframe
dups_all = int(df.duplicated().sum())

# In core 11 columns
core_cols = ['college_name', 'score_type', 'seat_type', 'branch', 'sum', 'count', 'max', 'min', 'mean', 'max-min', 'max-mean']
core_available = [c for c in core_cols if c in df.columns]
dups_core = int(df.duplicated(subset=core_available).sum()) if core_available else 0

# Duplicates on primary natural key: (college_name, branch, seat_type, score_type)
key_cols = ['college_name', 'branch', 'seat_type', 'score_type']
dups_key = int(df.duplicated(subset=key_cols, keep=False).sum()) if all(k in df.columns for k in key_cols) else 0

# 7. Unique colleges
unique_colleges = sorted(df['college_name'].dropna().unique().tolist()) if 'college_name' in df.columns else []

# 8. Unique branches
unique_branches = sorted(df['branch'].dropna().unique().tolist()) if 'branch' in df.columns else []

# 9. Unique seat types
unique_seat_types = sorted(df['seat_type'].dropna().unique().tolist()) if 'seat_type' in df.columns else []

# 10. Unique score types
unique_score_types = sorted(df['score_type'].dropna().unique().tolist()) if 'score_type' in df.columns else []

# 11. Min/max/mean statistics for numerical columns
num_cols = ['sum', 'count', 'max', 'min', 'mean', 'max-min', 'max-mean']
num_stats = {}
for nc in num_cols:
    if nc in df.columns:
        s = df[nc]
        num_stats[nc] = {
            "count": int(s.count()),
            "min": float(s.min()),
            "max": float(s.max()),
            "mean": float(s.mean()),
            "std": float(s.std()),
            "median": float(s.median()),
            "q25": float(s.quantile(0.25)),
            "q75": float(s.quantile(0.75))
        }

# 12. Invalid or suspicious values
suspicious = {
    "count_less_than_1": int((df['count'] < 1).sum()) if 'count' in df.columns else 0,
    "min_greater_than_max": int((df['min'] > df['max']).sum()) if ('min' in df.columns and 'max' in df.columns) else 0,
    "mean_outside_min_max": int(((df['mean'] < df['min'] - 1e-4) | (df['mean'] > df['max'] + 1e-4)).sum()) if all(c in df.columns for c in ['mean', 'min', 'max']) else 0,
    "score_negative": int(((df['min'] < 0) | (df['max'] < 0)).sum()) if ('min' in df.columns and 'max' in df.columns) else 0,
    "score_above_100": int(((df['min'] > 100.0) | (df['max'] > 100.0)).sum()) if ('min' in df.columns and 'max' in df.columns) else 0,
    "max_min_diff_mismatch": int((np.abs((df['max'] - df['min']) - df['max-min']) > 1e-3).sum()) if all(c in df.columns for c in ['max', 'min', 'max-min']) else 0,
    "sum_count_mean_mismatch": int((np.abs((df['sum'] / df['count']) - df['mean']) > 0.05).sum()) if all(c in df.columns for c in ['sum', 'count', 'mean']) else 0
}

# 13. Inconsistent college names
# e.g., leading/trailing whitespace, multiple spaces, duplicate canonical forms
cleaned_colleges = [re.sub(r'\s+', ' ', str(c).strip()) for c in unique_colleges]
college_whitespace_issues = [c for c in unique_colleges if c != re.sub(r'\s+', ' ', str(c).strip())]

# 14. Inconsistent branch names
branch_whitespace_issues = [b for b in unique_branches if b != re.sub(r'\s+', ' ', str(b).strip())]
# Check close variants (like brackets vs without brackets, spacing)
branch_variants = {}
for b in unique_branches:
    norm = re.sub(r'[\s\(\)\-_/]+', '', b.lower())
    branch_variants.setdefault(norm, []).append(b)
branch_naming_variants = {k: v for k, v in branch_variants.items() if len(v) > 1}

# 15. Inconsistent seat-type names
seat_type_whitespace = [st for st in unique_seat_types if st != st.strip()]

# 16. Outliers
# Check extreme percentile cutoffs (e.g. min < 1.0 or count > 50)
outliers = {
    "extremely_low_cutoffs_under_1_percentile": int((df['min'] < 1.0).sum()) if 'min' in df.columns else 0,
    "perfect_100_percentiles": int((df['max'] == 100.0).sum()) if 'max' in df.columns else 0,
    "high_seat_counts_over_30": int((df['count'] > 30).sum()) if 'count' in df.columns else 0,
    "single_seat_allotments_count_1": int((df['count'] == 1).sum()) if 'count' in df.columns else 0
}

# 17. Unreliable records
# Are there records with NaN in essential fields or corrupt values?
unreliable_missing = int(df[core_available].isnull().any(axis=1).sum()) if core_available else 0

# Check Unnamed columns content
unnamed_cols = [c for c in df.columns if c.startswith("Unnamed")]
unnamed_non_null = {c: int(df[c].notnull().sum()) for c in unnamed_cols}

audit_summary = {
    "num_rows": n_rows,
    "num_cols": n_cols,
    "col_names": col_names,
    "dtypes": dtypes,
    "missing_counts": missing_counts,
    "dups_all": dups_all,
    "dups_core": dups_core,
    "dups_key": dups_key,
    "unique_colleges_count": len(unique_colleges),
    "unique_branches_count": len(unique_branches),
    "unique_seat_types_count": len(unique_seat_types),
    "unique_score_types": unique_score_types,
    "score_type_counts": df['score_type'].value_counts().to_dict() if 'score_type' in df.columns else {},
    "num_stats": num_stats,
    "suspicious": suspicious,
    "college_whitespace_issues_count": len(college_whitespace_issues),
    "college_whitespace_issues": college_whitespace_issues[:10],
    "branch_whitespace_issues_count": len(branch_whitespace_issues),
    "branch_naming_variants": branch_naming_variants,
    "seat_type_whitespace_count": len(seat_type_whitespace),
    "outliers": outliers,
    "unreliable_missing": unreliable_missing,
    "unnamed_cols_count": len(unnamed_cols),
    "unnamed_non_null": unnamed_non_null
}

with open(audit_out_path, "w", encoding="utf-8") as f:
    json.dump(audit_summary, f, indent=2)

print("\nAudit completed and saved to:", audit_out_path)
