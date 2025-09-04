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
  const [hasShownRestoreMessage, setHasShownRestoreMessage] = useState<boolean>(false);
  const [lastConnectionState, setLastConnectionState] = useState<boolean>(true);
  
  const { showNetworkNotification, dismissNotification } = useNotification();

  // Check network connectivity with debouncing
  const checkConnection = useCallback(async (): Promise<boolean> => {
    try {
      // Simple network check using fetch with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      
      const response = await fetch('https://www.google.com/generate_204', {
        method: 'HEAD',
        signal: controller.signal,
        cache: 'no-cache'
      });
      
      clearTimeout(timeoutId);
      const isOnline = response.ok;

      // Only update state if there's an actual change
      if (isOnline !== lastConnectionState) {
        setIsConnected(isOnline);
        setIsOnline(isOnline);
        setConnectionType(isOnline ? 'online' : 'offline');
        setLastConnectionState(isOnline);
      }
      
      return isOnline;
    } catch (error) {
      const isOffline = false;
      
      // Only update state if there's an actual change
      if (isOffline !== lastConnectionState) {
        setIsConnected(false);
        setIsOnline(false);
        setConnectionType('offline');
        setLastConnectionState(false);
      }
      
      return false;
    }
  }, [lastConnectionState]);

  // Show network alert
  const showNetworkAlert = useCallback(() => {
    if (notificationId) return; // Prevent duplicate notifications

    const id = showNetworkNotification(
      'No Internet Connection',
      'Please check your internet connection and try again.',
      true // persistent notification - stays until connection restored
    );
    
    setNotificationId(id);
    setHasShownRestoreMessage(false); // Reset restore message flag
  }, [notificationId, showNetworkNotification]);

  // Hide network alert
  const hideNetworkAlert = useCallback(() => {
    if (notificationId) {
      dismissNotification(notificationId);
      setNotificationId(null);
    }
  }, [notificationId, dismissNotification]);

  // Monitor network connectivity
  useEffect(() => {
    // Initial connection check
    checkConnection();
    
    // Set up intelligent network monitoring with exponential backoff
    let checkInterval = 15000; // Start with 15 seconds for smoother detection
    const maxInterval = 60000; // Max 60 seconds
    let consecutiveFailures = 0;
    let timeoutId: ReturnType<typeof setTimeout>;
    
    const scheduleNextCheck = () => {
      timeoutId = setTimeout(async () => {
        const wasOnline = lastConnectionState;
        const isNowOnline = await checkConnection();
        
        // Only react to actual state changes
        if (wasOnline !== isNowOnline) {
          if (wasOnline && !isNowOnline) {
            // Network lost
            consecutiveFailures++;
            checkInterval = Math.min(checkInterval * 1.2, maxInterval);
            
            if (!notificationId) {
              setTimeout(() => showNetworkAlert(), 1000);
            }
          } else if (!wasOnline && isNowOnline) {
            // Connection restored
            consecutiveFailures = 0;
            checkInterval = 15000;
            
            if (notificationId && !hasShownRestoreMessage) {
              hideNetworkAlert();
              setHasShownRestoreMessage(true);
              
              // Show brief success notification only once
              setTimeout(() => {
                showNetworkNotification(
                  'Connection Restored',
                  'Internet connection is back online.',
                  false // not persistent, will auto-dismiss
                );
              }, 300);
            }
          }
        }
        
        // Schedule next check
        scheduleNextCheck();
      }, checkInterval);
    };
    
    scheduleNextCheck();

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [lastConnectionState, notificationId, hasShownRestoreMessage, showNetworkAlert, hideNetworkAlert, checkConnection]);

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
      onNetworkError();
    }
    
    throw error;
  }
}
