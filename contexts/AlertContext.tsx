import React, { createContext, useContext } from 'react';
import CustomAlert from '@/components/CustomAlert';
import { useCustomAlert } from '@/hooks/useCustomAlert';

interface AlertContextType {
  showSuccess: (title: string, message: string, autoClose?: boolean) => void;
  showError: (title: string, message: string) => void;
  showWarning: (title: string, message: string) => void;
  showInfo: (title: string, message: string, autoClose?: boolean) => void;
  showConfirm: (
    title: string, 
    message: string, 
    onConfirm: () => void,
    onCancel?: () => void,
    confirmText?: string,
    cancelText?: string
  ) => void;
  showDestructiveConfirm: (
    title: string, 
    message: string, 
    onConfirm: () => void,
    onCancel?: () => void,
    confirmText?: string,
    cancelText?: string
  ) => void;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export function useAlert() {
  const context = useContext(AlertContext);
  if (context === undefined) {
    throw new Error('useAlert must be used within an AlertProvider');
  }
  return context;
}

export function AlertProvider({ children }: { children: React.ReactNode }) {
  const {
    alertProps,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showConfirm,
    showDestructiveConfirm,
  } = useCustomAlert();

  const wrappedShowError = (title: string, message: string) => {
    console.log('🔔 AlertProvider: showError called with:', title, message);
    console.log('🔔 AlertProvider: alertProps.visible =', alertProps.visible);
    showError(title, message);
  };

  const wrappedShowSuccess = (title: string, message: string, autoClose?: boolean) => {
    console.log('🔔 AlertProvider: showSuccess called with:', title, message);
    showSuccess(title, message, autoClose);
  };

  const value = {
    showSuccess: wrappedShowSuccess,
    showError: wrappedShowError,
    showWarning,
    showInfo,
    showConfirm,
    showDestructiveConfirm,
  };

  return (
    <AlertContext.Provider value={value}>
      {children}
      <CustomAlert {...alertProps} />
    </AlertContext.Provider>
  );
}
