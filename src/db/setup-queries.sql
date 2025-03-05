-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Companies table
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  logo_url TEXT,
  job_board_url TEXT NOT NULL,
  job_board_type TEXT NOT NULL, -- 'ashby' or 'greenhouse'
  board_identifier TEXT NOT NULL, -- JOB_BOARD_NAME or company_name from API
  industry TEXT,
  last_updated TIMESTAMP WITH TIME ZONE,
  total_jobs_count INTEGER DEFAULT 0,
  previous_jobs_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT DEFAULT 'active'
);

-- Industries table
CREATE TABLE IF NOT EXISTS industries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(name)
);

-- Departments table
CREATE TABLE IF NOT EXISTS departments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  keywords TEXT[], -- Array of keywords for matching
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(name)
);

-- Jobs table
CREATE TABLE IF NOT EXISTS jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id),
  external_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,
  department_id UUID REFERENCES departments(id),
  department_raw TEXT, -- Original department text from job posting
  salary_min INTEGER,
  salary_max INTEGER,
  salary_currency TEXT,
  salary_interval TEXT, -- 'yearly', 'monthly', 'hourly'
  url TEXT NOT NULL,
  status TEXT DEFAULT 'active', -- 'active', 'inactive', 'stale'
  last_change TIMESTAMP WITH TIME ZONE,
  last_seen_active TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(company_id, external_id)
);

-- Job Changes table
CREATE TABLE IF NOT EXISTS job_changes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID REFERENCES jobs(id),
  company_id UUID REFERENCES companies(id),
  change_type TEXT NOT NULL, -- 'added', 'removed', 'modified', 'tracking_started', 'tracking_stopped', 'marked_stale'
  previous_title TEXT,
  new_title TEXT,
  previous_location TEXT,
  new_location TEXT,
  previous_description TEXT,
  new_description TEXT,
  previous_salary_min INTEGER,
  new_salary_min INTEGER,
  previous_salary_max INTEGER,
  new_salary_max INTEGER,
  previous_salary_currency TEXT,
  new_salary_currency TEXT,
  previous_salary_interval TEXT,
  new_salary_interval TEXT,
  previous_jobs_count INTEGER,
  new_jobs_count INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  preferred_departments TEXT[],
  preferred_location TEXT,
  last_login TIMESTAMP WITH TIME ZONE,
  login_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE -- For GDPR/CCPA compliance
);

-- User Company Tracking
CREATE TABLE IF NOT EXISTS user_company_tracking (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  company_id UUID REFERENCES companies(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, company_id)
);

-- User Job Tracking
CREATE TABLE IF NOT EXISTS user_job_tracking (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  job_id UUID REFERENCES jobs(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, job_id)
);

-- User Activity Tracking
CREATE TABLE IF NOT EXISTS user_activity (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  activity_type TEXT NOT NULL, -- 'login', 'view_feed', 'track_company', 'track_job', etc.
  feed_type TEXT, -- 'market', 'tracked_companies', 'tracked_jobs'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Email Queue (for Add Company requests)
CREATE TABLE IF NOT EXISTS email_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  to_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sent_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for companies table
CREATE INDEX IF NOT EXISTS idx_companies_job_board_type ON companies(job_board_type);
CREATE INDEX IF NOT EXISTS idx_companies_status ON companies(status);

-- Indexes for jobs table
CREATE INDEX IF NOT EXISTS idx_jobs_company_id ON jobs(company_id);
CREATE INDEX IF NOT EXISTS idx_jobs_department_id ON jobs(department_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_last_seen_active ON jobs(last_seen_active);

-- Indexes for job_changes table
CREATE INDEX IF NOT EXISTS idx_job_changes_job_id ON job_changes(job_id);
CREATE INDEX IF NOT EXISTS idx_job_changes_company_id ON job_changes(company_id);
CREATE INDEX IF NOT EXISTS idx_job_changes_change_type ON job_changes(change_type);
CREATE INDEX IF NOT EXISTS idx_job_changes_created_at ON job_changes(created_at);

-- Indexes for user tracking tables
CREATE INDEX IF NOT EXISTS idx_user_company_tracking_user_id ON user_company_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_user_company_tracking_company_id ON user_company_tracking(company_id);
CREATE INDEX IF NOT EXISTS idx_user_job_tracking_user_id ON user_job_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_user_job_tracking_job_id ON user_job_tracking(job_id); 