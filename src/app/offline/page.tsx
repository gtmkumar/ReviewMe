'use client';

import { useEffect, useState } from 'react';
import { Wifi, WifiOff, RefreshCw, Home, Activity } from 'lucide-react';
import Link from 'next/link';

export default function OfflinePage() {
  const [isOnline, setIsOnline] = useState(true);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    // Check initial online status
    setIsOnline(navigator.onLine);

    // Listen for online/offline events
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <div className="card p-8 shadow-lg">
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className={`p-4 rounded-full ${isOnline ? 'bg-green-100' : 'bg-red-100'}`}>
              {isOnline ? (
                <Wifi className="w-12 h-12 text-green-600" />
              ) : (
                <WifiOff className="w-12 h-12 text-red-600" />
              )}
            </div>
          </div>

          {/* Status */}
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            {isOnline ? 'Connection Restored!' : 'You\'re Offline'}
          </h1>

          <p className="text-gray-600 mb-6">
            {isOnline ? (
              'Great! Your internet connection is back. Click retry to reload the page.'
            ) : (
              'It looks like you\'re not connected to the internet. Some features may not be available.'
            )}
          </p>

          {/* Connection Status */}
          <div className="flex items-center justify-center space-x-2 mb-6">
            <div className={`w-3 h-3 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className={`text-sm font-medium ${isOnline ? 'text-green-600' : 'text-red-600'}`}>
              {isOnline ? 'Online' : 'Offline'}
            </span>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <button
              onClick={handleRetry}
              className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry ({retryCount > 0 ? retryCount : ''})
            </button>

            <Link
              href="/dashboard"
              className="w-full inline-flex justify-center items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors"
            >
              <Home className="w-4 h-4 mr-2" />
              Go to Dashboard
            </Link>
          </div>

          {/* Offline Features */}
          {!isOnline && (
            <div className="mt-8 p-4 bg-blue-50 rounded-lg">
              <h3 className="text-sm font-medium text-blue-900 mb-2 flex items-center">
                <Activity className="w-4 h-4 mr-2" />
                Available Offline
              </h3>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• View cached profile data</li>
                <li>• Browse saved recommendations</li>
                <li>• View previous analysis results</li>
                <li>• Access offline documentation</li>
              </ul>
            </div>
          )}

          {/* Tips */}
          <div className="mt-6 text-xs text-gray-500">
            <p>
              Tip: This app works offline! Your changes will sync automatically when you're back online.
            </p>
          </div>
        </div>

        {/* Additional Info */}
        <div className="mt-6 text-sm text-gray-600">
          <p>
            Having trouble? Try checking your network connection or{' '}
            <button 
              onClick={() => window.location.href = '/'}
              className="text-primary hover:text-primary/80 underline"
            >
              return to home
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}