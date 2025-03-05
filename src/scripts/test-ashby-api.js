/**
 * Test script for Ashby API integration
 * 
 * Run with: node src/scripts/test-ashby-api.js
 */

// Simple implementation of the Ashby API fetch function
async function fetchAshbyJobs(boardIdentifier, jobBoardUrl) {
  try {
    console.log(`Fetching jobs from Ashby for ${boardIdentifier} at ${jobBoardUrl}`);
    
    // Extract the company slug from the job board URL
    const urlParts = jobBoardUrl.split('/');
    const companySlug = urlParts[urlParts.length - 1].toLowerCase();
    
    // Construct the API URL
    const apiUrl = `https://jobs.ashbyhq.com/api/non-auth/${companySlug}/jobs`;
    
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
      return data.jobs.map(job => ({
        externalId: job.id,
        title: job.title,
        description: job.descriptionPlain || '',
        location: Array.isArray(job.locationNames) ? job.locationNames.join(', ') : job.locationNames || 'Remote',
        department: job.departmentName || '',
        url: `${jobBoardUrl}/${job.id}`,
        salary: {
          min: null,
          max: null,
          currency: 'USD',
          interval: 'yearly'
        }
      }));
    }
    
    return [];
  } catch (error) {
    console.error('Error fetching jobs from Ashby:', error);
    throw error;
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
    });
    
    console.log('\nTest completed successfully');
  } catch (error) {
    console.error('Error testing Ashby API:', error);
  }
}

main(); 