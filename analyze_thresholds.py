import pandas as pd
import numpy as np

df = pd.read_csv(r"e:\E-Dive\College Predictor\data\processed\college_cutoffs_clean.csv")

print("Cutoff range distribution:")
print(df['cutoff_range'].describe(percentiles=[0.1, 0.25, 0.5, 0.75, 0.9]))

# Check count distribution
print("\nCohort count distribution:")
print(df['admitted_count'].describe(percentiles=[0.1, 0.25, 0.5, 0.75, 0.9]))

# Analyze score spreads for key branches (e.g. Computer Engineering in Pune & Mumbai)
comp_pune = df[(df['branch_name'] == 'Computer Engineering') & (df['district'] == 'Pune') & (df['seat_type'] == 'GOPENS')]
print(f"\nPune Computer Engineering GOPENS count: {len(comp_pune)}")
print(comp_pune[['college_name', 'cutoff_min', 'cutoff_mean', 'cutoff_max', 'cutoff_range', 'admitted_count']].head(10))
