-- Fix job locations by splitting concatenated locations into separate records

-- 1. Create a temporary function to split locations
CREATE OR REPLACE FUNCTION split_location(location_text TEXT, delimiter TEXT)
RETURNS TABLE(location_part TEXT) AS $$
BEGIN
  RETURN QUERY SELECT trim(both ' ' from unnest(string_to_array(location_text, delimiter)));
END;
$$ LANGUAGE plpgsql;

-- 2. Find all job locations with delimiters
WITH locations_to_split AS (
  SELECT 
    id,
    job_id,
    location,
    is_remote,
    created_at
  FROM job_locations
  WHERE 
    location LIKE '%·%' OR 
    location LIKE '%,%' OR
    location LIKE '% - %' OR
    location LIKE '%/%'
),
-- 3. Split locations into separate rows
split_locations AS (
  SELECT 
    job_id,
    trim(both ' ' from location_part) as location,
    is_remote,
    created_at
  FROM locations_to_split,
  LATERAL (
    -- Try to split by various delimiters
    SELECT location_part FROM split_location(location, '·')
    UNION
    SELECT location_part FROM split_location(location, ',')
    UNION
    SELECT location_part FROM split_location(location, ' - ')
    UNION
    SELECT location_part FROM split_location(location, '/')
  ) as split_loc
  WHERE trim(both ' ' from location_part) != ''
),
-- 4. Delete the original concatenated locations
deleted_locations AS (
  DELETE FROM job_locations
  WHERE id IN (SELECT id FROM locations_to_split)
  RETURNING id
)
-- 5. Insert the split locations
INSERT INTO job_locations (job_id, location, is_remote, created_at)
SELECT 
  job_id,
  location,
  CASE 
    WHEN location ILIKE '%remote%' THEN TRUE
    WHEN location ILIKE '%work from home%' THEN TRUE
    WHEN location ILIKE '%wfh%' THEN TRUE
    WHEN location ILIKE '%virtual%' THEN TRUE
    WHEN location ILIKE '%telecommute%' THEN TRUE
    WHEN location ILIKE '%anywhere%' THEN TRUE
    WHEN location ILIKE '%distributed%' THEN TRUE
    ELSE is_remote
  END as is_remote,
  created_at
FROM split_locations;

-- 6. Update the is_remote flag in the jobs table
UPDATE jobs
SET is_remote = TRUE
WHERE id IN (
  SELECT job_id FROM job_locations WHERE is_remote = TRUE
);

-- 7. Drop the temporary function
DROP FUNCTION IF EXISTS split_location(TEXT, TEXT);

-- 8. Output the results
SELECT 'Job locations have been fixed. Check the job_locations table for the results.' as result; 