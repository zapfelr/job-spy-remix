/**
 * Test script for inserting a job into the database
 * 
 * Run with: node src/scripts/test-db-insert.js
 */

const { createClient } = require('@supabase/supabase-js');

async function main() {
  try {
    console.log('Testing database insertion for Cohere jobs');
    
    // Create Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://cpgwkmqyffzhuqnfwahq.supabase.co';
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseKey) {
      throw new Error('Supabase key not found. Please set SUPABASE_SERVICE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable.');
    }
    
    console.log(`Connecting to Supabase at ${supabaseUrl}`);
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Get the Cohere company
    const { data: companies, error: companyError } = await supabase
      .from('companies')
      .select('*')
      .eq('name', 'Cohere');
    
    if (companyError) {
      throw new Error(`Error fetching Cohere company: ${companyError.message}`);
    }
    
    if (!companies || companies.length === 0) {
      throw new Error('Cohere company not found in the database');
    }
    
    const company = companies[0];
    console.log(`Found Cohere company with ID: ${company.id}`);
    
    // Insert a test job
    const testJob = {
      company_id: company.id,
      external_id: 'test-job-1',
      title: 'Test Software Engineer',
      description: 'This is a test job description',
      location: 'Remote',
      department_raw: 'Engineering',
      url: 'https://jobs.ashbyhq.com/cohere/test-job-1',
      salary_min: 100000,
      salary_max: 150000,
      salary_currency: 'USD',
      salary_interval: 'yearly',
      status: 'active',
      last_seen_active: new Date().toISOString(),
      created_at: new Date().toISOString(),
      last_change: new Date().toISOString()
    };
    
    console.log('Inserting test job:', testJob);
    const { data: jobData, error: jobError } = await supabase
      .from('jobs')
      .upsert(testJob, {
        onConflict: 'company_id,external_id'
      });
    
    if (jobError) {
      throw new Error(`Error inserting test job: ${jobError.message}`);
    }
    
    console.log('Test job inserted successfully');
    
    // Update company job count
    const { error: updateError } = await supabase
      .from('companies')
      .update({
        total_jobs_count: 1,
        last_updated: new Date().toISOString()
      })
      .eq('id', company.id);
    
    if (updateError) {
      throw new Error(`Error updating company job count: ${updateError.message}`);
    }
    
    console.log('Company job count updated successfully');
    console.log('Test completed successfully');
  } catch (error) {
    console.error('Error testing database insertion:', error);
  }
}

main(); 