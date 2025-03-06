import { login, signup } from './actions';

export default function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string; message?: string };
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-2">
      <div className="p-8 bg-white rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-center">Login / Sign Up</h1>
        
        {searchParams?.error ? (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {searchParams.error}
          </div>
        ) : null}
        
        {searchParams?.message ? (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
            {searchParams.message}
          </div>
        ) : null}
        
        <form className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          
          <div className="flex space-x-4">
            <button
              formAction={login}
              className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-md"
            >
              Log in
            </button>
            <button
              formAction={signup}
              className="flex-1 bg-green-500 hover:bg-green-600 text-white py-2 rounded-md"
            >
              Sign up
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 