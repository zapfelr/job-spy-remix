import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase';

export const metadata = {
  title: 'Retry Failed Jobs | Admin Dashboard | Job Spy',
  description: 'Retry failed job pulls in the Job Spy system',
};

// Server action to retry failed jobs
async function retryFailedJobs(formData: FormData) {
  'use server';
  
  const days = parseInt(formData.get('days') as string) || 1;
  
  const supabase = createServerSupabaseClient();
  
  // Get companies with errors in the last X days
  const { data: errors, error: errorsError } = await supabase
    .from('api_errors')
    .select('company_id')
    .gte('created_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
    .not('company_id', 'is', null);
  
  if (errorsError) {
    console.error('Error fetching companies with errors:', errorsError);
    return;
  }
  
  // Extract unique company IDs
  const companyIds = [...new Set(errors?.map(error => error.company_id))];
  
  if (companyIds.length === 0) {
    // No companies to retry
    redirect('/admin/errors?message=No+companies+to+retry');
    return;
  }
  
  // In a real implementation, we would trigger the job pull for these companies
  // For now, we'll just log the companies and redirect
  console.log(`Retrying job pulls for ${companyIds.length} companies`);
  
  // Mark these errors as retried (in a real implementation)
  // For now, we'll just redirect back to the errors page
  redirect('/admin/errors?message=Retry+initiated+for+' + companyIds.length + '+companies');
}

export default function RetryFailedJobsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Retry Failed Jobs</h1>
      
      <div className="bg-white rounded-lg shadow-md p-6">
        <form action={retryFailedJobs}>
          <div className="mb-4">
            <label htmlFor="days" className="block text-sm font-medium text-gray-700 mb-1">
              Retry errors from the last X days
            </label>
            <select
              id="days"
              name="days"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="1">1 day</option>
              <option value="3">3 days</option>
              <option value="7">7 days</option>
              <option value="14">14 days</option>
              <option value="30">30 days</option>
            </select>
          </div>
          
          <div className="mt-6 flex justify-end">
            <a
              href="/admin/errors"
              className="bg-gray-200 text-gray-700 px-4 py-2 rounded mr-2 hover:bg-gray-300 transition"
            >
              Cancel
            </a>
            <button
              type="submit"
              className="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700 transition"
            >
              Retry Failed Jobs
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 