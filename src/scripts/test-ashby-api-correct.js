/**
 * Test script for Ashby API integration using the correct endpoint
 * 
 * Run with: node src/scripts/test-ashby-api-correct.js
 */

async function fetchAshbyJobs(boardIdentifier, jobBoardUrl) {
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
    
    // Log the structure of the first job for debugging
    if (data.jobs && data.jobs.length > 0) {
      console.log('First job structure:', JSON.stringify(data.jobs[0], null, 2));
    }
    
    // Transform Ashby job data to our standard format
    if (data.jobs && Array.isArray(data.jobs)) {
      return data.jobs.map(job => ({
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
function mapSalaryInterval(interval) {
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

async function main() {
  try {
    console.log('Testing Ashby API integration for Cohere');
    
    const boardIdentifier = 'Cohere';
    const jobBoardUrl = 'https://jobs.ashbyhq.com/cohere';
    
    console.log(`Fetching jobs for ${boardIdentifier} from ${jobBoardUrl}`);
    const jobs = await fetchAshbyJobs(boardIdentifier, jobBoardUrl);
    
    console.log(`Fetched ${jobs.length} jobs:`);
    jobs.forEach((job, index) => {
      console.log(`\nJob ${index + 1}:`);
      console.log(`Title: ${job.title}`);
      console.log(`Location: ${job.location}`);
      console.log(`Department: ${job.department}`);
      console.log(`URL: ${job.url}`);
      console.log(`Salary: ${job.salary.min}-${job.salary.max} ${job.salary.currency} (${job.salary.interval})`);
    });
    
    console.log('\nTest completed successfully');
  } catch (error) {
    console.error('Error testing Ashby API:', error);
  }
}

main(); 