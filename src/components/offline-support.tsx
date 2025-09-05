'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { initializeOfflineSupport, ServiceWorkerManager, PushNotificationManager } from '@/lib/offline-manager';
import { Wifi, WifiOff, Download, Bell, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OfflineNotificationProps {
  type: 'offline' | 'online' | 'update-available' | 'install-prompt';
  onClose: () => void;
  onAction?: () => void;
}

function OfflineNotification({ type, onClose, onAction }: OfflineNotificationProps) {
  const getNotificationContent = () => {
    switch (type) {
      case 'offline':
        return {
          icon: <WifiOff className="w-5 h-5 text-orange-600" />,
          title: 'You\'re offline',
          message: 'Some features may not be available. Changes will sync when you\'re back online.',
          bgColor: 'bg-orange-50 border-orange-200',
          textColor: 'text-orange-800'
        };
      case 'online':
        return {
          icon: <Wifi className="w-5 h-5 text-green-600" />,
          title: 'Back online',
          message: 'Connection restored. Syncing your changes...',
          bgColor: 'bg-green-50 border-green-200',
          textColor: 'text-green-800'
        };
      case 'update-available':
        return {
          icon: <Download className="w-5 h-5 text-blue-600" />,
          title: 'Update available',
          message: 'A new version is ready. Restart to update.',
          bgColor: 'bg-blue-50 border-blue-200',
          textColor: 'text-blue-800',
          actionText: 'Update'
        };
      case 'install-prompt':
        return {
          icon: <Download className="w-5 h-5 text-purple-600" />,
          title: 'Install ReviewMe',
          message: 'Install the app for a better experience with offline access.',
          bgColor: 'bg-purple-50 border-purple-200',
          textColor: 'text-purple-800',
          actionText: 'Install'
        };
      default:
        return null;
    }
  };

  const content = getNotificationContent();
  if (!content) return null;

  return (
    <div className={cn(
      'fixed top-4 right-4 z-50 p-4 rounded-lg border shadow-lg max-w-sm w-full transform transition-all duration-300 ease-in-out',
      content.bgColor
    )}>
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          {content.icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className={cn('text-sm font-medium', content.textColor)}>
            {content.title}
          </p>
          <p className={cn('text-sm mt-1', content.textColor)}>
            {content.message}
          </p>
          {content.actionText && onAction && (
            <button
              onClick={onAction}
              className={cn(
                'mt-2 text-sm font-medium underline hover:no-underline',
                content.textColor
              )}
            >
              {content.actionText}
            </button>
          )}
        </div>
        <button
          onClick={onClose}
          className={cn('flex-shrink-0 p-1 hover:bg-black/10 rounded', content.textColor)}
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export default function OfflineSupport() {
  const { data: session } = useSession();
  const [isOnline, setIsOnline] = useState(true);
  const [notifications, setNotifications] = useState<{
    id: string;
    type: 'offline' | 'online' | 'update-available' | 'install-prompt';
  }[]>([]);
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [swManager, setSwManager] = useState<ServiceWorkerManager | null>(null);
  const [pushManager, setPushManager] = useState<PushNotificationManager | null>(null);

  useEffect(() => {
    // Initialize offline support
    const init = async () => {
      try {
        await initializeOfflineSupport();
        
        const sw = ServiceWorkerManager.getInstance();
        const push = PushNotificationManager.getInstance();
        
        setSwManager(sw);
        setPushManager(push);

        // Set up event listeners
        sw.on('offline', () => {
          setIsOnline(false);
          addNotification('offline');
        });

        sw.on('online', () => {
          setIsOnline(true);
          addNotification('online');
          // Auto-hide online notification after 3 seconds
          setTimeout(() => {
            removeNotificationByType('online');
          }, 3000);
        });

        sw.on('update-available', () => {
          addNotification('update-available');
        });

        // Check initial online status
        setIsOnline(navigator.onLine);

        // Set up install prompt
        const handleBeforeInstallPrompt = (e: any) => {
          e.preventDefault();
          setInstallPrompt(e);
          
          // Show install notification after a delay
          setTimeout(() => {
            addNotification('install-prompt');
          }, 10000); // Show after 10 seconds
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        // Handle app installed
        window.addEventListener('appinstalled', () => {
          setInstallPrompt(null);
          removeNotificationByType('install-prompt');
        });

        return () => {
          window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        };
      } catch (error) {
        console.error('Failed to initialize offline support:', error);
      }
    };

    init();
  }, []);

  // Request notification permissions when user is signed in
  useEffect(() => {
    if (session && pushManager) {
      const requestPermissions = async () => {
        if (pushManager.isSupported() && !pushManager.isPermitted()) {
          try {
            const permission = await pushManager.requestPermission();
            if (permission === 'granted') {
              await pushManager.subscribe();
            }
          } catch (error) {
            console.error('Failed to request notification permissions:', error);
          }
        }
      };

      // Delay the request to avoid interrupting the user experience
      setTimeout(requestPermissions, 5000);
    }
  }, [session, pushManager]);

  const addNotification = (type: 'offline' | 'online' | 'update-available' | 'install-prompt') => {
    const id = Math.random().toString(36).substr(2, 9);
    setNotifications(prev => [...prev.filter(n => n.type !== type), { id, type }]);
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const removeNotificationByType = (type: string) => {
    setNotifications(prev => prev.filter(n => n.type !== type));
  };

  const handleUpdateApp = async () => {
    if (swManager) {
      await swManager.skipWaiting();
    }
  };

  const handleInstallApp = async () => {
    if (installPrompt) {
      try {
        const result = await installPrompt.prompt();
        if (result.outcome === 'accepted') {
          setInstallPrompt(null);
          removeNotificationByType('install-prompt');
        }
      } catch (error) {
        console.error('Failed to install app:', error);
      }
    }
  };

  const getActionHandler = (type: string) => {
    switch (type) {
      case 'update-available':
        return handleUpdateApp;
      case 'install-prompt':
        return handleInstallApp;
      default:
        return undefined;
    }
  };

  return (
    <>
      {/* Connection status indicator */}
      <div className="fixed bottom-4 left-4 z-40">
        <div className={cn(
          'flex items-center space-x-2 px-3 py-2 rounded-full text-sm font-medium transition-all duration-300',
          isOnline 
            ? 'bg-green-100 text-green-800 border border-green-200' 
            : 'bg-red-100 text-red-800 border border-red-200'
        )}>
          {isOnline ? (
            <Wifi className="w-4 h-4" />
          ) : (
            <WifiOff className="w-4 h-4" />
          )}
          <span className="hidden sm:inline">
            {isOnline ? 'Online' : 'Offline'}
          </span>
        </div>
      </div>

      {/* Notifications */}
      <div className="fixed top-0 right-0 z-50 p-4 space-y-3">
        {notifications.map((notification) => (
          <OfflineNotification
            key={notification.id}
            type={notification.type}
            onClose={() => removeNotification(notification.id)}
            onAction={getActionHandler(notification.type)}
          />
        ))}
      </div>
    </>
  );
}