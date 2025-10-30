import React, { useState, useEffect } from 'react';
import { useFedi } from '../hooks/useFedi';

export default function Profile() {
  const { nostrAvailable, identityService } = useFedi();
  const [nostrPubkey, setNostrPubkey] = useState<string | null>(null);
  const [useNostr, setUseNostr] = useState(false);

  useEffect(() => {
    if (nostrAvailable) {
      identityService.getPublicKey().then(setNostrPubkey);
    }
  }, [nostrAvailable, identityService]);

  const handleConnectNostr = async () => {
    const pubkey = await identityService.getPublicKey();
    if (pubkey) {
      setNostrPubkey(pubkey);
      setUseNostr(true);
      alert('Nostr identity connected!');
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Profile</h1>
      
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-blue-800 font-medium">Development in Progress</p>
            <p className="text-sm text-blue-700 mt-1">User profile management and authentication will be available in the next release.</p>
          </div>
        </div>
      </div>

      {nostrAvailable && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Privacy-Preserving Identity</h2>
          <p className="text-sm text-gray-600 mb-4">
            Use your Nostr identity instead of email/phone for enhanced privacy.
          </p>
          
          {nostrPubkey ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-green-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm font-medium text-green-800">Nostr Connected</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Public Key</label>
                <div className="flex items-center">
                  <input
                    type="text"
                    value={nostrPubkey.substring(0, 16) + '...'}
                    readOnly
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 text-sm"
                  />
                  <button
                    onClick={() => navigator.clipboard.writeText(nostrPubkey)}
                    className="ml-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                </div>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="useNostr"
                  checked={useNostr}
                  onChange={(e) => setUseNostr(e.target.checked)}
                  className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                />
                <label htmlFor="useNostr" className="ml-2 text-sm text-gray-700">
                  Use Nostr identity instead of email/phone
                </label>
              </div>
            </div>
          ) : (
            <button
              onClick={handleConnectNostr}
              className="w-full flex items-center justify-center px-4 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors"
            >
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 8a6 6 0 01-7.743 5.743L10 14l-1 1-1 1H6v2H2v-4l4.257-4.257A6 6 0 1118 8zm-6-4a1 1 0 100 2 2 2 0 012 2 1 1 0 102 0 4 4 0 00-4-4z" clipRule="evenodd" />
              </svg>
              Connect Nostr Identity
            </button>
          )}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold mb-4">Account Info</h2>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input
                type="tel"
                placeholder="+1 (555) 123-4567"
                disabled={useNostr}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent disabled:bg-gray-100 disabled:text-gray-500"
              />
              {useNostr && (
                <p className="text-xs text-gray-500 mt-1">Not required when using Nostr identity</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                placeholder="you@example.com"
                disabled={useNostr}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent disabled:bg-gray-100 disabled:text-gray-500"
              />
              {useNostr && (
                <p className="text-xs text-gray-500 mt-1">Not required when using Nostr identity</p>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold mb-4">Runner Profile</h2>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Display Name</label>
              <input
                type="text"
                placeholder="Your Name"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Lightning Address</label>
              <input
                type="text"
                placeholder="you@getalby.com"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hourly Rate (USD)</label>
              <input
                type="number"
                placeholder="25"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <button className="bg-primary text-white px-6 py-2 rounded-lg font-medium hover:bg-orange-600 transition-colors">
          Save Changes
        </button>
      </div>
    </div>
  );
}
