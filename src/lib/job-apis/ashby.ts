import { RawJobData } from './types';

/**
 * Ashby API integration for fetching job listings
 */

/**
 * Fetches job listings from Ashby's public API
 * @param boardIdentifier The company identifier in Ashby (usually the company name)
 * @param jobBoardUrl The URL of the company's job board
 * @returns Array of job objects
 */
export async function fetchAshbyJobs(boardIdentifier: string, jobBoardUrl: string) {
  try {
    console.log(`Fetching jobs from Ashby for ${boardIdentifier} at ${jobBoardUrl}`);
    
    // Use the correct API endpoint as specified in the implementation plan
    const apiUrl = `https://api.ashbyhq.com/posting-api/job-board/${boardIdentifier}?includeCompensation=true`;
    
    console.log(`Making request to Ashby API: ${apiUrl}`);
    
    // Fetch jobs from Ashby API
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Ashby API returned ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log(`Received ${data.jobs ? data.jobs.length : 0} jobs from Ashby API`);
    
    // Transform Ashby job data to our standard format
    if (data.jobs && Array.isArray(data.jobs)) {
      // Filter for jobs where isListed = true
      const listedJobs = data.jobs.filter((job: any) => job.isListed === true);
      console.log(`Filtered to ${listedJobs.length} publicly listed jobs (excluding ${data.jobs.length - listedJobs.length} unlisted jobs)`);
      
      return listedJobs.map((job: any) => ({
        externalId: job.id,
        title: job.title || '',
        description: job.description || '',
        location: job.location?.name || '',
        department: job.department?.name || '',
        url: job.applicationUrl || job.hostedUrl || '',
        salary: {
          min: job.compensation?.min || null,
          max: job.compensation?.max || null,
          currency: job.compensation?.currency || null,
          interval: mapSalaryInterval(job.compensation?.interval)
        }
      }));
    }
    
    return [];
  } catch (error) {
    console.error('Error fetching jobs from Ashby:', error);
    throw error;
  }
}

/**
 * Maps Ashby salary interval to our standard format
 */
function mapSalaryInterval(interval: string | null | undefined): 'yearly' | 'monthly' | 'hourly' | null {
  if (!interval) return null;
  
  switch (interval.toLowerCase()) {
    case 'year':
    case 'yearly':
    case 'annual':
      return 'yearly';
    case 'month':
    case 'monthly':
      return 'monthly';
    case 'hour':
    case 'hourly':
      return 'hourly';
    default:
      return null;
  }
} 