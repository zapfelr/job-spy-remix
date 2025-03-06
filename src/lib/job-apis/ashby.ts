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
      
      return listedJobs.map((job: any) => {
        // Extract compensation data if available
        let salaryMin = null;
        let salaryMax = null;
        let salaryCurrency = null;
        let salaryInterval = null;
        
        if (data.compensation && data.compensation.summaryComponents) {
          const salaryComponent = data.compensation.summaryComponents.find(
            (comp: any) => comp.compensationType === 'Salary'
          );
          
          if (salaryComponent) {
            salaryMin = salaryComponent.minValue;
            salaryMax = salaryComponent.maxValue;
            salaryCurrency = salaryComponent.currencyCode;
            salaryInterval = mapSalaryInterval(salaryComponent.interval);
          }
        }
        
        return {
          externalId: job.id || `ashby-${boardIdentifier}-${job.title}`,
          title: job.title || '',
          description: job.descriptionHtml || job.descriptionPlain || '',
          // Use the correct location field from the API
          location: job.location || 
                   (job.address?.postalAddress?.addressLocality ? 
                    `${job.address.postalAddress.addressLocality}, ${job.address.postalAddress.addressRegion}` : 
                    ''),
          // Department is a string in Ashby API
          department: job.department || '',
          // Use the correct URL field from the API
          url: job.jobUrl || job.applyUrl || '',
          salary: {
            min: salaryMin,
            max: salaryMax,
            currency: salaryCurrency,
            interval: salaryInterval
          }
        };
      });
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
  
  // Ashby uses format like "1 YEAR" or "1 MONTH"
  if (interval.includes('YEAR')) return 'yearly';
  if (interval.includes('MONTH')) return 'monthly';
  if (interval.includes('HOUR')) return 'hourly';
  
  // Fallback to the previous mapping for compatibility
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