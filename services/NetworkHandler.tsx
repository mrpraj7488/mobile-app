import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useNotification } from '@/contexts/NotificationContext';

interface NetworkContextType {
  isConnected: boolean;
  isOnline: boolean;
  connectionType: string | null;
  showNetworkAlert: () => void;
  hideNetworkAlert: () => void;
  checkConnection: () => Promise<boolean>;
}

const NetworkContext = createContext<NetworkContextType | undefined>(undefined);

interface NetworkProviderProps {
  children: React.ReactNode;
}

export function NetworkProvider({ children }: NetworkProviderProps) {
  const [isConnected, setIsConnected] = useState<boolean>(true);
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [connectionType, setConnectionType] = useState<string | null>(null);
  const [notificationId, setNotificationId] = useState<string | null>(null);
  
  const { showNetworkNotification, dismissNotification } = useNotification();

  // Check network connectivity
  const checkConnection = useCallback(async (): Promise<boolean> => {
    try {
      // Simple network check using fetch with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch('https://www.google.com/generate_204', {
        method: 'HEAD',
        signal: controller.signal,
        cache: 'no-cache'
      });
      
      clearTimeout(timeoutId);
      const isOnline = response.ok;
      
      console.log('🌐 Network check:', { isOnline, status: response.status });
      
      setIsConnected(isOnline);
      setIsOnline(isOnline);
      setConnectionType(isOnline ? 'online' : 'offline');
      
      return isOnline;
    } catch (error) {
      console.error('❌ Network check failed:', error);
      setIsConnected(false);
      setIsOnline(false);
      setConnectionType('offline');
      return false;
    }
  }, []);

  // Show network alert
  const showNetworkAlert = useCallback(() => {
    if (notificationId) return; // Prevent duplicate notifications
    
    console.log('🚨 Showing network connectivity notification');
    
    const id = showNetworkNotification(
      'No Internet Connection',
      'Please check your internet connection and try again.',
      true // persistent notification - stays until connection restored
    );
    
    setNotificationId(id);
  }, [notificationId, showNetworkNotification]);

  // Hide network alert
  const hideNetworkAlert = useCallback(() => {
    if (notificationId) {
      console.log('✅ Hiding network connectivity notification');
      dismissNotification(notificationId);
      setNotificationId(null);
    }
  }, [notificationId, dismissNotification]);

  // Monitor network connectivity
  useEffect(() => {
    console.log('🔌 Setting up network monitoring');
    
    // Initial connection check
    checkConnection();
    
    // Set up periodic network monitoring
    const monitorInterval = setInterval(async () => {
      const wasOnline = isConnected && isOnline;
      const isNowOnline = await checkConnection();
      
      if (!wasOnline && isNowOnline) {
        // Network restored - hide notification if visible
        console.log('✅ Network restored - hiding notification');
        hideNetworkAlert();
      } else if (wasOnline && !isNowOnline) {
        // Network lost - show notification if not already visible
        if (!notificationId) {
          console.log('❌ Network lost - showing notification');
          setTimeout(() => showNetworkAlert(), 1000); // Brief delay to avoid flicker
        }
      }
    }, 3000); // Check every 3 seconds

    return () => {
      console.log('🔌 Cleaning up network monitoring');
      clearInterval(monitorInterval);
    };
  }, [isConnected, isOnline, notificationId, showNetworkAlert, hideNetworkAlert, checkConnection]);

  const contextValue: NetworkContextType = {
    isConnected,
    isOnline,
    connectionType,
    showNetworkAlert,
    hideNetworkAlert,
    checkConnection
  };

  return (
    <NetworkContext.Provider value={contextValue}>
      {children}
    </NetworkContext.Provider>
  );
}

// Hook to use network context
export function useNetwork(): NetworkContextType {
  const context = useContext(NetworkContext);
  if (!context) {
    throw new Error('useNetwork must be used within a NetworkProvider');
  }
  return context;
}

// Utility function to handle network-dependent operations
export async function withNetworkCheck<T>(
  operation: () => Promise<T>,
  onNetworkError?: () => void
): Promise<T | null> {
  try {
    // Simple network check before operation
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    
    const response = await fetch('https://www.google.com/generate_204', {
      method: 'HEAD',
      signal: controller.signal,
      cache: 'no-cache'
    });
    
    clearTimeout(timeoutId);
    const isOnline = response.ok;
    
    if (!isOnline) {
      console.log('❌ Network check failed before operation');
      if (onNetworkError) {
        onNetworkError();
      }
      return null;
    }
    
    // Execute operation
    const result = await operation();
    return result;
    
  } catch (error) {
    // Check if error is network-related
    const errorMessage = error instanceof Error ? error.message : String(error);
    const isNetworkError = errorMessage.includes('Network request failed') || 
                          errorMessage.includes('fetch') || 
                          errorMessage.includes('TypeError') ||
                          errorMessage.includes('AbortError');
    
    if (isNetworkError && onNetworkError) {
      console.log('❌ Network error during operation:', errorMessage);
      onNetworkError();
    }
    
    throw error;
  }
}
