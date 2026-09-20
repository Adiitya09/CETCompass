# Production Deployment Guide: College Predictor

This guide provides step-by-step instructions for deploying the College Predictor application to production across:
- **Database**: Supabase (Managed PostgreSQL)
- **Backend API**: Render (FastAPI ASGI Web Service)
- **Frontend App**: Vercel (Next.js 16 App Router)

---

## Architecture Overview

```mermaid
graph LR
    User[Client Browser] -->|HTTPS| Vercel[Vercel: Next.js Frontend]
    User -->|Supabase Auth| SupabaseAuth[Supabase Auth Service]
    Vercel -->|REST API Requests| Render[Render: FastAPI Backend]
    Render -->|SQLAlchemy Connection Pool| SupabaseDB[(Supabase PostgreSQL)]
```

---

## Step 1: Supabase Setup (PostgreSQL Database & Auth)

### 1.1 Create Supabase Project
1. Log in to [Supabase](https://supabase.com).
2. Click **New Project**.
3. Fill in:
   - **Name**: `college-predictor`
   - **Database Password**: Generate and securely store a strong password.
   - **Region**: Choose the region closest to your users (e.g., `South Asia (Mumbai)` or `ap-south-1`).
4. Wait 1–2 minutes for the database instance to provision.

### 1.2 Retrieve Credentials
From the Supabase Project Dashboard:
1. Navigate to **Project Settings** > **Database**:
   - Under **Connection string**, select **URI**.
   - Copy the URI. It will look like:
     ```
     postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
     ```
   - For serverless connection pooling, copy the **Transaction Pooler** URI (port `6543`) or **Session Pooler** (port `5432`):
     ```
     postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
     ```
2. Navigate to **Project Settings** > **API**:
   - Copy the **Project URL**: `https://[PROJECT-REF].supabase.co`
   - Copy the **anon public** key: `eyJhbG...`
   - Under **JWT Settings**, copy the **JWT Secret**: `[YOUR-JWT-SECRET]`

---

## Step 2: Database Migration & Seeding

You have two simple options to provision the 326 colleges, 94 branches, 77 seat types, and 28,377 cutoff records.

### Option A: Automated CLI Seed (Recommended)
From your local terminal with the repository checked out:
1. Set the temporary `DATABASE_URL` environment variable:
   ```bash
   # Windows PowerShell
   $env:DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"
   python database/seed_database.py
   python database/verify_database.py
   ```
2. The seed script is completely idempotent:
   - It verifies schema tables.
   - It ingests all dimension records.
   - It loads all 28,377 cutoff records.
   - It performs all 6 mathematical, relational, and domain invariant checks.

### Option B: Supabase SQL Editor
1. In the Supabase Dashboard, open the **SQL Editor**.
2. Paste and run the contents of [`database/migrations/001_initial_schema.sql`](database/migrations/001_initial_schema.sql).
3. Then execute `python database/seed_database.py` to populate data.

---

## Step 3: GitHub Repository Preparation

1. Initialize Git if not already done:
   ```bash
   git init
   git branch -M main
   ```
2. Verify that sensitive files are excluded:
   ```bash
   git status
   ```
   *Ensure `.env`, `college_predictor.db`, and `__pycache__` are NOT listed in untracked files.*
3. Commit and push:
   ```bash
   git add .
   git commit -m "chore: prepare repository for production deployment"
   git remote add origin https://github.com/[YOUR-USERNAME]/college-predictor.git
   git push -u origin main
   ```

---

## Step 4: Render Backend Deployment (FastAPI)

### 4.1 Create Web Service
1. Log in to [Render](https://render.com).
2. Click **New +** > **Web Service**.
3. Connect your GitHub repository: `college-predictor`.
4. Configure the service settings:
   - **Name**: `college-predictor-api`
   - **Region**: Same region as Supabase (e.g., `Singapore` or `Frankfurt/Oregon`).
   - **Branch**: `main`
   - **Root Directory**: Leave blank (repository root).
   - **Runtime**: `Python`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn backend.app.main:app --host 0.0.0.0 --port $PORT`
   - **Plan**: `Free` or `Starter`

### 4.2 Configure Environment Variables in Render
In the **Environment Variables** tab of the service, add:

| Key | Example Value / Purpose |
|---|---|
| `PYTHON_VERSION` | `3.12.8` |
| `ENVIRONMENT` | `production` |
| `LOG_LEVEL` | `INFO` |
| `DATABASE_URL` | `postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres` |
| `ADMIN_API_KEY` | `[GENERATE_A_STRONG_RANDOM_KEY]` |
| `JWT_SECRET` | `[GENERATE_A_STRONG_SECRET]` |
| `SUPABASE_URL` | `https://[PROJECT-REF].supabase.co` |
| `SUPABASE_ANON_KEY` | `[SUPABASE_ANON_KEY]` |
| `SUPABASE_JWT_SECRET` | `[SUPABASE_JWT_SECRET]` |
| `CORS_ORIGINS` | `https://your-app.vercel.app` *(update after Vercel deploy)* |
| `FRONTEND_URL` | `https://your-app.vercel.app` *(update after Vercel deploy)* |

### 4.3 Verify Backend Deployment
Once Render deployment is live (usually 2–3 minutes):
1. Test Health Check:
   ```bash
   curl https://college-predictor-api.onrender.com/api/health
   # Expected: {"status":"healthy","version":"1.0.0","database":"connected"}
   ```
2. Test Database Connectivity Check:
   ```bash
   curl https://college-predictor-api.onrender.com/api/health/db
   # Expected: {"status":"healthy","database":"connected","dialect":"postgresql"}
   ```
3. Test API Docs:
   Navigate in browser to: `https://college-predictor-api.onrender.com/docs`

---

## Step 5: Vercel Frontend Deployment (Next.js)

### 5.1 Import Project to Vercel
1. Log in to [Vercel](https://vercel.com).
2. Click **Add New...** > **Project**.
3. Import the `college-predictor` GitHub repository.
4. In the **Configure Project** screen:
   - **Project Name**: `college-predictor`
   - **Framework Preset**: `Next.js`
   - **Root Directory**: Click **Edit** and select **`frontend`**.

### 5.2 Configure Environment Variables in Vercel
Expand **Environment Variables** and add:

| Key | Value |
|---|---|
| `NEXT_PUBLIC_API_URL` | `https://college-predictor-api.onrender.com/api` |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://[PROJECT-REF].supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `[SUPABASE_ANON_KEY]` |

5. Click **Deploy**. Vercel will build and assign a URL: `https://college-predictor.vercel.app`.

---

## Step 6: Connect Frontend & Configure CORS

1. Copy your Vercel deployment URL (e.g., `https://college-predictor.vercel.app`).
2. Return to the **Render Dashboard** for `college-predictor-api`:
   - Open **Environment Variables**.
   - Update:
     - `CORS_ORIGINS`: `https://college-predictor.vercel.app`
     - `FRONTEND_URL`: `https://college-predictor.vercel.app`
   - Save changes. Render will automatically perform a zero-downtime rolling restart.
3. In the **Supabase Dashboard**:
   - Navigate to **Authentication** > **URL Configuration**.
   - Add `https://college-predictor.vercel.app` to **Site URL** and **Redirect URLs**.

---

## Step 7: Post-Deployment Verification Checklist

Verify each of the following in production:

- [ ] **Home Page**: `https://college-predictor.vercel.app/` loads with clean styling and dynamic college stats.
- [ ] **Predictor**: Submit percentile `95.5`, `MHT-CET`, `GOPENS`. Verify recommendations populate with classification badges (Safe/Moderate/Reach).
- [ ] **Results Filter**: Filter results by branch and district.
- [ ] **Colleges Directory**: `https://college-predictor.vercel.app/colleges` lists colleges with pagination and search.
- [ ] **College Detail**: View `/colleges/[id]` or `/colleges/coep-technological-university` to inspect historical cutoffs and seat distribution.
- [ ] **Compare Tray & Page**: Select up to 3 colleges, verify sticky compare tray, and navigate to `/compare`.
- [ ] **Student Auth**: Sign in / register with test email.
- [ ] **Dashboard**: Verify saved colleges and prediction history persist.
- [ ] **Admin Dashboard**: `/admin` authenticates with `ADMIN_API_KEY` and loads platform metrics and data quality indicators.

---

## Step 8: Troubleshooting

| Issue | Likely Cause | Solution |
|---|---|---|
| `NoSuchModuleError: postgres` | `DATABASE_URL` starts with `postgres://` | Backend automatically normalizes `postgres://` to `postgresql://`. Verify format. |
| `CORS Error in Browser` | Origin mismatch | Ensure `CORS_ORIGINS` on Render contains exact Vercel URL without trailing slash. Note: regex `^https://.*\.vercel\.app$` is pre-configured. |
| Render Free Tier Cold Start (50s delay) | Service sleeps after 15 minutes of inactivity | Use UptimeRobot or health check ping on `https://.../api/health` every 10 minutes, or upgrade to Starter plan. |
| `Network Error: Unable to connect` | Wrong API base URL | Verify `NEXT_PUBLIC_API_URL` has `/api` suffix (e.g., `https://api.domain.com/api`). |
| Database connection pool timeout | Exceeded Supabase connections | Use Supabase Transaction Pooler connection string (`port 6543`) in `DATABASE_URL`. |
