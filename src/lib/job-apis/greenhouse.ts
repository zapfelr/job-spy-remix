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
    
    // Use the content=true parameter to get full job descriptions
    const apiUrl = `https://boards-api.greenhouse.io/v1/boards/${companyName}/jobs?content=true`;
    
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
        // Check if we have content from the content=true parameter
        let jobDescription = '';
        let salaryInfo = { 
          min: null as number | null, 
          max: null as number | null, 
          currency: null as string | null, 
          interval: null as 'yearly' | 'monthly' | 'hourly' | null 
        };
        
        if (job.content) {
          try {
            // Decode HTML entities in the content
            jobDescription = decodeHtmlEntities(job.content);
            
            // Extract salary information from the content
            salaryInfo = extractSalaryInfo(jobDescription);
          } catch (error) {
            console.error(`Error processing job content for job ID ${job.id}:`, error);
            // Fallback to basic description if content processing fails
            jobDescription = job.metadata?.description || 
                           `${job.title} at ${job.company_name}. Location: ${job.location?.name || 'Remote/Various'}`;
          }
        } else {
          // Fallback if content is not available despite using content=true
          console.warn(`No content available for job ID ${job.id} despite using content=true parameter`);
          jobDescription = job.metadata?.description || 
                         `${job.title} at ${job.company_name}. Location: ${job.location?.name || 'Remote/Various'}`;
        }
        
        return {
          externalId: job.id.toString(),
          title: job.title || '',
          description: jobDescription,
          location: job.location?.name || '',
          department: job.departments?.length 
            ? job.departments.map((dept: any) => dept.name).join(', ') 
            : '',
          url: job.absolute_url || '',
          salary: {
            min: salaryInfo.min,
            max: salaryInfo.max,
            currency: salaryInfo.currency,
            interval: salaryInfo.interval
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
 * Helper function to decode HTML entities in job content
 */
function decodeHtmlEntities(html: string): string {
  if (!html) return '';
  
  try {
    // Simple HTML entity decoding for common entities
    return html
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ');
  } catch (error) {
    console.error('Error decoding HTML entities:', error);
    return html; // Return original string if decoding fails
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