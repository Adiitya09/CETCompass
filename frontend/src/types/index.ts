export interface CollegeBase {
  id: number;
  name: string;
  slug: string;
  code?: string;
  district: string;
  city: string;
  region: string;
  status: string;
}

export interface CollegeListItem extends CollegeBase {
  branches_count: number;
  min_overall_cutoff?: number;
  max_overall_cutoff?: number;
}

export interface CutoffSummary {
  id: number;
  branch_id: number;
  branch_name: string;
  branch_category: string;
  seat_type_id: number;
  seat_type_code: string;
  seat_type_description: string;
  score_type: string;
  min_cutoff: number;
  mean_cutoff: number;
  max_cutoff: number;
  count: number;
  range_cutoff: number;
}

export interface CollegeDetail extends CollegeBase {
  cutoffs: CutoffSummary[];
  available_branches: string[];
  available_seat_types: string[];
}

export interface ComparisonBranchStat {
  branch_name: string;
  category: string;
  seat_type: string;
  min_cutoff: number;
  mean_cutoff: number;
  max_cutoff: number;
  range_cutoff: number;
  count: number;
}

export interface ComparisonCollegeItem extends CollegeBase {
  total_branches: number;
  total_offered_branches?: number;
  available_seat_types?: string[];
  min_cutoff_overall?: number | null;
  mean_cutoff_overall?: number | null;
  max_cutoff_overall?: number | null;
  range_cutoff_overall?: number | null;
  branches: ComparisonBranchStat[];
}

export interface CollegeComparisonResponse {
  colleges: ComparisonCollegeItem[];
  comparison_params: {
    college_ids: number[];
    seat_type: string;
    score_type: string;
  };
}

export interface BranchItem {
  id: number;
  name: string;
  slug: string;
  category: string;
  colleges_count: number;
}

export interface BranchListResponse {
  total: number;
  categories: string[];
  grouped: Record<string, BranchItem[]>;
  all_branches: BranchItem[];
}

export interface SeatTypeItem {
  id: number;
  code: string;
  category: string;
  quota_scope: string;
  gender: string;
  description: string;
}

export interface SeatTypeListResponse {
  total: number;
  categories: string[];
  grouped: Record<string, SeatTypeItem[]>;
  all_seat_types: SeatTypeItem[];
}

export interface DistrictLocationItem {
  district: string;
  region: string;
  colleges_count: number;
}

export interface LocationListResponse {
  total_districts: number;
  districts: DistrictLocationItem[];
  regions: Record<string, string[]>;
}

export interface CollegeListParams {
  q?: string;
  district?: string;
  region?: string;
  branch?: string;
  seat_type?: string;
  status?: string;
  sort_by?: string;
  sort_order?: string;
  page?: number;
  page_size?: number;
}

export interface CollegeListResponse {
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  data: CollegeListItem[];
}

export interface PredictionItem {
  college?: string;
  branch?: string;
  seat_type?: string;
  student_percentile?: number;
  historical_min?: number;
  historical_max?: number;
  historical_mean?: number;
  cutoff_gap?: number;
  category?: "SAFE" | "MODERATE" | "REACH";
  explanation?: string;

  college_id: number;
  college_name: string;
  college_slug: string;
  district: string;
  city: string;
  region: string;
  branch_id: number;
  branch_name: string;
  branch_category: string;
  seat_type_code: string;
  seat_type_description: string;
  score_type: string;
  min_cutoff: number;
  mean_cutoff: number;
  max_cutoff: number;
  count: number;
  range_cutoff: number;
  delta: number;
  classification: "Safe" | "Moderate" | "Reach";
  recommendation_score: number;
  admission_chance_label: string;
}

export interface PredictSummary {
  total_matches: number;
  safe_count: number;
  moderate_count: number;
  reach_count: number;
  user_percentile: number;
  score_type: string;
  seat_type: string;
}

export interface PredictResponse {
  summary: PredictSummary;
  disclaimer: string;
  results: PredictionItem[];
  page: number;
  page_size: number;
  total_pages: number;
}

export interface PredictRequest {
  percentile: number;
  score_type: string;
  seat_type: string;
  preferred_branches?: string[];
  preferred_categories?: string[];
  preferred_districts?: string[];
  preferred_regions?: string[];
  classification?: string;
  reach_buffer?: number;
  sort_by?: string;
  page?: number;
  page_size?: number;
}

