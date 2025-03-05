import { supabase } from '@/lib/supabase';

export default async function Home() {
  // Get a list of all tables
  const { data: tables, error: tablesError } = await supabase
    .from('information_schema.tables')
    .select('table_name')
    .eq('table_schema', 'public');
  
  // Get count of companies
  const { count: companiesCount, error: companiesError } = await supabase
    .from('companies')
    .select('*', { count: 'exact', head: true });
  
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm">
        <h1 className="text-4xl font-bold mb-8">Job Spy</h1>
        
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md mb-6">
          <h2 className="text-2xl font-semibold mb-4">Database Status</h2>
          
          {tablesError ? (
            <div className="text-red-500">
              <p>Error fetching tables:</p>
              <pre className="mt-2 p-2 bg-red-100 dark:bg-red-900 rounded overflow-auto">
                {JSON.stringify(tablesError, null, 2)}
              </pre>
            </div>
          ) : (
            <div>
              <p className="mb-2">Database tables:</p>
              <ul className="list-disc pl-5 mb-4">
                {tables?.map((table, index) => (
                  <li key={index} className="mb-1">{table.table_name}</li>
                ))}
              </ul>
            </div>
          )}
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
