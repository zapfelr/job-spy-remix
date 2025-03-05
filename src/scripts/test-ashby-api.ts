/**
 * Test script for Ashby API integration
 * 
 * Run with: npx ts-node src/scripts/test-ashby-api.ts
 */

import { fetchAshbyJobs } from '../lib/job-apis/ashby';

// Define a simple job interface for the test
interface Job {
  title: string;
  location: string;
  department: string;
  url: string;
  externalId: string;
  description: string;
  salary: {
    min: number | null;
    max: number | null;
    currency: string;
    interval: string;
  };
}

async function main() {
  try {
    console.log('Testing Ashby API integration for Cohere');
    
    const boardIdentifier = 'Cohere';
    const jobBoardUrl = 'https://jobs.ashbyhq.com/cohere';
    
    console.log(`Fetching jobs for ${boardIdentifier} from ${jobBoardUrl}`);
    const jobs = await fetchAshbyJobs(boardIdentifier, jobBoardUrl);
    
    console.log(`Fetched ${jobs.length} jobs:`);
    jobs.forEach((job: Job, index: number) => {
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