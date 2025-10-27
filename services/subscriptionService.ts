/**
 * Subscription Service
 * Centralized logic for Pro upgrades and trial management
 * 
 * Refactoring: Eliminates duplicate upgrade/trial logic from:
 * - app/(tabs)/profile.tsx
 * - components/UpgradeToProModal.tsx
 * - components/TrialWorkspaceModal.tsx
 */

import { Alert } from 'react-native';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase.config';

/**
 * Upgrade user to Pro (MVP: instant, no real payment)
 * In production, this would trigger Stripe payment flow
 */
export async function upgradeUserToPro(): Promise<void> {
  return new Promise((resolve, reject) => {
    Alert.alert(
      'Upgrade to Pro',
      'MVP Mode: Instant upgrade (no real payment)\n\nIn production, this would open Stripe payment flow.',
      [
        { text: 'Cancel', style: 'cancel', onPress: () => reject(new Error('Upgrade cancelled')) },
        {
          text: 'Upgrade Now',
          onPress: async () => {
            try {
              const upgradeToPro = httpsCallable(functions, 'upgradeToPro');
              await upgradeToPro({});
              resolve();
            } catch (error: any) {
              reject(error);
            }
          },
        },
      ]
    );
  });
}

/**
 * Start 5-day free trial
 */
export async function startFreeTrial(): Promise<void> {
  try {
    const startTrialFn = httpsCallable(functions, 'startFreeTrial');
    await startTrialFn({});
  } catch (error: any) {
    console.error('[subscriptionService] startFreeTrial error:', error);
    throw new Error(error.message || 'Failed to start trial');
  }
}

/**
 * Show upgrade success alert and execute callback
 */
export function showUpgradeSuccessAlert(onSuccess?: () => void): void {
  Alert.alert(
    'Success!',
    "You've been upgraded to Pro! 🎉",
    [{ text: 'OK', onPress: onSuccess }]
  );
}

/**
 * Show trial started alert and execute callback
 */
export function showTrialStartedAlert(onSuccess?: () => void): void {
  Alert.alert(
    '🎉 Trial Started!',
    'You now have 5 days of free access to all Pro features. Enjoy!',
    [{ text: 'OK', onPress: onSuccess }]
  );
}

/**
 * Show upgrade error alert
 */
export function showUpgradeErrorAlert(error: Error): void {
  Alert.alert(
    'Error',
    `Failed to upgrade: ${error.message}`,
    [{ text: 'OK' }]
  );
}

/**
 * Show trial error alert
 */
export function showTrialErrorAlert(error: Error): void {
  Alert.alert(
    'Error',
    error.message || 'Failed to start trial. Please try again.',
    [{ text: 'OK' }]
  );
}

