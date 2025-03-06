import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/database';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Function to split a location string that might contain multiple locations
function splitLocationString(locationString: string): string[] {
  if (!locationString) return [];
  
  // Common delimiters in location strings
  const delimiters = [' · ', ', ', ' - ', '/', ' and ', ' & '];
  
  // Try each delimiter
  for (const delimiter of delimiters) {
    if (locationString.includes(delimiter)) {
      return locationString
        .split(delimiter)
        .map(loc => loc.trim())
        .filter(Boolean);
    }
  }
  
  // If no delimiters found, return the original string as a single location
  return [locationString.trim()];
}

// Check if a location string indicates a remote position
function isRemoteLocation(location: string): boolean {
  if (!location) return false;
  
  const remoteKeywords = [
    'remote',
    'work from home',
    'wfh',
    'virtual',
    'telecommute',
    'anywhere',
    'distributed'
  ];
  
  const locationLower = location.toLowerCase();
  return remoteKeywords.some(keyword => locationLower.includes(keyword));
}

async function populateJobLocations() {
  // Create Supabase client
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    return;
  }
  
  const supabase = createClient<Database>(supabaseUrl, supabaseKey);
  
  // Get all jobs
  const { data: jobs, error: jobsError } = await supabase
    .from('jobs')
    .select('id, external_id, location')
    .order('created_at', { ascending: false });
  
  if (jobsError) {
    console.error('Error fetching jobs:', jobsError);
    return;
  }
  
  console.log(`Found ${jobs.length} jobs to process`);
  
  // Process jobs in batches
  const batchSize = 50;
  let totalLocationsAdded = 0;
  
  for (let i = 0; i < jobs.length; i += batchSize) {
    const batch = jobs.slice(i, i + batchSize);
    console.log(`Processing batch ${i / batchSize + 1} of ${Math.ceil(jobs.length / batchSize)}`);
    
    // Process each job in the batch
    const locationsToInsert = [];
    
    for (const job of batch) {
      if (!job.location) continue;
      
      // Split the location string
      const locations = splitLocationString(job.location);
      
      // Create location records
      for (const location of locations) {
        locationsToInsert.push({
          job_id: job.id,
          location: location,
          is_remote: isRemoteLocation(location),
          created_at: new Date().toISOString()
        });
      }
    }
    
    // Insert locations
    if (locationsToInsert.length > 0) {
      const { data, error } = await supabase
        .from('job_locations')
        .insert(locationsToInsert);
      
      if (error) {
        console.error('Error inserting job locations:', error);
      } else {
        totalLocationsAdded += locationsToInsert.length;
        console.log(`Added ${locationsToInsert.length} locations in this batch`);
      }
    }
  }
  
  console.log(`Completed! Added a total of ${totalLocationsAdded} job locations`);
}

// Run the script
populateJobLocations().catch(console.error); 