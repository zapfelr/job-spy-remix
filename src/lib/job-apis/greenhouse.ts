import { RawJobData } from './types';

/**
 * Greenhouse API integration for fetching job listings
 */

/**
 * Fetches job listings from Greenhouse's public API
 * @param companyName The company identifier in Greenhouse
 * @returns Array of job objects
 */
export async function fetchGreenhouseJobs(companyName: string): Promise<RawJobData[]> {
  try {
    console.log(`Fetching jobs from Greenhouse for ${companyName}`);
    
    // Use the correct API endpoint as specified in the implementation plan
    const apiUrl = `https://boards-api.greenhouse.io/v1/boards/${companyName}/jobs`;
    
    console.log(`Making request to Greenhouse API: ${apiUrl}`);
    
    // Fetch jobs from Greenhouse API
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Greenhouse API returned ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`Received ${data.jobs ? data.jobs.length : 0} jobs from Greenhouse API`);
    
    // Transform Greenhouse job data to our standard format
    if (data.jobs && Array.isArray(data.jobs)) {
      // Process a maximum of 100 jobs to avoid hitting rate limits
      const jobsToProcess = data.jobs.slice(0, 100);
      console.log(`Processing ${jobsToProcess.length} jobs (limited to 100 max)`);
      
      // Map the jobs to our standard format
      return jobsToProcess.map((job: any) => {
        // For Greenhouse, we don't have full content in the initial response
        // We'll use a simplified description from available fields
        const description = job.metadata?.description || 
                           `${job.title} at ${job.company_name}. Location: ${job.location?.name || 'Remote/Various'}`;
        
        return {
          externalId: job.id.toString(),
          title: job.title || '',
          description: description,
          location: job.location?.name || '',
          department: job.departments?.[0]?.name || '',
          url: job.absolute_url || '',
          salary: {
            min: null,
            max: null,
            currency: 'USD', // Default assumption
            interval: 'yearly' // Default assumption
          }
        };
      });
    }
    
    return [];
  } catch (error) {
    console.error('Error fetching jobs from Greenhouse:', error);
    throw error;
  }
}

/**
 * Attempts to extract salary information from job description
 * This is a basic implementation that can be improved with more sophisticated parsing
 */
function extractSalaryInfo(content: string | null | undefined): {
  min: number | null;
  max: number | null;
  currency: string | null;
  interval: 'yearly' | 'monthly' | 'hourly' | null;
} {
  if (!content) {
    return { min: null, max: null, currency: null, interval: null };
  }

  // Default result
  const result: {
    min: number | null;
    max: number | null;
    currency: string | null;
    interval: 'yearly' | 'monthly' | 'hourly' | null;
  } = { min: null, max: null, currency: null, interval: null };
  
  try {
    // Look for common salary patterns
    // Example: "$100,000 - $150,000 per year"
    const salaryRegex = /\$([0-9,.]+)\s*-\s*\$([0-9,.]+)\s*(per|\/|\s)?\s*(year|annual|annually|month|monthly|hour|hourly)/i;
    const match = content.match(salaryRegex);
    
    if (match) {
      // Remove commas and convert to number
      const min = parseInt(match[1].replace(/,/g, ''), 10);
      const max = parseInt(match[2].replace(/,/g, ''), 10);
      
      if (!isNaN(min)) result.min = min;
      if (!isNaN(max)) result.max = max;
      result.currency = 'USD'; // Assuming USD for now
      
      // Determine interval
      const intervalText = match[4].toLowerCase();
      if (intervalText.includes('year') || intervalText.includes('annual')) {
        result.interval = 'yearly';
      } else if (intervalText.includes('month')) {
        result.interval = 'monthly';
      } else if (intervalText.includes('hour')) {
        result.interval = 'hourly';
      }
    }
  } catch (error) {
    console.error('Error extracting salary info:', error);
  }
  
  return result;
} 