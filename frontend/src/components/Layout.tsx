import { useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { Menu, X, Home, Users, Briefcase, User } from 'lucide-react';
import { useIsMobile } from '../hooks/useMobile';

export default function Layout() {
  const location = useLocation();
  const isMobile = useIsMobile();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const isActive = (path: string) => location.pathname === path;
  
  const closeMobileMenu = () => setMobileMenuOpen(false);
  
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
                  /* @ts-expect-error - React 18 type compatibility */
                  <X className="h-6 w-6" aria-hidden="true" />
                ) : (
                  /* @ts-expect-error - React 18 type compatibility */
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
                {/* @ts-expect-error - React 18 type compatibility */}
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
                {/* @ts-expect-error - React 18 type compatibility */}
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
                {/* @ts-expect-error - React 18 type compatibility */}
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
                {/* @ts-expect-error - React 18 type compatibility */}
                <User className="mr-3 h-5 w-5" aria-hidden="true" />
                Profile
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
