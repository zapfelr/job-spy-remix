-- Job Changes Retention Policy
-- This script implements a 90-day retention policy for job changes
-- It should be run periodically (e.g., daily) to clean up old records

-- Delete job changes older than 90 days
DELETE FROM job_changes
WHERE created_at < NOW() - INTERVAL '90 days';

-- Create a function to automatically clean up old job changes
CREATE OR REPLACE FUNCTION cleanup_old_job_changes()
RETURNS void AS $$
BEGIN
  -- Delete job changes older than 90 days
  DELETE FROM job_changes
  WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;

-- Create a cron job to run the cleanup function daily
-- Note: This requires the pg_cron extension to be enabled
-- If pg_cron is not available, this can be run manually or via a scheduled task
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pg_cron'
  ) THEN
    -- Drop the job if it already exists
    PERFORM cron.unschedule('cleanup_old_job_changes');
    
    -- Schedule the job to run daily at 3:00 AM
    PERFORM cron.schedule('0 3 * * *', 'SELECT cleanup_old_job_changes()');
  ELSE
    RAISE NOTICE 'pg_cron extension not available. Please run cleanup_old_job_changes() manually or via a scheduled task.';
  END IF;
END;
$$ LANGUAGE plpgsql; 