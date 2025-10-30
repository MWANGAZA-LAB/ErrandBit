import React from 'react';
import { Link } from 'react-router-dom';
import { getHealth } from '../api';
import { FediStatus } from '../components/FediStatus';

export default function Home() {
  const [health, setHealth] = React.useState<any>(null);

  React.useEffect(() => {
    getHealth().then(setHealth).catch(console.error);
  }, []);

  return (
    <div className="space-y-8">
      <FediStatus />
      
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Welcome to ErrandBit
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          Trust-minimized local services marketplace powered by Bitcoin Lightning
        </p>
        <div className="flex justify-center space-x-4">
          <Link
            to="/find-runners"
            className="bg-primary text-white px-6 py-3 rounded-lg font-medium hover:bg-orange-600 transition-colors"
          >
            Find a Runner
          </Link>
          <Link
            to="/profile"
            className="bg-gray-200 text-gray-900 px-6 py-3 rounded-lg font-medium hover:bg-gray-300 transition-colors"
          >
            Become a Runner
          </Link>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mt-12">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold mb-2">Instant Settlement</h3>
          <p className="text-gray-600 text-sm">
            Lightning payments settle instantly. No waiting for ACH or platform holds.
          </p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold mb-2">Zero Platform Fees</h3>
          <p className="text-gray-600 text-sm">
            No transaction fees. Runners keep 100% of what they earn.
          </p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold mb-2">Global & Local</h3>
          <p className="text-gray-600 text-sm">
            Bitcoin works everywhere. Your reputation travels with you.
          </p>
        </div>
      </div>

      {health && (
        <div className="mt-8 bg-gray-100 p-4 rounded-lg">
          <p className="text-sm text-gray-600 mb-2">API Status:</p>
          <pre className="text-xs bg-white p-3 rounded border border-gray-200 overflow-auto">
            {JSON.stringify(health, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
