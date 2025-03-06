import { createWorkerSupabaseClient } from '../lib/supabase-worker';
import { Database } from '../types/database';
import { SupabaseClient } from '@supabase/supabase-js';
import { fetchAshbyJobs } from '../lib/job-apis/ashby';
import { fetchGreenhouseJobs } from '../lib/job-apis/greenhouse';

// Define types for Cloudflare Workers
export interface ScheduledEvent {
  cron: string;
  scheduledTime: number;
}

export interface ExecutionContext {
  waitUntil(promise: Promise<any>): void;
  passThroughOnException(): void;
}

export interface Env {
  API_SECRET: string;
  SUPABASE_URL: string;
  SUPABASE_SERVICE_KEY: string;
  NEXT_PUBLIC_SUPABASE_URL?: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY?: string;
}

// Define JobBoardType enum if not available from database types
export enum JobBoardType {
  GREENHOUSE = 'greenhouse',
  LEVER = 'lever',
  WORKDAY = 'workday',
  ASHBY = 'ashby',
  CUSTOM = 'custom'
}

// Define simplified interfaces for job processing
interface JobData {
  id?: string;
  externalId: string;
  title: string;
  location: string;
  locations?: string[];
  description: string;
  url: string;
  department: string;
  company_id: string;
  salary: {
    min: number | null;
    max: number | null;
    currency: string;
    interval: string;
  };
}

/**
 * Logs an error to the database
 */
async function logError(
  errorData: {
    apiName: string;
    message: string;
    stack?: string;
    context?: any;
  },
  supabase: SupabaseClient<Database>
) {
  try {
    const { error } = await supabase
      .from('api_errors')
      .insert({
        api_name: errorData.apiName,
        error_message: errorData.message,
        error_stack: errorData.stack,
        context: errorData.context,
        created_at: new Date().toISOString()
      });
    
    if (error) {
      console.error(`Error logging API error to database:`, error);
    }
  } catch (error) {
    console.error(`Error in logError:`, error);
  }
}

/**
 * Creates a Supabase client for the worker
 */
function createSupabaseClient(env: Env): SupabaseClient<Database> {
  const supabaseUrl = env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = env.SUPABASE_SERVICE_KEY;
  
  if (!supabaseUrl) {
    throw new Error('Missing Supabase URL');
  }
  
  if (!supabaseKey) {
    throw new Error('Missing Supabase service key');
  }
  
  console.log(`Creating Supabase client with URL: ${supabaseUrl}`);
  console.log(`Using service key: ${supabaseKey ? 'Yes' : 'No'}`);
  
  return createWorkerSupabaseClient(supabaseUrl, supabaseKey);
}

/**
 * Process job data with batch processing to avoid rate limits
 */
