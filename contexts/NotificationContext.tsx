import React, { createContext, useContext, useState, useCallback } from 'react';
import { NotificationData, NotificationType } from '@/components/NotificationSystem';

interface NotificationContextType {
  notifications: NotificationData[];
  showNotification: (
    type: NotificationType,
    title: string,
    message?: string,
    options?: {
      duration?: number;
      persistent?: boolean;
      onPress?: () => void;
      onDismiss?: () => void;
    }
  ) => string;
  showSuccess: (title: string, message?: string, duration?: number) => string;
  showError: (title: string, message?: string, duration?: number) => string;
  showWarning: (title: string, message?: string, duration?: number) => string;
  showInfo: (title: string, message?: string, duration?: number) => string;
  showNetworkNotification: (title: string, message?: string, persistent?: boolean) => string;
  dismissNotification: (id: string) => void;
  dismissAll: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotification = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

interface NotificationProviderProps {
  children: React.ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [notifications, setNotifications] = useState<NotificationData[]>([]);

  const generateId = useCallback(() => {
    return `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  const showNotification = useCallback((
    type: NotificationType,
    title: string,
    message?: any,
    options?: {
      duration?: number;
      persistent?: boolean;
      onPress?: () => void;
      onDismiss?: () => void;
    }
  ): string => {
    const id = generateId();
    
    // Convert message to string, handling Error objects
    const messageString = message instanceof Error 
      ? message.message 
      : message != null 
        ? String(message) 
        : undefined;
    
    const notification: NotificationData = {
      id,
      type,
      title,
      message: messageString,
      duration: options?.duration,
      persistent: options?.persistent,
      onPress: options?.onPress,
      onDismiss: options?.onDismiss,
    };

    setNotifications(prev => {
      // Limit to 3 notifications max to avoid cluttering
      const updated = [notification, ...prev].slice(0, 3);
      return updated;
    });

    return id;
  }, [generateId]);

  const showSuccess = useCallback((title: string, message?: string, duration = 3000): string => {
    return showNotification('success', title, message, { duration });
  }, [showNotification]);

  const showError = useCallback((title: string, message?: string, duration = 5000): string => {
    
    const id = showNotification('error', title, message, { duration });
    
    return id;
  }, [showNotification]);

  const showWarning = useCallback((title: string, message?: string, duration = 4000): string => {
    return showNotification('warning', title, message, { duration });
  }, [showNotification]);

  const showInfo = useCallback((title: string, message?: string, duration = 3000): string => {
    return showNotification('info', title, message, { duration });
  }, [showNotification]);

  const showNetworkNotification = useCallback((
    title: string, 
    message?: string, 
    persistent = false
  ): string => {
    // Remove existing network notifications to avoid duplicates
    setNotifications(prev => prev.filter(n => n.type !== 'network'));
    
    return showNotification('network', title, message, { 
      persistent,
      duration: persistent ? 0 : 4000 
    });
  }, [showNotification]);

  const dismissNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const dismissAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const value: NotificationContextType = {
    notifications,
    showNotification,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showNetworkNotification,
    dismissNotification,
    dismissAll,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};