export interface SystemStats {
  colleges_count: number;
  branches_count: number;
  seat_types_count: number;
  cutoff_records_count: number;
  districts_count: number;
  last_ingested_at?: string;
  dataset_filename: string;
}

export interface SavedCollege {
  id: number;
  user_id: string;
  college_id: number;
  college_name: string;
  college_slug: string;
  district: string;
  branch_id?: number;
  branch_name?: string;
  notes?: string;
  created_at: string;
}

export interface PredictionHistoryItem {
  id: number;
  percentile: number;
  score_type: string;
  seat_type: string;
  preferred_branches?: string[];
  preferred_locations?: string[];
  total_matches: number;
  safe_count: number;
  moderate_count: number;
  reach_count: number;
  recommendations?: PredictionItem[];
  created_at: string;
}

export interface PredictionHistoryCreate {
  percentile: number;
  score_type: string;
  seat_type: string;
  preferred_branches?: string[];
  preferred_locations?: string[];
  total_matches: number;
  safe_count: number;
  moderate_count: number;
  reach_count: number;
  recommendations?: PredictionItem[];
}


export interface SearchCollegeItem {
  id: number;
  name: string;
  slug: string;
  code?: string;
  city: string;
  district: string;
  region: string;
  status: string;
}

export interface SearchBranchItem {
  id: number;
  name: string;
  slug: string;
  category: string;
}

export interface SearchDistrictItem {
  district: string;
  region: string;
  colleges_count: number;
}

export interface SearchResponse {
  query: string;
  total_matches: number;
  colleges: SearchCollegeItem[];
  branches: SearchBranchItem[];
  locations: SearchDistrictItem[];
}

export interface AdminStatistics {
  colleges_count: number;
  branches_count: number;
  seat_types_count: number;
  cutoff_records_count: number;
  districts_count: number;
  users_count: number;
  saved_colleges_count: number;
  predictions_count: number;
  score_types_distribution: Record<string, number>;
  regions_distribution: Record<string, number>;
  dataset_metadata?: {
    id: number;
    filename: string;
    total_records: number;
    ingested_at?: string;
    status: string;
  };
}

export interface DataQualityIndicators {
  total_active_records: number;
  completeness_score: number;
  checks_passed: boolean;
  score_integrity: {
    mht_cet_out_of_bounds: number;
    negative_scores: number;
    score_system?: string;
  };
  spread_sanity: {
    min_greater_than_max: number;
    invalid_mean_spread: number;
    range_integrity?: string;
  };
  missingness_rates: {
    null_colleges: number;
    null_branches: number;
    null_seat_types: number;
  };
  orphaned_records: {
    orphaned_count: number;
    orphaned_colleges?: number;
    orphaned_branches?: number;
    orphaned_seat_types?: number;
  };
  audit_summary: string;
}

export interface ValidationErrorItem {
  row: number;
  column: string;
  value?: string | null;
  error: string;
  severity: "ERROR" | "WARNING";
}

export interface FileValidationResult {
  valid: boolean;
  filename: string;
  file_size_bytes: number;
  file_type: string;
  total_rows: number;
  valid_rows: number;
  error_count: number;
  warning_count: number;
  errors: ValidationErrorItem[];
  preview_rows: Array<{
    college_name: string;
    branch: string;
    seat_type: string;
    score_type: string;
    min: number;
    mean: number;
    max: number;
    count: number;
  }>;
  detected_colleges: number;
  detected_branches: number;
  detected_seat_types: number;
  staged_file_id?: string | null;
  message: string;
}

export interface ImportHistoryLog {
  id: number;
  filename: string;
  file_size_bytes?: number | null;
  total_records: number;
  valid_rows: number;
  error_count: number;
  colleges_count: number;
  branches_count: number;
  seat_types_count: number;
  status: "SUCCESS" | "FAILED" | "ROLLED_BACK" | "PROCESSING";
  error_summary?: string | null;
  imported_by?: string | null;
  created_at: string;
}

export interface UserAuth {
  userId: string;
  role: "student" | "guest" | "admin";
  name: string;
  adminKey?: string;
}

export interface AdminImportStats {
  total_records?: number;
  colleges_count?: number;
  branches_count?: number;
  seat_types_count?: number;
  [key: string]: string | number | boolean | undefined;
}

export interface AdminImportResponse {
  success: boolean;
  message: string;
  import_id?: number;
  stats: AdminImportStats;
}


