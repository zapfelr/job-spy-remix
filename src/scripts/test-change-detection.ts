import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/database';
import { processJobData } from '../lib/job-processor';
import dotenv from 'dotenv';

// Load environment variables
console.log('Loading environment variables from .env.local');
dotenv.config({ path: '.env.local' });

// Create Supabase client with hardcoded values
const supabaseUrl = 'https://cpgwkmqyffzhuqnfwahq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNwZ3drbXF5ZmZ6aHVxbmZ3YWhxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTIxMzc5NSwiZXhwIjoyMDU2Nzg5Nzk1fQ.USgZZKTYMxQIM-s-OsZfWQ5o6t_auaVD95aQCOjXpr4';

console.log(`Using Supabase URL: ${supabaseUrl}`);
console.log(`Using Supabase key: ${supabaseKey ? 'Yes (key available)' : 'No (key missing)'}`);

const supabase = createClient<Database>(supabaseUrl, supabaseKey);

/**
 * Test job change detection
 */
async function testChangeDetection() {
  try {
    console.log('Starting change detection test');
    
    // Get a test company
    const { data: companies, error: companyError } = await supabase
      .from('companies')
      .select('*')
      .limit(1);
    
    if (companyError || !companies || companies.length === 0) {
      console.error('Error fetching test company:', companyError);
      return;
    }
    
    const company = companies[0];
    console.log(`Using test company: ${company.name} (ID: ${company.id})`);
    
    // Create test job data
    const testJobs = [
      // New job
      {
        externalId: `test-job-${Date.now()}-1`,
        title: 'Test New Job',
        description: 'This is a test new job',
        location: 'San Francisco, CA',
        locations: ['San Francisco, CA'],
        department: 'Engineering',
        url: 'https://example.com/jobs/test-new',
        salary: {
          min: 100000,
          max: 150000,
          currency: 'USD',
          interval: 'yearly'
        }
      },
      // Modified job (assuming this external ID exists)
      {
        externalId: 'existing-job-id', // Replace with an actual ID from your database
        title: 'Updated Job Title',
        description: 'This description has been updated',
        location: 'Remote, US',
        locations: ['Remote, US'],
        department: 'Product',
        url: 'https://example.com/jobs/existing',
        salary: {
          min: 120000,
          max: 180000,
          currency: 'USD',
          interval: 'yearly'
        }
      }
    ];
    
    // Process the test jobs
    // @ts-ignore - Ignoring type mismatch between our Database type and the one expected by processJobData
    await processJobData(supabase, company, testJobs);
    
    // Check for job changes
    const { data: changes, error: changesError } = await supabase
      .from('job_changes')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (changesError) {
      console.error('Error fetching job changes:', changesError);
      return;
    }
    
    console.log(`Found ${changes.length} recent job changes:`);
    changes.forEach((change, index) => {
      console.log(`\nChange ${index + 1}:`);
      console.log(`Type: ${change.change_type}`);
      console.log(`Job ID: ${change.job_id || 'N/A'}`);
      console.log(`Company ID: ${change.company_id}`);
      console.log(`Created at: ${change.created_at}`);
      
      if (change.previous_title || change.new_title) {
        console.log(`Title: ${change.previous_title || 'N/A'} -> ${change.new_title || 'N/A'}`);
      }
      
      if (change.previous_location || change.new_location) {
        console.log(`Location: ${change.previous_location || 'N/A'} -> ${change.new_location || 'N/A'}`);
      }
      
      if (change.previous_salary_min || change.new_salary_min || change.previous_salary_max || change.new_salary_max) {
        console.log(`Salary: ${change.previous_salary_min || 'N/A'}-${change.previous_salary_max || 'N/A'} -> ${change.new_salary_min || 'N/A'}-${change.new_salary_max || 'N/A'}`);
      }
    });
    
    console.log('\nChange detection test completed');
  } catch (error) {
    console.error('Error in test:', error);
  }
}

// Run the test
testChangeDetection().finally(() => {
  console.log('Test script finished');
  process.exit(0);
}); 