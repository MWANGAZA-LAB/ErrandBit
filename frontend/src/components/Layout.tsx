import { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, Home, Users, Briefcase, User, LogOut, LogIn, DollarSign } from 'lucide-react';
import { useIsMobile } from '../hooks/useMobile';
import { simpleAuthService } from '../services/simple-auth.service';

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const isAuthenticated = simpleAuthService.isAuthenticated();
  const user = simpleAuthService.getUser();
  
  const isActive = (path: string) => location.pathname === path;
  
  const closeMobileMenu = () => setMobileMenuOpen(false);
  
  const handleLogout = () => {
    simpleAuthService.logout();
    navigate('/login');
  };
  
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <nav className="bg-white shadow-sm border-b border-gray-200" role="navigation" aria-label="Main navigation">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link to="/" className="flex items-center space-x-3" aria-label="ErrandBit home">
                <div className="w-9 h-9 bg-gradient-to-br from-primary to-orange-600 rounded-lg flex items-center justify-center shadow-sm" aria-hidden="true">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                    <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                  </svg>
                </div>
                <span className="text-xl font-bold text-gray-900 tracking-tight">ErrandBit</span>
              </Link>
            </div>
            
            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-8">
              <Link
                to="/"
                className={`${
                  isActive('/') ? 'text-primary border-b-2 border-primary' : 'text-gray-600 hover:text-gray-900'
                } px-3 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 rounded`}
                aria-current={isActive('/') ? 'page' : undefined}
              >
                Home
              </Link>
              <Link
                to="/find-runners"
                className={`${
                  isActive('/find-runners') ? 'text-primary border-b-2 border-primary' : 'text-gray-600 hover:text-gray-900'
                } px-3 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 rounded`}
                aria-current={isActive('/find-runners') ? 'page' : undefined}
              >
                Find Runners
              </Link>
              <Link
                to="/my-jobs"
                className={`${
                  isActive('/my-jobs') ? 'text-primary border-b-2 border-primary' : 'text-gray-600 hover:text-gray-900'
                } px-3 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 rounded`}
                aria-current={isActive('/my-jobs') ? 'page' : undefined}
              >
                My Jobs
              </Link>
              <Link
                to="/profile"
                className={`${
                  isActive('/profile') ? 'text-primary border-b-2 border-primary' : 'text-gray-600 hover:text-gray-900'
                } px-3 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 rounded`}
                aria-current={isActive('/profile') ? 'page' : undefined}
              >
                Profile
              </Link>
              
              <Link
                to="/earnings"
                className={`${
                  isActive('/earnings') ? 'text-primary border-b-2 border-primary' : 'text-gray-600 hover:text-gray-900'
                } px-3 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 rounded`}
                aria-current={isActive('/earnings') ? 'page' : undefined}
              >
                💰 Earnings
              </Link>
              
              {/* Auth buttons */}
              {isAuthenticated ? (
                <div className="flex items-center space-x-3">
                  <span className="text-sm text-gray-600">
                    {user?.displayName || user?.username}
                  </span>
                  <button
                    onClick={handleLogout}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Logout
                  </button>
                </div>
              ) : (
                <Link
                  to="/login"
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  <LogIn className="h-4 w-4 mr-2" />
                  Login
                </Link>
              )}
            </div>
            
            {/* Mobile Menu Button */}
            <div className="md:hidden flex items-center">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="inline-flex items-center justify-center p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
                aria-expanded={mobileMenuOpen}
                aria-label="Toggle navigation menu"
              >
                {mobileMenuOpen ? (
                  <X className="h-6 w-6" aria-hidden="true" />
                ) : (
                  <Menu className="h-6 w-6" aria-hidden="true" />
                )}
              </button>
            </div>
          </div>
        </div>
        
        {/* Mobile Navigation Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200">
            <div className="px-2 pt-2 pb-3 space-y-1">
              <Link
                to="/"
                onClick={closeMobileMenu}
                className={`${
                  isActive('/') ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : 'border-transparent text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-900'
                } flex items-center px-3 py-2 border-l-4 text-base font-medium transition-colors`}
                aria-current={isActive('/') ? 'page' : undefined}
              >
                <Home className="mr-3 h-5 w-5" aria-hidden="true" />
                Home
              </Link>
              <Link
                to="/find-runners"
                onClick={closeMobileMenu}
                className={`${
                  isActive('/find-runners') ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : 'border-transparent text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-900'
                } flex items-center px-3 py-2 border-l-4 text-base font-medium transition-colors`}
                aria-current={isActive('/find-runners') ? 'page' : undefined}
              >
                <Users className="mr-3 h-5 w-5" aria-hidden="true" />
                Find Runners
              </Link>
              <Link
                to="/my-jobs"
                onClick={closeMobileMenu}
                className={`${
                  isActive('/my-jobs') ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : 'border-transparent text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-900'
                } flex items-center px-3 py-2 border-l-4 text-base font-medium transition-colors`}
                aria-current={isActive('/my-jobs') ? 'page' : undefined}
              >
                <Briefcase className="mr-3 h-5 w-5" aria-hidden="true" />
                My Jobs
              </Link>
              <Link
                to="/profile"
                onClick={closeMobileMenu}
                className={`${
                  isActive('/profile') ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : 'border-transparent text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-900'
                } flex items-center px-3 py-2 border-l-4 text-base font-medium transition-colors`}
                aria-current={isActive('/profile') ? 'page' : undefined}
              >
                <User className="mr-3 h-5 w-5" aria-hidden="true" />
                Profile
              </Link>
              <Link
                to="/earnings"
                onClick={closeMobileMenu}
                className={`${
                  isActive('/earnings') ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : 'border-transparent text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-900'
                } flex items-center px-3 py-2 border-l-4 text-base font-medium transition-colors`}
                aria-current={isActive('/earnings') ? 'page' : undefined}
              >
                <DollarSign className="mr-3 h-5 w-5" aria-hidden="true" />
                💰 Earnings
              </Link>
            </div>
          </div>
        )}
      </nav>
      
      <main id="main-content" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1" role="main">
        <Outlet />
      </main>
      
      <footer className="bg-white border-t border-gray-200 mt-auto" role="contentinfo">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-center text-sm text-gray-500">
            ErrandBit - Trust-minimized local services marketplace powered by Bitcoin Lightning
          </p>
          <p className="text-center text-xs text-gray-400 mt-2">
            © {new Date().getFullYear()} ErrandBit. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
