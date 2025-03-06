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
        
        // Handle multiple locations
        let locations: string[] = [];
        
        // Check if locationNames is available (from some Ashby API responses)
        if (job.locationNames && Array.isArray(job.locationNames)) {
          locations = job.locationNames;
        } 
        // Check if locations array is available
        else if (job.locations && Array.isArray(job.locations)) {
          locations = job.locations.map((loc: any) => loc.name || loc.text || '').filter(Boolean);
        }
        // Use single location if available
        else if (job.location) {
          if (typeof job.location === 'string') {
            locations = [job.location];
          } else if (job.location.name) {
            locations = [job.location.name];
          }
        }
        // Try to use address as fallback
        else if (job.address?.postalAddress?.addressLocality) {
          locations = [`${job.address.postalAddress.addressLocality}, ${job.address.postalAddress.addressRegion}`];
        }
        
        // Try to extract locations from the job description if we still don't have any
        if (locations.length === 0 || (locations.length === 1 && locations[0] === 'Remote')) {
          const description = job.descriptionHtml || job.descriptionPlain || '';
          const extractedLocations = extractLocationsFromDescription(description);
          if (extractedLocations.length > 0) {
            locations = extractedLocations;
          }
        }
        
        // If still no locations, use 'Remote' as default
        if (locations.length === 0) {
          locations = ['Remote'];
        }
        
        return {
          externalId: job.id || `ashby-${boardIdentifier}-${job.title}`,
          title: job.title || '',
          description: job.descriptionHtml || job.descriptionPlain || '',
          // Include both locations array and single location for backward compatibility
          locations: locations,
          location: locations.join(', '),
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
function mapSalaryInterval(interval: string | null): 'yearly' | 'monthly' | 'hourly' | null {
  if (!interval) return null;
  
  switch (interval.toLowerCase()) {
    case 'yearly':
    case 'year':
    case 'annual':
      return 'yearly';
    case 'monthly':
    case 'month':
      return 'monthly';
    case 'hourly':
    case 'hour':
      return 'hourly';
    default:
      return null;
  }
}

/**
 * Attempts to extract location information from job description
 */
function extractLocationsFromDescription(description: string): string[] {
  if (!description) return [];
  
  // Common location patterns in job descriptions
  const locationPatterns = [
    /\blocation(?:s)?\s*(?::|is|are)\s*(.*?)(?:\.|,|\n|<\/p>|<br>)/i,
    /\boffice(?:s)?\s*(?::|in|at)\s*(.*?)(?:\.|,|\n|<\/p>|<br>)/i,
    /\bposition(?:s)?\s*(?:is|are)\s*(?:in|at)\s*(.*?)(?:\.|,|\n|<\/p>|<br>)/i,
    /\bbased\s*(?:in|at)\s*(.*?)(?:\.|,|\n|<\/p>|<br>)/i,
    /\bwork\s*(?:from|in|at)\s*(.*?)(?:\.|,|\n|<\/p>|<br>)/i
  ];
  
  for (const pattern of locationPatterns) {
    const match = description.match(pattern);
    if (match && match[1]) {
      // Clean up the extracted location text
      const locationText = match[1]
        .replace(/<[^>]*>/g, '') // Remove HTML tags
        .replace(/&nbsp;/g, ' ') // Replace &nbsp; with space
        .trim();
      
      // Split by common delimiters
      const delimiters = [',', ' or ', ' and ', '/', '·', '-', '&'];
      for (const delimiter of delimiters) {
        if (locationText.includes(delimiter)) {
          return locationText
            .split(delimiter)
            .map(loc => loc.trim())
            .filter(Boolean);
        }
      }
      
      // If no delimiters found, return as a single location
      return [locationText];
    }
  }
  
  return [];
} 