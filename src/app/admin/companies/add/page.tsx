import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase';

export const metadata = {
  title: 'Add Company | Admin Dashboard | Job Spy',
  description: 'Add a new company to the Job Spy system',
};

// Server action to add a new company
async function addCompany(formData: FormData) {
  'use server';
  
  const name = formData.get('name') as string;
  const jobBoardUrl = formData.get('jobBoardUrl') as string;
  const jobBoardType = formData.get('jobBoardType') as string;
  const boardIdentifier = formData.get('boardIdentifier') as string;
  const logoUrl = formData.get('logoUrl') as string;
  const industry = formData.get('industry') as string;
  
  if (!name || !jobBoardUrl || !jobBoardType || !boardIdentifier) {
    // In a real app, we would handle this error better
    console.error('Missing required fields');
    return;
  }
  
  const supabase = createServerSupabaseClient();
  
  const { data, error } = await supabase
    .from('companies')
    .insert({
      name,
      job_board_url: jobBoardUrl,
      job_board_type: jobBoardType,
      board_identifier: boardIdentifier,
      logo_url: logoUrl || null,
      industry: industry || null,
      status: 'active',
    })
    .select()
    .single();
  
  if (error) {
    console.error('Error adding company:', error);
    return;
  }
  
  // Redirect to the companies page
  redirect('/admin/companies');
}

export default function AddCompanyPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Add Company</h1>
      
      <div className="bg-white rounded-lg shadow-md p-6">
        <form action={addCompany}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="col-span-2">
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Company Name *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div>
              <label htmlFor="jobBoardType" className="block text-sm font-medium text-gray-700 mb-1">
                Job Board Type *
              </label>
              <select
                id="jobBoardType"
                name="jobBoardType"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select a job board type</option>
                <option value="ashby">Ashby</option>
                <option value="greenhouse">Greenhouse</option>
              </select>
            </div>
            
            <div>
              <label htmlFor="boardIdentifier" className="block text-sm font-medium text-gray-700 mb-1">
                Board Identifier *
              </label>
              <input
                type="text"
                id="boardIdentifier"
                name="boardIdentifier"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="mt-1 text-xs text-gray-500">
                For Ashby: JOB_BOARD_NAME, for Greenhouse: company_name
              </p>
            </div>
            
            <div className="col-span-2">
              <label htmlFor="jobBoardUrl" className="block text-sm font-medium text-gray-700 mb-1">
                Job Board URL *
              </label>
              <input
                type="url"
                id="jobBoardUrl"
                name="jobBoardUrl"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div>
              <label htmlFor="logoUrl" className="block text-sm font-medium text-gray-700 mb-1">
                Logo URL
              </label>
              <input
                type="url"
                id="logoUrl"
                name="logoUrl"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div>
              <label htmlFor="industry" className="block text-sm font-medium text-gray-700 mb-1">
                Industry
              </label>
              <input
                type="text"
                id="industry"
                name="industry"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
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
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
            >
              Add Company
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 