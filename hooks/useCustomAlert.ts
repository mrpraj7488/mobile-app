import { useState, useCallback } from 'react';
import { AlertType, AlertButton } from '@/components/CustomAlert';

interface AlertConfig {
  type: AlertType;
  title: string;
  message: string;
  buttons?: AlertButton[];
  autoClose?: boolean;
  autoCloseDelay?: number;
}

export function useCustomAlert() {
  const [alertConfig, setAlertConfig] = useState<AlertConfig | null>(null);
  const [visible, setVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  const showAlert = useCallback((config: AlertConfig) => {
    if (isClosing || visible) return;
    
    setAlertConfig(config);
    setVisible(true);
    setIsClosing(false);
  }, [visible, isClosing]);

  const hideAlert = useCallback(() => {
    if (!visible) return;
    
    setIsClosing(true);
    setVisible(false);
    setAlertConfig(null);
    setIsClosing(false);
  }, [visible]);

  // Convenience methods for different alert types
  const showSuccess = useCallback((title: string, message: string, autoClose = true) => {
    showAlert({
      type: 'success',
      title,
      message,
      autoClose,
      buttons: [{ text: 'OK', style: 'default' }],
    });
  }, [showAlert]);

  const showError = useCallback((title: string, message: string) => {
    showAlert({
      type: 'error',
      title,
      message,
      buttons: [{ text: 'OK', style: 'default' }],
    });
  }, [showAlert]);

  const showWarning = useCallback((title: string, message: string) => {
    showAlert({
      type: 'warning',
      title,
      message,
      buttons: [{ text: 'OK', style: 'default' }],
    });
  }, [showAlert]);

  const showInfo = useCallback((title: string, message: string, autoClose = false) => {
    showAlert({
      type: 'info',
      title,
      message,
      autoClose,
      buttons: [{ text: 'OK', style: 'default' }],
    });
  }, [showAlert]);

  const showConfirm = useCallback((
    title: string, 
    message: string, 
    onConfirm: () => void,
    onCancel?: () => void,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    thirdButtonText?: string,
    onThirdButton?: () => void
  ) => {
    const buttons = [
      { 
        text: cancelText, 
        style: 'cancel' as const,
        onPress: onCancel 
      },
      { 
        text: confirmText, 
        style: 'default' as const,
        onPress: onConfirm 
      },
    ];

    if (thirdButtonText) {
      buttons.splice(1, 0, {
        text: thirdButtonText,
        style: 'default' as const,
        onPress: onThirdButton || (() => {})
      });
    }

    showAlert({
      type: 'confirm',
      title,
      message,
      buttons,
    });
  }, [showAlert]);

  const showDestructiveConfirm = useCallback((
    title: string, 
    message: string, 
    onConfirm: () => void,
    onCancel?: () => void,
    confirmText = 'Delete',
    cancelText = 'Cancel'
  ) => {
    showAlert({
      type: 'warning',
      title,
      message,
      buttons: [
        { 
          text: cancelText, 
          style: 'cancel',
          onPress: onCancel 
        },
        { 
          text: confirmText, 
          style: 'destructive',
          onPress: onConfirm 
        },
      ],
    });
  }, [showAlert]);

  return {
    // Alert component props
    alertProps: {
      visible: visible && !isClosing,
      type: alertConfig?.type || 'info',
      title: alertConfig?.title || '',
      message: alertConfig?.message || '',
      buttons: alertConfig?.buttons,
      onClose: hideAlert,
      autoClose: alertConfig?.autoClose,
      autoCloseDelay: alertConfig?.autoCloseDelay,
    },
    
    // Methods to show different types of alerts
    showAlert,
    hideAlert,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showConfirm,
    showDestructiveConfirm,
    isVisible: visible,
    isClosing,
  };
}
