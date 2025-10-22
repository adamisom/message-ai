import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

/**
 * Request notification permissions from the user
 * @returns Promise<boolean> - true if permissions granted
 */
export const requestNotificationPermissions = async (): Promise<boolean> => {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    // Only ask if permissions have not been determined
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('Notification permissions not granted');
      return false;
    }

    // For Android, set notification channel (required for Android 8.0+)
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    return true;
  } catch (error) {
    console.error('Error requesting notification permissions:', error);
    return false;
  }
};

/**
 * Schedule a local notification
 * @param title - Notification title (sender name)
 * @param body - Notification body (message text)
 * @param conversationId - ID of the conversation (for navigation)
 */
export const scheduleMessageNotification = async (
  title: string,
  body: string,
  conversationId: string
): Promise<void> => {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body: body.length > 100 ? body.substring(0, 100) + '...' : body,
        sound: 'default',
        data: { conversationId },
      },
      trigger: null, // Show immediately
    });
  } catch (error) {
    console.error('Error scheduling notification:', error);
  }
};

/**
 * Configure how notifications behave when app is in foreground
 */
export const configureNotificationHandler = (): void => {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,   // Show banner
      shouldPlaySound: true,   // Play sound
      shouldSetBadge: true,    // Update badge count (iOS)
      shouldShowBanner: true,  // Show notification banner
      shouldShowList: true,    // Show in notification list
    }),
  });
};

