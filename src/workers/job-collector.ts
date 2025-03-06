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
      const { error } = await supabase
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
            
            const { error: individualError } = await supabase
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
            }
            
            // Add a delay between individual job inserts
            await new Promise(resolve => setTimeout(resolve, 300));
          } catch (error) {
            console.error(`Error processing job ${job.title}:`, error);
          }
        }
      } else {
        console.log(`Successfully inserted/updated batch of ${jobBatch.length} jobs`);
      }
      
      // Add a delay between batches to avoid rate limits
      if (i + BATCH_SIZE < jobs.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    // Update company job count with retry logic
    let retries = 0;
    const MAX_RETRIES = 3;
    let success = false;
    
    while (!success && retries < MAX_RETRIES) {
      try {
        console.log(`Getting job count for company ${companyId}... (attempt ${retries + 1})`);
        
        // First, get the current count of active jobs for this company
        const { count, error: countError } = await supabase
          .from('jobs')
          .select('*', { count: 'exact', head: true })
          .eq('company_id', companyId)
          .eq('status', 'active');
        
        console.log(`Count query result: count=${count}, error=${countError ? JSON.stringify(countError) : 'none'}`);
        
        if (countError) {
          console.error(`Error getting job count:`, countError);
          throw countError;
        }
        
        console.log(`Updating company ${companyId} with total_jobs_count=${count}...`);
        
        // Then update the company record with the actual count
        const { error } = await supabase
          .from('companies')
          .update({
            total_jobs_count: count,
            last_updated: new Date().toISOString()
          })
          .eq('id', companyId);
        
        console.log(`Update result: error=${error ? JSON.stringify(error) : 'none'}`);
        
        if (error) {
          console.error(`Error updating company job count:`, error);
          throw error;
        } else {
          console.log(`Successfully updated company ${companyId} job count to ${count}`);
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
 * Simple mock implementation of error logging
 */
async function logError(
  errorData: {
    apiName: string;
    message: string;
    stack?: string;
    context: Record<string, any>;
  },
  supabase: SupabaseClient<Database>
) {
  console.error(`API Error in ${errorData.apiName}: ${errorData.message}`);
  console.error('Context:', errorData.context);
  
  // In a real implementation, this would log to the database
  try {
    await supabase
      .from('api_errors')
      .insert({
        api_type: errorData.apiName,
        error_message: errorData.message,
        company_id: errorData.context.companyId,
        company_name: errorData.context.companyName || 'Unknown',
        created_at: new Date().toISOString()
      });
  } catch (error) {
    console.error('Failed to log error to database:', error);
  }
}

/**
 * Creates a Supabase client using the available credentials
 */
function createSupabaseClient(env: Env) {
  // Try to use the service key first, then fall back to the anon key
  const supabaseUrl = env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL || 'https://cpgwkmqyffzhuqnfwahq.supabase.co';
  const supabaseKey = env.SUPABASE_SERVICE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  console.log(`Creating Supabase client with URL: ${supabaseUrl}`);
  console.log(`Using service key: ${env.SUPABASE_SERVICE_KEY ? 'Yes' : 'No'}`);
  
  if (!supabaseKey) {
    throw new Error('Supabase key not found. Please set SUPABASE_SERVICE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable.');
  }
  
  return createWorkerSupabaseClient(supabaseUrl, supabaseKey);
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
      console.error(`Failed to log error:`, logError);
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