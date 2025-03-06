import { redirect } from 'next/navigation';
import { isAdmin } from '@/utils/auth';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Check if the user is an admin
  const isUserAdmin = await isAdmin();
  
  if (!isUserAdmin) {
    // Redirect to the home page if not an admin
    redirect('/');
  }
  
  return (
    <div className="admin-layout">
      <div className="admin-sidebar bg-gray-800 text-white w-64 fixed h-full p-4">
        <h1 className="text-xl font-bold mb-6">Job Spy Admin</h1>
        <nav>
          <ul className="space-y-2">
            <li>
              <a href="/admin" className="block py-2 px-4 hover:bg-gray-700 rounded">
                Dashboard
              </a>
            </li>
            <li>
              <a href="/admin/companies" className="block py-2 px-4 hover:bg-gray-700 rounded">
                Companies
              </a>
            </li>
            <li>
              <a href="/admin/jobs" className="block py-2 px-4 hover:bg-gray-700 rounded">
                Jobs
              </a>
            </li>
            <li>
              <a href="/admin/errors" className="block py-2 px-4 hover:bg-gray-700 rounded">
                Error Monitoring
              </a>
            </li>
          </ul>
        </nav>
      </div>
      <div className="admin-content ml-64 p-6">
        {children}
      </div>
    </div>
  );
} 