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
 * Simple mock implementation of job processing
 */
async function processJobData(jobs: JobData[], companyId: string, supabase: SupabaseClient<Database>) {
  console.log(`Processing ${jobs.length} jobs for company ${companyId}`);
  
  // Get all external IDs of the jobs we're processing
  const currentExternalIds = jobs.map(job => job.externalId);
  console.log(`Current external IDs: ${currentExternalIds.length}`);
  
  // Mark jobs as inactive if they're not in the current batch
  if (currentExternalIds.length > 0) {
    try {
      const { error: inactiveError } = await supabase
        .from('jobs')
        .update({
          status: 'inactive',
          last_change: new Date().toISOString()
        })
        .eq('company_id', companyId)
        .eq('status', 'active')
        .not('external_id', 'in', `(${currentExternalIds.map(id => `'${id}'`).join(',')})`);
      
      if (inactiveError) {
        console.error(`Error marking inactive jobs:`, inactiveError);
      } else {
        console.log(`Marked inactive jobs that are no longer listed`);
      }
    } catch (error) {
      console.error(`Error marking inactive jobs:`, error);
    }
  }
  
  // Process each job
  for (const job of jobs) {
    console.log(`Job: ${job.title} at ${job.location}`);
    
    try {
      // Insert job into database
      const { data, error } = await supabase
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
      
      if (error) {
        console.error(`Error inserting job ${job.title}:`, error);
      } else {
        console.log(`Successfully inserted/updated job: ${job.title}`);
      }
    } catch (error) {
      console.error(`Error processing job ${job.title}:`, error);
    }
  }
  
  // Update company job count - get the actual count from the database
  try {
    console.log(`Getting job count for company ${companyId}...`);
    
    // First, get the current count of active jobs for this company
    const { count, error: countError } = await supabase
      .from('jobs')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .eq('status', 'active');
    
    console.log(`Count query result: count=${count}, error=${countError ? JSON.stringify(countError) : 'none'}`);
    
    if (countError) {
      console.error(`Error getting job count:`, countError);
      return;
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
    } else {
      console.log(`Successfully updated company ${companyId} job count to ${count}`);
    }
  } catch (error) {
    console.error(`Error updating company job count:`, error);
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
        error_stack: errorData.stack,
        context: errorData.context,
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
      const ashbyJobs = await fetchAshbyJobs(boardIdentifier, jobBoardUrl);
      jobs = ashbyJobs.map((job: any) => ({
        ...job,
        company_id: companyId
      }));
    } else if (jobBoardType === JobBoardType.GREENHOUSE) {
      const greenhouseJobs = await fetchGreenhouseJobs(boardIdentifier);
      jobs = greenhouseJobs.map((job: any) => ({
        ...job,
        company_id: companyId
      }));
    } else {
      console.log(`Job board type ${jobBoardType} not implemented yet`);
    }
    
    // Process the jobs
    if (jobs.length > 0) {
      await processJobData(jobs, companyId, supabase);
      console.log(`Processed ${jobs.length} jobs for company ${companyId}`);
    } else {
      console.log(`No jobs found for company ${companyId}`);
    }
  } catch (error) {
    await logError({
      apiName: jobBoardType,
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      context: { companyId, jobBoardUrl },
    }, supabase);
    
    console.error(`Error collecting jobs for company ${companyId}:`, error);
  }
}

/**
 * Collects jobs for all companies
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
    
    // Process each company
    for (const company of companies) {
      console.log(`Processing company: ${company.name}`);
      
      await collectJobsForCompany(
        company.id,
        company.job_board_type as JobBoardType,
        company.job_board_url,
        company.board_identifier,
        env
      );
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