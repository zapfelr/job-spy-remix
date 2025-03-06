import { createServerSupabaseClient } from '@/lib/supabase';

export const metadata = {
  title: 'Admin Dashboard | Job Spy',
  description: 'Admin dashboard for Job Spy',
};

async function getStats() {
  const supabase = createServerSupabaseClient();
  
  // Get company count
  const { data: companies, error: companiesError } = await supabase
    .from('companies')
    .select('id', { count: 'exact' });
  
  // Get job count
  const { data: jobs, error: jobsError } = await supabase
    .from('jobs')
    .select('id', { count: 'exact' });
  
  // Get error count
  const { data: errors, error: errorsError } = await supabase
    .from('api_errors')
    .select('id', { count: 'exact' });
  
  return {
    companiesCount: companies?.length || 0,
    jobsCount: jobs?.length || 0,
    errorsCount: errors?.length || 0,
  };
}

export default async function AdminDashboard() {
  const stats = await getStats();
  
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-lg font-semibold text-gray-700">Companies</h2>
          <p className="text-3xl font-bold mt-2">{stats.companiesCount}</p>
          <a href="/admin/companies" className="text-blue-600 hover:underline mt-2 inline-block">
            Manage Companies
          </a>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-lg font-semibold text-gray-700">Jobs</h2>
          <p className="text-3xl font-bold mt-2">{stats.jobsCount}</p>
          <a href="/admin/jobs" className="text-blue-600 hover:underline mt-2 inline-block">
            Manage Jobs
          </a>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-lg font-semibold text-gray-700">API Errors</h2>
          <p className="text-3xl font-bold mt-2">{stats.errorsCount}</p>
          <a href="/admin/errors" className="text-blue-600 hover:underline mt-2 inline-block">
            View Errors
          </a>
        </div>
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-lg font-semibold text-gray-700 mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-4">
          <a 
            href="/admin/companies/add" 
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
          >
            Add Company
          </a>
          <a 
            href="/admin/jobs/pull" 
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition"
          >
            Manual Job Pull
          </a>
          <a 
            href="/admin/errors/retry" 
            className="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700 transition"
          >
            Retry Failed Jobs
          </a>
        </div>
      </div>
    </div>
  );
} 