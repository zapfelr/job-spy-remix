import { createServerSupabaseClient } from '@/lib/supabase';
import Link from 'next/link';

export const metadata = {
  title: 'Error Monitoring | Admin Dashboard | Job Spy',
  description: 'Monitor API errors in the Job Spy system',
};

async function getApiErrors() {
  const supabase = createServerSupabaseClient();
  
  const { data: errors, error } = await supabase
    .from('api_errors')
    .select('*, companies(name)')
    .order('created_at', { ascending: false })
    .limit(100);
  
  if (error) {
    console.error('Error fetching API errors:', error);
    return [];
  }
  
  return errors || [];
}

export default async function ErrorsPage() {
  const errors = await getApiErrors();
  
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Error Monitoring</h1>
        <Link 
          href="/admin/errors/retry" 
          className="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700 transition"
        >
          Retry Failed Jobs
        </Link>
      </div>
      
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Company
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                API Type
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Error Message
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {errors.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                  No API errors found
                </td>
              </tr>
            ) : (
              errors.map((error) => (
                <tr key={error.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {error.companies?.name || error.company_name || 'Unknown'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {error.api_type}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 max-w-md truncate">
                    {error.error_message}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(error.created_at).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {error.company_id && (
                      <Link 
                        href={`/admin/jobs/pull?company=${error.company_id}`}
                        className="text-green-600 hover:text-green-900"
                      >
                        Retry
                      </Link>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
} 