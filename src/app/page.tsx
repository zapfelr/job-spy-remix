import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default async function Home() {
  // We'll skip querying information_schema.tables directly since it's causing an error
  // Instead, we'll just check if we can access the companies table
  
  // Get count of companies
  const { count: companiesCount, error: companiesError } = await supabase
    .from('companies')
    .select('*', { count: 'exact', head: true });
  
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold">Job Spy</h1>
          <Link 
            href="/login" 
            className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded"
          >
            Login / Sign Up
          </Link>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md mb-6">
          <h2 className="text-2xl font-semibold mb-4">Database Status</h2>
          
          <div className="mb-4">
            <p>Database connection: {companiesError ? 
              <span className="text-red-500">Error</span> : 
              <span className="text-green-500">Connected</span>}
            </p>
            
            {companiesError && (
              <div className="text-red-500 mt-2">
                <p>Error details:</p>
                <pre className="mt-2 p-2 bg-red-100 dark:bg-red-900 rounded overflow-auto">
                  {JSON.stringify(companiesError, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold mb-4">Companies</h2>
          
          {companiesError ? (
            <div className="text-red-500">
              <p>Error fetching companies:</p>
              <pre className="mt-2 p-2 bg-red-100 dark:bg-red-900 rounded overflow-auto">
                {JSON.stringify(companiesError, null, 2)}
              </pre>
            </div>
          ) : (
            <div className="text-green-500">
              <p>Companies table is ready!</p>
              <p className="mt-2">Total companies: {companiesCount || 0}</p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
