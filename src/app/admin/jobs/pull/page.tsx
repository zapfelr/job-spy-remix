import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase';

export const metadata = {
  title: 'Manual Job Pull | Admin Dashboard | Job Spy',
  description: 'Manually pull jobs for a company in the Job Spy system',
};

// Function to get companies for the dropdown
async function getCompanies() {
  const supabase = createServerSupabaseClient();
  
  const { data: companies, error } = await supabase
    .from('companies')
    .select('id, name')
    .order('name');
  
  if (error) {
    console.error('Error fetching companies:', error);
    return [];
  }
  
  return companies || [];
}

// Server action to trigger a manual job pull
async function triggerJobPull(formData: FormData) {
  'use server';
  
  const companyId = formData.get('companyId') as string;
  
  if (!companyId) {
    // In a real app, we would handle this error better
    console.error('Missing company ID');
    return;
  }
  
  const supabase = createServerSupabaseClient();
  
  // Get the company details
  const { data: company, error: companyError } = await supabase
    .from('companies')
    .select('*')
    .eq('id', companyId)
    .single();
  
  if (companyError || !company) {
    console.error('Error fetching company:', companyError);
    return;
  }
  
  // In a real implementation, we would trigger the job pull for this company
  // For now, we'll just log the company and redirect
  console.log(`Triggering job pull for company: ${company.name}`);
  
  // Redirect back to the companies page
  redirect('/admin/companies?message=Job+pull+initiated+for+' + encodeURIComponent(company.name));
}

export default async function ManualJobPullPage({ searchParams }: { searchParams: { company?: string } }) {
  const companies = await getCompanies();
  const selectedCompanyId = searchParams.company || '';
  
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Manual Job Pull</h1>
      
      <div className="bg-white rounded-lg shadow-md p-6">
        <form action={triggerJobPull}>
          <div className="mb-4">
            <label htmlFor="companyId" className="block text-sm font-medium text-gray-700 mb-1">
              Select Company
            </label>
            <select
              id="companyId"
              name="companyId"
              defaultValue={selectedCompanyId}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select a company</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
          </div>
          
          <div className="mt-6 flex justify-end">
            <a
              href="/admin/companies"
              className="bg-gray-200 text-gray-700 px-4 py-2 rounded mr-2 hover:bg-gray-300 transition"
            >
              Cancel
            </a>
            <button
              type="submit"
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition"
            >
              Pull Jobs
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 