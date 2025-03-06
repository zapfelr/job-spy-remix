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
    console.log(`Processing ${jobs.length} jobs for company ${company.name} (ID: ${company.id})`);
    
    // Get existing jobs for this company
    const { data: existingJobs, error: jobsError } = await supabase
      .from('jobs')
      .select('id, external_id, title, description, location, department_id, department_raw, salary_min, salary_max, salary_currency, salary_interval, url, status, last_change, last_seen_active')
      .eq('company_id', company.id);
    
    if (jobsError) {
      throw new Error(`Error fetching existing jobs: ${jobsError.message}`);
    }
    
    // Create a map of existing jobs by external_id for faster lookup
    const existingJobsMap = new Map();
    existingJobs.forEach(job => {
      existingJobsMap.set(job.external_id, job);
    });
    
    // Track which external IDs we've processed
    const processedExternalIds = new Set<string>();
    
    // Arrays to track jobs to add, update, or mark as removed
    const jobsToAdd: Partial<Job>[] = [];
    const jobsToUpdate: Partial<Job>[] = [];
    const jobChanges: Partial<JobChange>[] = [];
    
    // Process each job from the API
    for (const rawJob of jobs) {
      processedExternalIds.add(rawJob.externalId);
      
      // Match department
      const departmentId = await matchDepartment(
        rawJob.title,
        rawJob.description,
        rawJob.department || null
      );
      
      // Check if job has remote location
      const hasRemoteLocation = checkForRemoteLocation(rawJob.locations || [rawJob.location || '']);
      
      // Create job object with common fields
      const jobData: Partial<Job> = {
        company_id: company.id,
        external_id: rawJob.externalId,
        title: rawJob.title,
        description: rawJob.description,
        location: Array.isArray(rawJob.locations) ? rawJob.locations.join(', ') : (rawJob.location || ''), // For backward compatibility
        department_id: departmentId,
        department_raw: rawJob.department,
        is_remote: hasRemoteLocation,
        salary_min: rawJob.salary?.min || null,
        salary_max: rawJob.salary?.max || null,
        salary_currency: rawJob.salary?.currency || null,
        salary_interval: (rawJob.salary?.interval as 'yearly' | 'monthly' | 'hourly' | null) || null,
        url: rawJob.url || '',
        status: 'active',
        last_seen_active: new Date().toISOString()
      };

      const existingJob = existingJobsMap.get(rawJob.externalId);
      
      if (!existingJob) {
        // New job
        const newJobData = {
          ...jobData,
          created_at: new Date().toISOString(),
          last_change: new Date().toISOString()
        };
        
        jobsToAdd.push(newJobData);

        // Create 'added' change record
        jobChanges.push({
          company_id: company.id,
          change_type: 'added',
          new_title: rawJob.title,
          new_location: Array.isArray(rawJob.locations) ? rawJob.locations.join(', ') : rawJob.location,
          new_description: rawJob.description,
          new_salary_min: rawJob.salary?.min || null,
          new_salary_max: rawJob.salary?.max || null,
          new_salary_currency: rawJob.salary?.currency || null,
          new_salary_interval: rawJob.salary?.interval || null,
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
        const newLocationString = Array.isArray(rawJob.locations) ? rawJob.locations.join(', ') : rawJob.location;
        if (existingJob.location !== newLocationString) {
          changes.change_type = changes.change_type || 'modified';
          changes.previous_location = existingJob.location;
          changes.new_location = newLocationString;
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
        if (existingJob.salary_min !== (rawJob.salary?.min || null)) {
          changes.change_type = changes.change_type || 'modified';
          changes.previous_salary_min = existingJob.salary_min;
          changes.new_salary_min = rawJob.salary?.min || null;
          hasChanges = true;
        }

        if (existingJob.salary_max !== (rawJob.salary?.max || null)) {
          changes.change_type = changes.change_type || 'modified';
          changes.previous_salary_max = existingJob.salary_max;
          changes.new_salary_max = rawJob.salary?.max || null;
          hasChanges = true;
        }

        if (existingJob.salary_currency !== (rawJob.salary?.currency || null)) {
          changes.change_type = changes.change_type || 'modified';
          changes.previous_salary_currency = existingJob.salary_currency;
          changes.new_salary_currency = rawJob.salary?.currency || null;
          hasChanges = true;
        }

        if (existingJob.salary_interval !== (rawJob.salary?.interval || null)) {
          changes.change_type = changes.change_type || 'modified';
          changes.previous_salary_interval = existingJob.salary_interval;
          changes.new_salary_interval = rawJob.salary?.interval || null;
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

    // Find jobs that are no longer in the API response
    const removedJobs = existingJobs.filter(job => 
      !processedExternalIds.has(job.external_id) && job.status === 'active'
    );
    
    // Create change records for removed jobs
    const removedJobChanges = removedJobs.map(job => ({
      job_id: job.id,
      company_id: company.id,
      change_type: 'removed' as const,
      previous_title: job.title,
      previous_location: job.location,
      created_at: new Date().toISOString()
    }));
    
    // Find jobs that haven't been updated in 60+ days
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
    
    const staleJobs = existingJobs.filter(job => {
      const lastChangeDate = job.last_change || job.last_seen_active || new Date().toISOString();
      return job.status === 'active' && new Date(lastChangeDate) < sixtyDaysAgo;
    });
    
    // Create change records for stale jobs
    const staleJobChanges = staleJobs.map(job => ({
      job_id: job.id,
      company_id: company.id,
      change_type: 'marked_stale' as const,
      previous_title: job.title,
      created_at: new Date().toISOString()
    }));
    
    // Update company job counts
    const newJobCount = existingJobs.length + jobsToAdd.length - removedJobs.length;
    const previousJobCount = company.total_jobs_count || 0;
    
    // Only create a job count change if the count has changed
    if (newJobCount !== previousJobCount) {
      jobChanges.push({
        company_id: company.id,
        change_type: 'modified',
        previous_jobs_count: previousJobCount,
        new_jobs_count: newJobCount,
        created_at: new Date().toISOString()
      });
    }
    
    // Update company record
    const { error: companyError } = await supabase
      .from('companies')
      .update({
        total_jobs_count: newJobCount,
        previous_jobs_count: previousJobCount,
        last_updated: new Date().toISOString()
      })
      .eq('id', company.id);
    
    if (companyError) {
      console.error('Error updating company:', companyError);
    }
    
    // Add new jobs
    if (jobsToAdd.length > 0) {
      const { data: addedJobs, error: addError } = await supabase
        .from('jobs')
        .insert(jobsToAdd)
        .select('id, external_id');
      
      if (addError) {
        console.error('Error adding jobs:', addError);
      } else {
        console.log(`Added ${addedJobs.length} new jobs`);
        
        // Process locations for new jobs
        await processJobLocations(supabase, addedJobs, jobs);
      }
    }
    
    // Update existing jobs
    if (jobsToUpdate.length > 0) {
      // Process in batches to avoid hitting limits
      const batchSize = 50;
      for (let i = 0; i < jobsToUpdate.length; i += batchSize) {
        const batch = jobsToUpdate.slice(i, i + batchSize);
        const { error: updateError } = await supabase
          .from('jobs')
          .upsert(batch);
        
        if (updateError) {
          console.error(`Error updating jobs (batch ${i / batchSize + 1}):`, updateError);
        }
      }
      console.log(`Updated ${jobsToUpdate.length} existing jobs`);
      
      // Process locations for updated jobs
      const updatedJobIds = jobsToUpdate
        .filter(job => job.id) // Filter out jobs without IDs
        .map(job => ({ 
          id: job.id!, 
          external_id: job.external_id || '' 
        })); // Map to the format needed
      
      await processJobLocations(supabase, updatedJobIds, jobs);
    }
    
    // Mark removed jobs as inactive
    if (removedJobs.length > 0) {
      const { error: removeError } = await supabase
        .from('jobs')
        .update({ status: 'inactive' })
        .in('id', removedJobs.map(job => job.id));
      
      if (removeError) {
        console.error('Error marking jobs as removed:', removeError);
      } else {
        console.log(`Marked ${removedJobs.length} jobs as removed`);
      }
    }
    
    // Mark stale jobs
    if (staleJobs.length > 0) {
      const { error: staleError } = await supabase
        .from('jobs')
        .update({ status: 'stale' })
        .in('id', staleJobs.map(job => job.id));
      
      if (staleError) {
        console.error('Error marking jobs as stale:', staleError);
      } else {
        console.log(`Marked ${staleJobs.length} jobs as stale`);
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

/**
 * Process job locations for new or updated jobs
 */
async function processJobLocations(
  supabase: SupabaseClient,
  jobsWithIds: { id: string; external_id: string }[],
  rawJobs: RawJobData[]
): Promise<void> {
  try {
    // Create a map of raw jobs by external_id for faster lookup
    const rawJobsMap = new Map<string, RawJobData>();
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
    existingLocations.forEach(loc => {
      if (!existingLocationsMap.has(loc.job_id)) {
        existingLocationsMap.set(loc.job_id, []);
      }
      existingLocationsMap.get(loc.job_id)!.push({ id: loc.id, location: loc.location });
    });
    
    // Process each job
    for (const job of jobsWithIds) {
      // Find the raw job data
      let rawJob: RawJobData | undefined;
      
      // If we have the external_id, use it to look up the raw job
      if (job.external_id) {
        rawJob = rawJobsMap.get(job.external_id);
      } else {
        // Otherwise, find the raw job by matching the job ID in the raw jobs
        rawJob = rawJobs.find(rj => {
          const matchingJob = jobsWithIds.find(j => j.id === job.id);
          return matchingJob && matchingJob.external_id === rj.externalId;
        });
      }
      
      if (!rawJob) {
        console.warn(`Could not find raw job data for job ID ${job.id}`);
        continue;
      }
      
      // Get locations from the raw job and ensure they're properly split
      let rawLocations: string[] = [];
      
      if (rawJob.locations && rawJob.locations.length > 0) {
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
 * Check if any of the job locations indicate a remote position
 */
function checkForRemoteLocation(locations: string[]): boolean {
  if (!locations || locations.length === 0) return false;
  
  return locations.some(isRemoteLocation);
}

/**
 * Check if a single location string indicates a remote position
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