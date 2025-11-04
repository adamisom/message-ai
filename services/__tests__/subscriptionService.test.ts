/**
 * Unit tests for Subscription Service
 */

import { Alert } from 'react-native';
import { httpsCallable } from 'firebase/functions';
import {
  upgradeUserToPro,
  startFreeTrial,
  showUpgradeSuccessAlert,
  showTrialStartedAlert,
  showUpgradeErrorAlert,
  showTrialErrorAlert,
} from '../subscriptionService';

// Mock dependencies
jest.mock('firebase/functions');
jest.mock('react-native', () => ({
  Alert: {
    alert: jest.fn(),
  },
}));

jest.mock('../../firebase.config', () => ({
  functions: {},
}));

describe('subscriptionService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Suppress console.error in tests since we're intentionally testing error cases
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('upgradeUserToPro', () => {
    it('should show upgrade confirmation and call Cloud Function on confirm', async () => {
      const mockUpgradeFn = jest.fn().mockResolvedValue({});
      (httpsCallable as jest.Mock).mockReturnValue(mockUpgradeFn);

      // Mock Alert.alert to automatically press "Upgrade Now"
      (Alert.alert as jest.Mock).mockImplementation((title, message, buttons) => {
        const upgradeButton = buttons?.find((b: any) => b.text === 'Upgrade Now');
        if (upgradeButton?.onPress) {
          upgradeButton.onPress();
        }
      });

      await upgradeUserToPro();

      expect(Alert.alert).toHaveBeenCalledWith(
        'Upgrade to Pro',
        expect.stringContaining('MVP Mode'),
        expect.any(Array)
      );
      expect(mockUpgradeFn).toHaveBeenCalledWith({});
    });

    it('should reject on cancel', async () => {
      (Alert.alert as jest.Mock).mockImplementation((title, message, buttons) => {
        const cancelButton = buttons?.find((b: any) => b.text === 'Cancel');
        if (cancelButton?.onPress) {
          cancelButton.onPress();
        }
      });

      await expect(upgradeUserToPro()).rejects.toThrow('Upgrade cancelled');
    });

    it('should handle Cloud Function errors', async () => {
      const mockError = new Error('Payment failed');
      const mockUpgradeFn = jest.fn().mockRejectedValue(mockError);
      (httpsCallable as jest.Mock).mockReturnValue(mockUpgradeFn);

      (Alert.alert as jest.Mock).mockImplementation((title, message, buttons) => {
        const upgradeButton = buttons?.find((b: any) => b.text === 'Upgrade Now');
        if (upgradeButton?.onPress) {
          upgradeButton.onPress();
        }
      });

      await expect(upgradeUserToPro()).rejects.toThrow('Payment failed');
    });
  });

  describe('startFreeTrial', () => {
    it('should call startFreeTrial Cloud Function', async () => {
      const mockTrialFn = jest.fn().mockResolvedValue({});
      (httpsCallable as jest.Mock).mockReturnValue(mockTrialFn);

      await startFreeTrial();

      expect(httpsCallable).toHaveBeenCalledWith(expect.anything(), 'startFreeTrial');
      expect(mockTrialFn).toHaveBeenCalledWith({});
    });

    it('should throw error on failure', async () => {
      const mockError = new Error('Trial limit reached');
      const mockTrialFn = jest.fn().mockRejectedValue(mockError);
      (httpsCallable as jest.Mock).mockReturnValue(mockTrialFn);

      await expect(startFreeTrial()).rejects.toThrow('Trial limit reached');
    });
  });

  describe('Alert helpers', () => {
    it('showUpgradeSuccessAlert should show success message', () => {
      const onSuccess = jest.fn();
      showUpgradeSuccessAlert(onSuccess);

      expect(Alert.alert).toHaveBeenCalledWith(
        'Success!',
        expect.stringContaining('upgraded to Pro'),
        expect.any(Array)
      );

      // Simulate pressing OK
      const call = (Alert.alert as jest.Mock).mock.calls[0];
      const buttons = call[2];
      buttons[0].onPress();

      expect(onSuccess).toHaveBeenCalled();
    });

    it('showTrialStartedAlert should show trial message', () => {
      const onSuccess = jest.fn();
      showTrialStartedAlert(onSuccess);

      expect(Alert.alert).toHaveBeenCalledWith(
        '🎉 Trial Started!',
        expect.stringContaining('5 days'),
        expect.any(Array)
      );
    });

    it('showUpgradeErrorAlert should show error message', () => {
      const error = new Error('Network error');
      showUpgradeErrorAlert(error);

      expect(Alert.alert).toHaveBeenCalledWith(
        'Error',
        'Failed to upgrade: Network error',
        expect.any(Array)
      );
    });

    it('showTrialErrorAlert should show error message', () => {
      const error = new Error('Already used trial');
      showTrialErrorAlert(error);

      expect(Alert.alert).toHaveBeenCalledWith(
        'Error',
        'Already used trial',
        expect.any(Array)
      );
    });
  });
});

