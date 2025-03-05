import { SupabaseClient } from '@supabase/supabase-js';
import { RawJobData } from './job-apis/types';
import { Company, Job, JobChange } from '../types/database';
import { matchDepartment } from './department-matcher';

/**
 * Processes job data from API and updates the database
 * @param supabase Supabase client
 * @param company Company data
 * @param jobs Raw job data from API
 */
export async function processJobData(
  supabase: SupabaseClient,
  company: Company,
  jobs: RawJobData[]
): Promise<void> {
  try {
    // 1. Get current jobs for this company from the database
    const { data: existingJobs, error: fetchError } = await supabase
      .from('jobs')
      .select('*')
      .eq('company_id', company.id);

    if (fetchError) {
      throw new Error(`Error fetching existing jobs: ${fetchError.message}`);
    }

    // Create maps for easier lookup
    const existingJobsMap = new Map<string, Job>();
    existingJobs?.forEach(job => {
      existingJobsMap.set(job.external_id, job);
    });

    // 2. Process each job from the API
    const jobsToAdd: Partial<Job>[] = [];
    const jobsToUpdate: Partial<Job>[] = [];
    const jobChanges: Partial<JobChange>[] = [];
    const processedExternalIds = new Set<string>();

    for (const rawJob of jobs) {
      processedExternalIds.add(rawJob.externalId);
      
      // Match department
      const departmentId = await matchDepartment(
        rawJob.title,
        rawJob.description,
        rawJob.department
      );
      
      // Create job object with common fields
      const jobData: Partial<Job> = {
        company_id: company.id,
        external_id: rawJob.externalId,
        title: rawJob.title,
        description: rawJob.description,
        location: rawJob.location,
        department_id: departmentId,
        department_raw: rawJob.department,
        salary_min: rawJob.salary.min,
        salary_max: rawJob.salary.max,
        salary_currency: rawJob.salary.currency,
        salary_interval: rawJob.salary.interval,
        url: rawJob.url,
        status: 'active',
        last_seen_active: new Date().toISOString()
      };

      const existingJob = existingJobsMap.get(rawJob.externalId);

      if (!existingJob) {
        // New job
        jobsToAdd.push({
          ...jobData,
          created_at: new Date().toISOString(),
          last_change: new Date().toISOString()
        });

        // Create 'added' change record
        jobChanges.push({
          company_id: company.id,
          change_type: 'added',
          new_title: rawJob.title,
          new_location: rawJob.location,
          new_description: rawJob.description,
          new_salary_min: rawJob.salary.min,
          new_salary_max: rawJob.salary.max,
          new_salary_currency: rawJob.salary.currency,
          new_salary_interval: rawJob.salary.interval,
          created_at: new Date().toISOString()
        });
      } else {
        // Existing job - check for changes
        const changes: Partial<JobChange> = {
          job_id: existingJob.id,
          company_id: company.id,
          created_at: new Date().toISOString()
        };
        
        let hasChanges = false;

        // Check for title changes
        if (existingJob.title !== rawJob.title) {
          changes.change_type = 'modified';
          changes.previous_title = existingJob.title;
          changes.new_title = rawJob.title;
          hasChanges = true;
        }

        // Check for location changes
        if (existingJob.location !== rawJob.location) {
          changes.change_type = changes.change_type || 'modified';
          changes.previous_location = existingJob.location;
          changes.new_location = rawJob.location;
          hasChanges = true;
        }

        // Check for description changes (simplified - could use more sophisticated comparison)
        if (existingJob.description !== rawJob.description) {
          changes.change_type = changes.change_type || 'modified';
          changes.previous_description = existingJob.description;
          changes.new_description = rawJob.description;
          hasChanges = true;
        }

        // Check for salary changes
        if (existingJob.salary_min !== rawJob.salary.min) {
          changes.change_type = changes.change_type || 'modified';
          changes.previous_salary_min = existingJob.salary_min;
          changes.new_salary_min = rawJob.salary.min;
          hasChanges = true;
        }

        if (existingJob.salary_max !== rawJob.salary.max) {
          changes.change_type = changes.change_type || 'modified';
          changes.previous_salary_max = existingJob.salary_max;
          changes.new_salary_max = rawJob.salary.max;
          hasChanges = true;
        }

        if (existingJob.salary_currency !== rawJob.salary.currency) {
          changes.change_type = changes.change_type || 'modified';
          changes.previous_salary_currency = existingJob.salary_currency;
          changes.new_salary_currency = rawJob.salary.currency;
          hasChanges = true;
        }

        if (existingJob.salary_interval !== rawJob.salary.interval) {
          changes.change_type = changes.change_type || 'modified';
          changes.previous_salary_interval = existingJob.salary_interval;
          changes.new_salary_interval = rawJob.salary.interval;
          hasChanges = true;
        }

        // Check for status changes (reactivation)
        if (existingJob.status === 'inactive' || existingJob.status === 'stale') {
          changes.change_type = 'added'; // Treat as a new job for UI purposes
          hasChanges = true;
        }

        if (hasChanges) {
          // Update job with new data and mark last_change
          jobsToUpdate.push({
            ...jobData,
            id: existingJob.id,
            last_change: new Date().toISOString()
          });

          // Add change record
          jobChanges.push(changes);
        } else {
          // No changes, just update last_seen_active
          jobsToUpdate.push({
            id: existingJob.id,
            last_seen_active: new Date().toISOString()
          });
        }
      }
    }

    // 3. Find removed jobs (jobs in DB but not in API response)
    const removedJobs: Partial<Job>[] = [];
    const removedJobChanges: Partial<JobChange>[] = [];

    existingJobs?.forEach(job => {
      if (!processedExternalIds.has(job.external_id) && job.status === 'active') {
        // Mark job as inactive
        removedJobs.push({
          id: job.id,
          status: 'inactive',
          last_change: new Date().toISOString()
        });

        // Create 'removed' change record
        removedJobChanges.push({
          job_id: job.id,
          company_id: company.id,
          change_type: 'removed',
          previous_title: job.title,
          previous_location: job.location,
          created_at: new Date().toISOString()
        });
      }
    });

    // 4. Find stale jobs (no changes for 60+ days)
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
    const staleDate = sixtyDaysAgo.toISOString();

    const staleJobs: Partial<Job>[] = [];
    const staleJobChanges: Partial<JobChange>[] = [];

    existingJobs?.forEach(job => {
      if (
        job.status === 'active' &&
        job.last_change && 
        job.last_change < staleDate &&
        !removedJobs.some(rj => rj.id === job.id) &&
        !jobsToUpdate.some(uj => uj.id === job.id && uj.last_change)
      ) {
        // Mark job as stale
        staleJobs.push({
          id: job.id,
          status: 'stale',
          last_change: new Date().toISOString()
        });

        // Create 'marked_stale' change record
        staleJobChanges.push({
          job_id: job.id,
          company_id: company.id,
          change_type: 'marked_stale',
          previous_title: job.title,
          created_at: new Date().toISOString()
        });
      }
    });

    // 5. Update company job counts
    const newJobsCount = jobs.length;
    const previousJobsCount = company.total_jobs_count;

    if (newJobsCount !== previousJobsCount) {
      // Create job count change record
      jobChanges.push({
        company_id: company.id,
        change_type: 'modified',
        previous_jobs_count: previousJobsCount,
        new_jobs_count: newJobsCount,
        created_at: new Date().toISOString()
      });

      // Update company record
      await supabase
        .from('companies')
        .update({
          previous_jobs_count: previousJobsCount,
          total_jobs_count: newJobsCount,
          last_updated: new Date().toISOString()
        })
        .eq('id', company.id);
    } else {
      // Just update the last_updated timestamp
      await supabase
        .from('companies')
        .update({
          last_updated: new Date().toISOString()
        })
        .eq('id', company.id);
    }

    // 6. Batch update the database
    // Add new jobs
    if (jobsToAdd.length > 0) {
      const { error: addError } = await supabase.from('jobs').insert(jobsToAdd);
      if (addError) {
        console.error('Error adding new jobs:', addError);
      }
    }

    // Update existing jobs
    for (const job of jobsToUpdate) {
      const { error: updateError } = await supabase
        .from('jobs')
        .update(job)
        .eq('id', job.id);
      
      if (updateError) {
        console.error(`Error updating job ${job.id}:`, updateError);
      }
    }

    // Update removed jobs
    for (const job of removedJobs) {
      const { error: removeError } = await supabase
        .from('jobs')
        .update(job)
        .eq('id', job.id);
      
      if (removeError) {
        console.error(`Error marking job ${job.id} as removed:`, removeError);
      }
    }

    // Update stale jobs
    for (const job of staleJobs) {
      const { error: staleError } = await supabase
        .from('jobs')
        .update(job)
        .eq('id', job.id);
      
      if (staleError) {
        console.error(`Error marking job ${job.id} as stale:`, staleError);
      }
    }

    // Add all job changes
    const allChanges = [...jobChanges, ...removedJobChanges, ...staleJobChanges];
    if (allChanges.length > 0) {
      const { error: changeError } = await supabase.from('job_changes').insert(allChanges);
      if (changeError) {
        console.error('Error adding job changes:', changeError);
      }
    }

    console.log(`Processed ${jobs.length} jobs for ${company.name}:`, {
      added: jobsToAdd.length,
      updated: jobsToUpdate.length,
      removed: removedJobs.length,
      stale: staleJobs.length,
      changes: allChanges.length
    });
  } catch (error) {
    console.error(`Error processing job data for company ${company.name}:`, error);
    throw error;
  }
} 