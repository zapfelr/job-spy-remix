-- Migration script to add job_locations table and update jobs table
-- This script should be run in the Supabase SQL editor

-- 1. Create the job_locations table
CREATE TABLE job_locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  location TEXT NOT NULL,
  is_remote BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Add is_remote column to jobs table
ALTER TABLE jobs ADD COLUMN is_remote BOOLEAN DEFAULT FALSE;

-- 3. Migrate existing location data to the new table
INSERT INTO job_locations (job_id, location, is_remote, created_at)
SELECT 
  id, 
  location, 
  CASE 
    WHEN location ILIKE '%remote%' THEN TRUE 
    ELSE FALSE 
  END as is_remote,
  created_at
FROM jobs
WHERE location IS NOT NULL AND location != '';

-- 4. Update is_remote flag in jobs table based on locations
UPDATE jobs
SET is_remote = TRUE
WHERE id IN (
  SELECT job_id FROM job_locations WHERE is_remote = TRUE
);

-- 5. Create an index on job_id for better performance
CREATE INDEX idx_job_locations_job_id ON job_locations(job_id);

-- 6. Create an index on location for search performance
CREATE INDEX idx_job_locations_location ON job_locations(location);

-- 7. Create an index on is_remote for filtering
CREATE INDEX idx_jobs_is_remote ON jobs(is_remote);

-- Note: We're keeping the location column in the jobs table for now to avoid breaking existing code
-- It can be removed in a future migration after all code has been updated 