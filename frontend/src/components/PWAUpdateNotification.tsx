/**
 * PWA Update Notification Component
 * 
 * Notifies users when a new version of the app is available
 */

import { useState, useEffect } from 'react'
import { RefreshCw } from 'lucide-react'
import { useRegisterSW } from 'virtual:pwa-register/react'

export function PWAUpdateNotification() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(registration) {
      console.log('SW Registered:', registration)
    },
    onRegisterError(error) {
      console.log('SW registration error', error)
    },
  })

  const handleUpdate = () => {
    updateServiceWorker(true)
  }

  const handleDismiss = () => {
    setNeedRefresh(false)
  }

  if (!needRefresh) return null

  return (
    <div
      className="fixed top-4 right-4 z-50 max-w-sm bg-white rounded-lg shadow-lg border border-gray-200 p-4"
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
    >
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <RefreshCw className="h-6 w-6 text-indigo-600" aria-hidden="true" />
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium text-gray-900">
            Update Available
          </h3>
          <p className="mt-1 text-sm text-gray-600">
            A new version of ErrandBit is available. Refresh to get the latest features and improvements.
          </p>
          <div className="mt-4 flex space-x-3">
            <button
              onClick={handleUpdate}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Refresh Now
            </button>
            <button
              onClick={handleDismiss}
              className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Later
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
