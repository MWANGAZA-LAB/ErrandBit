import { Link, Outlet, useLocation } from 'react-router-dom';

export default function Layout() {
  const location = useLocation();
  
  const isActive = (path: string) => location.pathname === path;
  
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link to="/" className="flex items-center space-x-3">
                <div className="w-9 h-9 bg-gradient-to-br from-primary to-orange-600 rounded-lg flex items-center justify-center shadow-sm">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                  </svg>
                </div>
                <span className="text-xl font-bold text-gray-900 tracking-tight">ErrandBit</span>
              </Link>
            </div>
            
            <div className="flex items-center space-x-8">
              <Link
                to="/"
                className={`${
                  isActive('/') ? 'text-primary border-b-2 border-primary' : 'text-gray-600 hover:text-gray-900'
                } px-3 py-2 text-sm font-medium transition-colors`}
              >
                Home
              </Link>
              <Link
                to="/find-runners"
                className={`${
                  isActive('/find-runners') ? 'text-primary border-b-2 border-primary' : 'text-gray-600 hover:text-gray-900'
                } px-3 py-2 text-sm font-medium transition-colors`}
              >
                Find Runners
              </Link>
              <Link
                to="/my-jobs"
                className={`${
                  isActive('/my-jobs') ? 'text-primary border-b-2 border-primary' : 'text-gray-600 hover:text-gray-900'
                } px-3 py-2 text-sm font-medium transition-colors`}
              >
                My Jobs
              </Link>
              <Link
                to="/profile"
                className={`${
                  isActive('/profile') ? 'text-primary border-b-2 border-primary' : 'text-gray-600 hover:text-gray-900'
                } px-3 py-2 text-sm font-medium transition-colors`}
              >
                Profile
              </Link>
            </div>
          </div>
        </div>
      </nav>
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
      
      <footer className="bg-white border-t border-gray-200 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-center text-sm text-gray-500">
            ErrandBit - Trust-minimized local services marketplace powered by Bitcoin Lightning
          </p>
        </div>
      </footer>
    </div>
  );
}
