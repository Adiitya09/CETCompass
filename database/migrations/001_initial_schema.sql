-- ====================================================================
-- PostgreSQL Schema Migration: 001_initial_schema.sql
-- Project: College Predictor (Maharashtra MHT-CET / JEE Main Admissions)
-- Compatible with: PostgreSQL 14+, Supabase PostgreSQL
-- ====================================================================

-- 1. COLLEGES TABLE
CREATE TABLE IF NOT EXISTS colleges (
    id SERIAL PRIMARY KEY,
    name VARCHAR(300) NOT NULL,
    slug VARCHAR(320) NOT NULL,
    code VARCHAR(50) NULL,
    district VARCHAR(100) NOT NULL,
    city VARCHAR(100) NOT NULL,
    region VARCHAR(100) NOT NULL,
    status VARCHAR(100) DEFAULT 'Autonomous / Affiliated' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_colleges_name UNIQUE (name),
    CONSTRAINT uq_colleges_slug UNIQUE (slug)
);

CREATE INDEX IF NOT EXISTS idx_colleges_district ON colleges(district);
CREATE INDEX IF NOT EXISTS idx_colleges_region ON colleges(region);
CREATE INDEX IF NOT EXISTS idx_colleges_city ON colleges(city);
CREATE INDEX IF NOT EXISTS idx_colleges_code ON colleges(code);

-- 2. BRANCHES TABLE
CREATE TABLE IF NOT EXISTS branches (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(270) NOT NULL,
    category VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_branches_name UNIQUE (name),
    CONSTRAINT uq_branches_slug UNIQUE (slug)
);

CREATE INDEX IF NOT EXISTS idx_branches_category ON branches(category);

-- 3. SEAT TYPES TABLE
CREATE TABLE IF NOT EXISTS seat_types (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) NOT NULL,
    category VARCHAR(50) NOT NULL,
    quota_scope VARCHAR(50) NOT NULL,
    gender VARCHAR(20) NOT NULL,
    description TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_seat_types_code UNIQUE (code)
);

CREATE INDEX IF NOT EXISTS idx_seat_types_category ON seat_types(category);
CREATE INDEX IF NOT EXISTS idx_seat_types_quota_scope ON seat_types(quota_scope);

-- 4. CUTOFF RECORDS TABLE (Historical & Multi-Year Scalable)
CREATE TABLE IF NOT EXISTS cutoff_records (
    id SERIAL PRIMARY KEY,
    college_id INTEGER NOT NULL REFERENCES colleges(id) ON DELETE CASCADE,
    branch_id INTEGER NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    seat_type_id INTEGER NOT NULL REFERENCES seat_types(id) ON DELETE CASCADE,
    academic_year VARCHAR(20) DEFAULT '2024-2025' NOT NULL,
    round_number INTEGER DEFAULT 1 NOT NULL,
    score_type VARCHAR(50) NOT NULL,
    min_cutoff DOUBLE PRECISION NOT NULL,
    mean_cutoff DOUBLE PRECISION NOT NULL,
    max_cutoff DOUBLE PRECISION NOT NULL,
    range_cutoff DOUBLE PRECISION NOT NULL,
    sum_score DOUBLE PRECISION NOT NULL,
    count INTEGER NOT NULL,
    max_mean_diff DOUBLE PRECISION NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_cutoff_entry UNIQUE (college_id, branch_id, seat_type_id, score_type, academic_year, round_number)
);

-- Optimized composite indexes for prediction queries and analytics
CREATE INDEX IF NOT EXISTS idx_cutoffs_pred_lookup ON cutoff_records(score_type, seat_type_id, min_cutoff);
CREATE INDEX IF NOT EXISTS idx_cutoffs_college_branch ON cutoff_records(college_id, branch_id);
CREATE INDEX IF NOT EXISTS idx_cutoffs_year_score ON cutoff_records(academic_year, score_type);
CREATE INDEX IF NOT EXISTS idx_cutoffs_min ON cutoff_records(min_cutoff);

-- 5. USERS TABLE
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(255) PRIMARY KEY, -- Supabase Auth User UUID or Guest Token
    email VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NULL,
    role VARCHAR(50) DEFAULT 'student' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_users_email UNIQUE (email)
);

CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- 6. SAVED COLLEGES TABLE (Shortlists)
CREATE TABLE IF NOT EXISTS saved_colleges (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    college_id INTEGER NOT NULL REFERENCES colleges(id) ON DELETE CASCADE,
    branch_id INTEGER NULL REFERENCES branches(id) ON DELETE SET NULL,
    notes TEXT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_user_saved_college_branch UNIQUE (user_id, college_id, branch_id)
);

CREATE INDEX IF NOT EXISTS idx_saved_colleges_user ON saved_colleges(user_id);

-- 7. PREDICTION HISTORY TABLE
CREATE TABLE IF NOT EXISTS prediction_history (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NULL REFERENCES users(id) ON DELETE CASCADE,
    percentile DOUBLE PRECISION NOT NULL,
    score_type VARCHAR(50) NOT NULL,
    seat_type VARCHAR(50) NOT NULL,
    preferred_branches TEXT NULL,
    preferred_locations TEXT NULL,
    total_matches INTEGER DEFAULT 0 NOT NULL,
    safe_count INTEGER DEFAULT 0 NOT NULL,
    moderate_count INTEGER DEFAULT 0 NOT NULL,
    reach_count INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pred_history_user ON prediction_history(user_id);
CREATE INDEX IF NOT EXISTS idx_pred_history_created ON prediction_history(created_at);

-- 8. DATASET METADATA TABLE
CREATE TABLE IF NOT EXISTS dataset_metadata (
    id SERIAL PRIMARY KEY,
    filename VARCHAR(255) NOT NULL,
    academic_year VARCHAR(50) DEFAULT '2024-2025' NOT NULL,
    total_records INTEGER NOT NULL,
    colleges_count INTEGER NOT NULL,
    branches_count INTEGER NOT NULL,
    seat_types_count INTEGER NOT NULL,
    checksum VARCHAR(64) NULL,
    status VARCHAR(50) DEFAULT 'active' NOT NULL,
    ingested_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
