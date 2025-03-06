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
        
        // Handle multiple locations
        let locations: string[] = [];
        
        // Check if job has multiple locations
        if (job.offices && Array.isArray(job.offices) && job.offices.length > 0) {
          // Extract location names from offices array
          locations = job.offices.map((office: any) => office.name || office.location || '').filter(Boolean);
        }
        // Use single location if available
        else if (job.location?.name) {
          locations = [job.location.name];
        }
        
        // Try to extract locations from the job description if we still don't have any
        if (locations.length === 0 || (locations.length === 1 && locations[0] === 'Remote')) {
          const extractedLocations = extractLocationsFromDescription(jobDescription);
          if (extractedLocations.length > 0) {
            locations = extractedLocations;
          }
        }
        
        // If no locations found, use 'Remote' as default
        if (locations.length === 0) {
          locations = ['Remote'];
        }
        
        return {
          externalId: job.id.toString(),
          title: job.title || '',
          description: jobDescription,
          locations: locations,
          location: locations.join(', '), // For backward compatibility
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
 * Decodes HTML entities in a string
 */
function decodeHtmlEntities(html: string): string {
  // Replace common HTML entities with their character equivalents
  return html
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#x2F;/g, '/')
    .replace(/&#x27;/g, "'")
    .replace(/&#x60;/g, '`')
    .replace(/&#x3D;/g, '=')
    .replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(dec));
}

/**
 * Extracts salary information from job description
 */
function extractSalaryInfo(description: string): { 
  min: number | null; 
  max: number | null; 
  currency: string | null; 
  interval: 'yearly' | 'monthly' | 'hourly' | null;
} {
  // Default return value
  const defaultReturn = {
    min: null,
    max: null,
    currency: null,
    interval: null as 'yearly' | 'monthly' | 'hourly' | null
  };
  
  try {
    // Look for salary patterns like "$100,000 - $150,000" or "$100k - $150k"
    const salaryPattern = /\$(\d{1,3}(?:,\d{3})*(?:\.\d+)?|\d+k)\s*(?:-|to)\s*\$(\d{1,3}(?:,\d{3})*(?:\.\d+)?|\d+k)/i;
    const match = description.match(salaryPattern);
    
    if (!match) return defaultReturn;
    
    // Extract min and max values
    let min = match[1];
    let max = match[2];
    
    // Convert "k" notation to full numbers
    if (min.toLowerCase().endsWith('k')) {
      min = (parseFloat(min.slice(0, -1)) * 1000).toString();
    }
    
    if (max.toLowerCase().endsWith('k')) {
      max = (parseFloat(max.slice(0, -1)) * 1000).toString();
    }
    
    // Remove commas
    min = min.replace(/,/g, '');
    max = max.replace(/,/g, '');
    
    // Determine interval (yearly, monthly, hourly)
    let interval: 'yearly' | 'monthly' | 'hourly' | null = null;
    
    if (description.match(/per\s+year|annual|yearly|annually/i)) {
      interval = 'yearly';
    } else if (description.match(/per\s+month|monthly/i)) {
      interval = 'monthly';
    } else if (description.match(/per\s+hour|hourly/i)) {
      interval = 'hourly';
    } else {
      // Default to yearly if not specified
      interval = 'yearly';
    }
    
    return {
      min: parseInt(min, 10),
      max: parseInt(max, 10),
      currency: 'USD', // Assuming USD for now
      interval
    };
  } catch (error) {
    console.error('Error extracting salary info:', error);
    return defaultReturn;
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
    /\bwork\s*(?:from|in|at)\s*(.*?)(?:\.|,|\n|<\/p>|<br>)/i,
    /\bremote\s*(?:in|across)\s*(.*?)(?:\.|,|\n|<\/p>|<br>)/i
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
  
  // Look for specific location mentions in the text
  const commonLocations = [
    'New York', 'San Francisco', 'Los Angeles', 'Chicago', 'Boston', 'Seattle', 
    'Austin', 'Denver', 'Toronto', 'London', 'Berlin', 'Paris', 'Sydney', 
    'Singapore', 'Tokyo', 'United States', 'Canada', 'UK', 'Europe', 'Asia'
  ];
  
  const foundLocations = commonLocations.filter(loc => 
    description.includes(loc) || 
    description.includes(loc.toUpperCase()) || 
    description.includes(loc.toLowerCase())
  );
  
  if (foundLocations.length > 0) {
    return foundLocations;
  }
  
  return [];
} 