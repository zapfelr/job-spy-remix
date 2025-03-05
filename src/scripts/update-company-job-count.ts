import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/database';

// Supabase configuration
const supabaseUrl = 'https://cpgwkmqyffzhuqnfwahq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNwZ3drbXF5ZmZ6aHVxbmZ3YWhxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MDc5NDE5OSwiZXhwIjoyMDU2MzcwMTk5fQ.ejuiz7HJxbyYVCXRbyIfHNp46ZHC-pOXdX89GnT9NYE';

// Create Supabase client
const supabase = createClient<Database>(supabaseUrl, supabaseKey);

async function updateCompanyJobCount() {
  try {
    // Company ID for Cohere
    const companyId = 'ba4f9081-2e12-4fc3-9850-4c93090995f6';
    
    console.log(`Getting job count for company ${companyId}...`);
    
    // Get the count of active jobs for this company
    const { count, error: countError } = await supabase
      .from('jobs')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .eq('status', 'active');
    
    if (countError) {
      console.error('Error getting job count:', countError);
      return;
    }
    
    console.log(`Found ${count} active jobs for company ${companyId}`);
    
    // Update the company record with the actual count
    const { error: updateError } = await supabase
      .from('companies')
      .update({
        total_jobs_count: count,
        last_updated: new Date().toISOString()
      })
      .eq('id', companyId);
    
    if (updateError) {
      console.error('Error updating company job count:', updateError);
    } else {
      console.log(`Successfully updated company ${companyId} job count to ${count}`);
    }
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

// Run the function
updateCompanyJobCount()
  .then(() => console.log('Done'))
  .catch(err => console.error('Error:', err)); 