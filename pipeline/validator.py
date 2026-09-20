import logging
import pandas as pd
import numpy as np
from typing import List, Dict, Any

logger = logging.getLogger("DataPipeline")

REQUIRED_RAW_COLUMNS = [
    'college_name', 'score_type', 'seat_type', 'branch',
    'sum', 'count', 'max', 'min', 'mean', 'max-min', 'max-mean'
]

def validate_raw_dataframe(df: pd.DataFrame) -> bool:
    """
    Validates structural integrity of raw dataset before processing.
    """
    logger.info("Validating raw DataFrame...")
    
    # 1. Check required columns
    missing_cols = [c for c in REQUIRED_RAW_COLUMNS if c not in df.columns]
    if missing_cols:
        raise ValueError(f"Raw dataset is missing required columns: {missing_cols}")
    
    # 2. Check total row count
    if len(df) == 0:
        raise ValueError("Raw dataset is empty.")
    
    # 3. Check for null values in core columns
    null_counts = df[REQUIRED_RAW_COLUMNS].isnull().sum()
    if null_counts.sum() > 0:
        bad_cols = null_counts[null_counts > 0].to_dict()
        raise ValueError(f"Null values detected in core columns: {bad_cols}")
    
    logger.info(f"Raw validation passed: {len(df)} rows and all {len(REQUIRED_RAW_COLUMNS)} core columns present.")
    return True

def validate_processed_dataframe(df: pd.DataFrame, expected_row_count: int) -> Dict[str, Any]:
    """
    Validates processed DataFrame ensuring zero row loss, bounded ranges, and mathematical consistency.
    """
    logger.info("Validating processed DataFrame...")
    
    # 1. Row count preservation
    actual_rows = len(df)
    if actual_rows != expected_row_count:
        raise AssertionError(f"Row count mismatch! Expected {expected_row_count}, but processed DataFrame has {actual_rows}.")
    
    # 2. Score bounds check (0.0 to 100.0)
    for col in ['cutoff_min', 'cutoff_mean', 'cutoff_max']:
        if col in df.columns:
            out_of_bounds = ((df[col] < 0.0) | (df[col] > 100.0)).sum()
            if out_of_bounds > 0:
                raise AssertionError(f"Found {out_of_bounds} values outside [0.0, 100.0] in column '{col}'.")

    # 3. Relational integrity: cutoff_min <= cutoff_mean <= cutoff_max
    if all(c in df.columns for c in ['cutoff_min', 'cutoff_mean', 'cutoff_max']):
        inverted = ((df['cutoff_min'] > df['cutoff_max']) | 
                    (df['cutoff_mean'] < df['cutoff_min'] - 1e-4) | 
                    (df['cutoff_mean'] > df['cutoff_max'] + 1e-4)).sum()
        if inverted > 0:
            raise AssertionError(f"Found {inverted} records where min <= mean <= max relation is violated.")

    # 4. Cohort size check
    if 'admitted_count' in df.columns:
        invalid_counts = (df['admitted_count'] < 1).sum()
        if invalid_counts > 0:
            raise AssertionError(f"Found {invalid_counts} records with admitted_count < 1.")

    # 5. Null checks across all processed columns
    null_cols = df.isnull().sum()
    if null_cols.sum() > 0:
        bad_nulls = null_cols[null_cols > 0].to_dict()
        raise AssertionError(f"Unexpected null values found in processed DataFrame: {bad_nulls}")

    # 6. Primary key duplicate check
    key_cols = ['college_name', 'branch_name', 'seat_type', 'score_type']
    if all(k in df.columns for k in key_cols):
        dups = df.duplicated(subset=key_cols).sum()
        if dups > 0:
            logger.warning(f"Detected {dups} duplicate records on natural key {key_cols}.")

    logger.info("Processed DataFrame validation passed: zero row loss, bounded ranges, complete relational integrity.")
    return {
        "status": "PASSED",
        "rows_validated": actual_rows,
        "null_count": int(null_cols.sum()),
        "bounds_verified": True,
        "relations_verified": True
    }
