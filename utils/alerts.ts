/**
 * Alert Helpers
 * Standardized alert patterns to reduce repetition
 * 
 * Refactoring: Eliminates 90+ duplicate Alert.alert calls
 */

import { Alert } from 'react-native';

export const Alerts = {
  /**
   * Show success alert
   */
  success: (message: string, onOk?: () => void) => {
    Alert.alert('Success', message, [{ text: 'OK', onPress: onOk }]);
  },

  /**
   * Show error alert
   */
  error: (error: Error | string, onOk?: () => void) => {
    const message = typeof error === 'string' ? error : error.message;
    Alert.alert('Error', message, [{ text: 'OK', onPress: onOk }]);
  },

  /**
   * Show confirmation alert
   */
  confirm: (
    title: string,
    message: string,
    onConfirm: () => void | Promise<void>,
    options?: {
      confirmText?: string;
      cancelText?: string;
      isDestructive?: boolean;
    }
  ) => {
    Alert.alert(title, message, [
      { 
        text: options?.cancelText || 'Cancel', 
        style: 'cancel' 
      },
      {
        text: options?.confirmText || 'Confirm',
        style: options?.isDestructive ? 'destructive' : 'default',
        onPress: onConfirm,
      },
    ]);
  },

  /**
   * Show info alert
   */
  info: (title: string, message: string, onOk?: () => void) => {
    Alert.alert(title, message, [{ text: 'OK', onPress: onOk }]);
  },

  /**
   * Show warning alert
   */
  warning: (message: string, onOk?: () => void) => {
    Alert.alert('Warning', message, [{ text: 'OK', onPress: onOk }]);
  },
};