async function processJobData(jobs: JobData[], companyId: string, supabase: SupabaseClient<Database>) {
  console.log(`Processing ${jobs.length} jobs for company ${companyId}`);
  
  // Get all external IDs of the jobs we're processing
  const currentExternalIds = jobs.map(job => job.externalId);
  console.log(`Current external IDs: ${currentExternalIds.length}`);
  
  try {
    // Mark jobs as inactive if they're not in the current batch
    // Only do this if we have external IDs to check against
    if (currentExternalIds.length > 0) {
      try {
        // Split into smaller batches if there are many external IDs
        const batchSize = 50; // Smaller batch size to avoid hitting limits
        for (let i = 0; i < currentExternalIds.length; i += batchSize) {
          const batchIds = currentExternalIds.slice(i, i + batchSize);
          
          const { error: inactiveError } = await supabase
            .from('jobs')
            .update({
              status: 'inactive',
              last_change: new Date().toISOString()
            })
            .eq('company_id', companyId)
            .eq('status', 'active')
            .not('external_id', 'in', `(${batchIds.map(id => `'${id}'`).join(',')})`);
          
          if (inactiveError) {
            console.error(`Error marking inactive jobs:`, inactiveError);
          } else {
            console.log(`Marked inactive jobs for batch ${i / batchSize + 1}`);
          }
          
          // Add a small delay between batches to avoid rate limits
          if (i + batchSize < currentExternalIds.length) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }
      } catch (error) {
        console.error(`Error marking inactive jobs:`, error);
      }
    }
    
    // Process jobs in batches
    const BATCH_SIZE = 10; // Process 10 jobs at a time
    const jobsWithIds: { id: string; external_id: string }[] = [];
    
    for (let i = 0; i < jobs.length; i += BATCH_SIZE) {
      const jobBatch = jobs.slice(i, i + BATCH_SIZE);
      console.log(`Processing batch ${Math.floor(i / BATCH_SIZE) + 1} of ${Math.ceil(jobs.length / BATCH_SIZE)}`);
      
      // Create a batch of upsert operations
      const jobsToUpsert = jobBatch.map(job => ({
        company_id: companyId,
        external_id: job.externalId,
        title: job.title,
        description: job.description,
        location: job.location,
        department_raw: job.department,
        url: job.url,
        salary_min: job.salary.min,
        salary_max: job.salary.max,
        salary_currency: job.salary.currency,
        salary_interval: job.salary.interval,
        status: 'active',
        last_seen_active: new Date().toISOString(),
        created_at: new Date().toISOString(),
        last_change: new Date().toISOString()
      }));
      
      // Upsert the batch
      const { data: insertedJobs, error } = await supabase
        .from('jobs')
        .upsert(jobsToUpsert, {
          onConflict: 'company_id,external_id'
        });
      
      if (error) {
        console.error(`Error inserting job batch:`, error);
        
        // If batch fails, try inserting one by one with delays
        for (const job of jobBatch) {
          try {
            console.log(`Retrying individual job: ${job.title}`);
            
            const { data: insertedJob, error: individualError } = await supabase
              .from('jobs')
              .upsert({
                company_id: companyId,
                external_id: job.externalId,
                title: job.title,
                description: job.description,
                location: job.location,
                department_raw: job.department,
                url: job.url,
                salary_min: job.salary.min,
                salary_max: job.salary.max,
                salary_currency: job.salary.currency,
                salary_interval: job.salary.interval,
                status: 'active',
                last_seen_active: new Date().toISOString(),
                created_at: new Date().toISOString(),
                last_change: new Date().toISOString()
              }, {
                onConflict: 'company_id,external_id'
              });
            
            if (individualError) {
              console.error(`Error inserting job ${job.title}:`, individualError);
            } else {
              console.log(`Successfully inserted/updated job: ${job.title}`);
              // After successful insert, get the job ID
              const { data: jobData } = await supabase
                .from('jobs')
                .select('id, external_id')
                .eq('company_id', companyId)
                .eq('external_id', job.externalId)
                .single();
                
              if (jobData) {
                jobsWithIds.push({ id: jobData.id, external_id: jobData.external_id });
              }
            }
            
            // Add a delay between individual job inserts
            await new Promise(resolve => setTimeout(resolve, 300));
          } catch (error) {
            console.error(`Error processing job ${job.title}:`, error);
          }
        }
      } else {
        console.log(`Successfully inserted/updated batch of ${jobBatch.length} jobs`);
        // After successful batch insert, get the job IDs
        const { data: jobsData } = await supabase
          .from('jobs')
          .select('id, external_id')
          .eq('company_id', companyId)
          .in('external_id', jobBatch.map(job => job.externalId));
          
        if (jobsData && jobsData.length > 0) {
          jobsWithIds.push(...jobsData.map(job => ({ id: job.id, external_id: job.external_id })));
        }
      }
      
      // Add a delay between batches to avoid rate limits
      if (i + BATCH_SIZE < jobs.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    // Process job locations
    if (jobsWithIds.length > 0) {
      await processJobLocations(supabase, jobsWithIds, jobs);
    }
    
    // Update company job count with retry logic
    let retries = 0;
    const MAX_RETRIES = 3;
    let success = false;
    
    while (!success && retries < MAX_RETRIES) {
      try {
        console.log(`Updating job count for company ${companyId}... (attempt ${retries + 1})`);
        
        // Use the currentExternalIds length as the job count instead of making a separate query
        // This is more efficient and avoids the "Too many subrequests" error
        const jobCount = currentExternalIds.length;
        
        console.log(`Using job count from processed data: ${jobCount}`);
        
        // Update the company record with the job count
        const { error } = await supabase
          .from('companies')
          .update({
            total_jobs_count: jobCount,
            last_updated: new Date().toISOString()
          })
          .eq('id', companyId);
        
        console.log(`Update result: error=${error ? JSON.stringify(error) : 'none'}`);
        
        if (error) {
          console.error(`Error updating company job count:`, error);
          throw error;
        } else {
          console.log(`Successfully updated company ${companyId} job count to ${jobCount}`);
          success = true;
        }
      } catch (error) {
        retries++;
        console.error(`Error updating company job count (attempt ${retries}):`, error);
        
        if (retries < MAX_RETRIES) {
          // Exponential backoff: wait longer between each retry
          const delay = Math.pow(2, retries) * 1000;
          console.log(`Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    console.log(`Processed ${jobs.length} jobs for company ${companyId}`);
  } catch (error) {
    console.error(`Error in processJobData:`, error);
  }
}

/**
 * Process job locations for new or updated jobs
 */
async function processJobLocations(
  supabase: SupabaseClient<Database>,
  jobsWithIds: { id: string; external_id: string }[],
  rawJobs: JobData[]
): Promise<void> {
  try {
    // Create a map of raw jobs by external_id for faster lookup
    const rawJobsMap = new Map<string, JobData>();
    rawJobs.forEach(job => {
      rawJobsMap.set(job.externalId, job);
    });
    
    // Get existing job locations for these jobs
    const { data: existingLocations, error: locError } = await supabase
      .from('job_locations')
      .select('id, job_id, location')
      .in('job_id', jobsWithIds.map(job => job.id));
    
    if (locError) {
      console.error('Error fetching existing job locations:', locError);
      return;
    }
    
    // Create a map of existing locations by job_id
    const existingLocationsMap = new Map<string, { id: string; location: string }[]>();
    existingLocations?.forEach(loc => {
      if (!existingLocationsMap.has(loc.job_id)) {
        existingLocationsMap.set(loc.job_id, []);
      }
      existingLocationsMap.get(loc.job_id)!.push({ id: loc.id, location: loc.location });
    });
    
    // Process each job
    for (const job of jobsWithIds) {
      // Find the raw job data
      const rawJob = rawJobsMap.get(job.external_id);
      
      if (!rawJob) {
        console.warn(`Could not find raw job data for job ID ${job.id}`);
        continue;
      }
      
      // Get locations from the raw job and ensure they're properly split
      let rawLocations: string[] = [];
      
      // Check if the job has a locations array
      if (rawJob.locations && Array.isArray(rawJob.locations) && rawJob.locations.length > 0) {
        // Process each location to split any that contain delimiters
        rawJob.locations.forEach(loc => {
          // Split locations that might contain multiple locations
          const splitLocations = splitLocationString(loc);
          rawLocations.push(...splitLocations);
        });
      } else if (rawJob.location) {
        // Split a single location string that might contain multiple locations
        rawLocations = splitLocationString(rawJob.location);
      }
      
      // Remove duplicates and empty locations
      const locations = [...new Set(rawLocations)].filter(Boolean);
      
      // Skip if no locations
      if (locations.length === 0) {
        continue;
      }
      
      // Get existing locations for this job
      const existingJobLocations = existingLocationsMap.get(job.id) || [];
      
      // Determine which locations to add and which to remove
      const existingLocationSet = new Set(existingJobLocations.map(loc => loc.location));
      const newLocationSet = new Set(locations);
      
      // Locations to add (in new set but not in existing set)
      const locationsToAdd = [...newLocationSet].filter(loc => !existingLocationSet.has(loc));
      
      // Locations to remove (in existing set but not in new set)
      const locationsToRemove = existingJobLocations
        .filter(loc => !newLocationSet.has(loc.location))
        .map(loc => loc.id);
      
      // Add new locations
      if (locationsToAdd.length > 0) {
        const locationsData = locationsToAdd.map(location => ({
          job_id: job.id,
          location,
          is_remote: isRemoteLocation(location),
          created_at: new Date().toISOString()
        }));
        
        const { error: addLocError } = await supabase
          .from('job_locations')
          .insert(locationsData);
        
        if (addLocError) {
          console.error(`Error adding locations for job ${job.id}:`, addLocError);
        }
      }
      
      // Remove old locations
      if (locationsToRemove.length > 0) {
        const { error: removeLocError } = await supabase
          .from('job_locations')
          .delete()
          .in('id', locationsToRemove);
        
        if (removeLocError) {
          console.error(`Error removing locations for job ${job.id}:`, removeLocError);
        }
      }
      
      // Update the is_remote flag in the jobs table if any location is remote
      const hasRemoteLocation = locations.some(isRemoteLocation);
      if (hasRemoteLocation) {
        const { error: updateError } = await supabase
          .from('jobs')
          .update({ is_remote: true })
          .eq('id', job.id);
        
        if (updateError) {
          console.error(`Error updating is_remote flag for job ${job.id}:`, updateError);
        }
      }
    }
  } catch (error) {
    console.error('Error processing job locations:', error);
  }
}

/**
 * Split a location string that might contain multiple locations
 * @param locationString The location string to split
 * @returns Array of individual locations
 */
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

/**
 * Check if a location string indicates a remote position
 */
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

/**
 * Collects jobs for a specific company
 */
async function collectJobsForCompany(
  companyId: string,
  jobBoardType: JobBoardType,
  jobBoardUrl: string,
  boardIdentifier: string,
  env: Env
) {
  console.log(`Collecting jobs for company ${companyId} from ${jobBoardType}`);
  
  const supabase = createSupabaseClient(env);
  
  try {
    // Fetch jobs based on job board type
    let jobs: JobData[] = [];
    
    if (jobBoardType === JobBoardType.ASHBY) {
      try {
        const ashbyJobs = await fetchAshbyJobs(boardIdentifier, jobBoardUrl);
        jobs = ashbyJobs.map((job: any) => ({
          ...job,
          company_id: companyId
        }));
      } catch (error) {
        console.error(`Error fetching jobs from Ashby:`, error);
        await logError({
          apiName: 'ashby',
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          context: { companyId, jobBoardUrl }
        }, supabase);
        // Return early but don't throw, so we can continue with other companies
        return;
      }
    } else if (jobBoardType === JobBoardType.GREENHOUSE) {
      try {
        const greenhouseJobs = await fetchGreenhouseJobs(boardIdentifier);
        jobs = greenhouseJobs.map((job: any) => ({
          ...job,
          company_id: companyId
        }));
      } catch (error) {
        console.error(`Error fetching jobs from Greenhouse:`, error);
        await logError({
          apiName: 'greenhouse',
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          context: { companyId, jobBoardUrl }
        }, supabase);
        // Return early but don't throw, so we can continue with other companies
        return;
      }
    } else {
      console.log(`Job board type ${jobBoardType} not implemented yet`);
      return;
    }
    
    // Process the jobs
    if (jobs.length > 0) {
      await processJobData(jobs, companyId, supabase);
    } else {
      console.log(`No jobs found for company ${companyId}`);
      
      // Update the company's last_updated timestamp even if no jobs were found
      try {
        await supabase
          .from('companies')
          .update({
            last_updated: new Date().toISOString()
          })
          .eq('id', companyId);
      } catch (error) {
        console.error(`Error updating company last_updated timestamp:`, error);
      }
    }
  } catch (error) {
    console.error(`Error collecting jobs for company ${companyId}:`, error);
    
    // Log the error but don't throw, so we can continue with other companies
    try {
      await logError({
        apiName: jobBoardType,
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        context: { companyId, jobBoardUrl, boardIdentifier }
      }, supabase);
    } catch (logError) {
      console.error(`Error logging error:`, logError);
    }
  }
}

/**
 * Collects jobs for all companies with rate limiting
 */
export async function collectAllJobs(env: Env) {
  console.log('Starting job collection for all companies');
  
  const supabase = createSupabaseClient(env);
  
  try {
    // Get all active companies
    const { data: companies, error } = await supabase
      .from('companies')
      .select('id, name, job_board_type, job_board_url, board_identifier')
      .eq('status', 'active');
    
    if (error) {
      console.error('Error fetching companies:', error);
      return;
    }
    
    console.log(`Found ${companies.length} active companies`);
    
    // Process companies with a delay between each to avoid rate limits
    for (let i = 0; i < companies.length; i++) {
      const company = companies[i];
      console.log(`Processing company ${i+1}/${companies.length}: ${company.name}`);
      
      try {
        await collectJobsForCompany(
          company.id,
          company.job_board_type as JobBoardType,
          company.job_board_url,
          company.board_identifier,
          env
        );
      } catch (error) {
        console.error(`Error collecting jobs for company ${company.name}:`, error);
        // Continue with next company even if this one fails
      }
      
      // Add a delay between companies to avoid rate limits
      if (i < companies.length - 1) {
        const delay = 2000; // 2 seconds between companies
        console.log(`Waiting ${delay}ms before processing next company...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    console.log('Completed job collection for all companies');
  } catch (error) {
    console.error('Error in collectAllJobs:', error);
  }
}

/**
 * Cloudflare Worker handler
 */
export default {
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(collectAllJobs(env));
  },
  
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    // Check if the request has the correct API secret
    const url = new URL(request.url);
    const apiSecret = url.searchParams.get('secret');
    
    if (apiSecret !== env.API_SECRET) {
      return new Response('Unauthorized', { status: 401 });
    }
    
    // Start the job collection process
    ctx.waitUntil(collectAllJobs(env));
    
    return new Response('Job collection started', { status: 200 });
  }
}; 