/**
 * Unit tests for Export Helpers
 */

import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { exportAndShare } from '../exportHelpers';
import * as cloudFunctions from '../cloudFunctions';

// Mock Firebase config to prevent initialization
jest.mock('../../firebase.config', () => ({
  functions: {},
}));

// Mock Expo modules
jest.mock('expo-file-system/legacy', () => ({
  writeAsStringAsync: jest.fn().mockResolvedValue(undefined),
  deleteAsync: jest.fn().mockResolvedValue(undefined),
  cacheDirectory: '/mock/cache/',
}));

jest.mock('expo-sharing', () => ({
  shareAsync: jest.fn().mockResolvedValue(undefined),
  isAvailableAsync: jest.fn().mockResolvedValue(true),
}));

// Mock dependencies
jest.mock('../cloudFunctions');
jest.mock('react-native', () => ({
  Share: {
    share: jest.fn(),
  },
  Platform: {
    OS: 'ios', // Test iOS path
  },
}));

const mockCallCloudFunction = cloudFunctions.callCloudFunction as jest.MockedFunction<typeof cloudFunctions.callCloudFunction>;

describe('exportHelpers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Suppress console.log in tests to reduce noise
    jest.spyOn(console, 'log').mockImplementation(() => {});
    // Ensure sharing is available by default
    (Sharing.isAvailableAsync as jest.Mock).mockResolvedValue(true);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('exportAndShare', () => {
    it('should call Cloud Function and share data via expo-sharing on iOS', async () => {
      const mockExportData = {
        workspaceId: 'ws-123',
        workspaceName: 'Test Workspace',
        members: [],
        conversations: [],
        metadata: { totalMessages: 100 },
      };

      (mockCallCloudFunction as jest.Mock).mockResolvedValue(mockExportData);

      const result = await exportAndShare('exportWorkspace', 'test.json', { workspaceId: 'ws-123' });

      expect(mockCallCloudFunction).toHaveBeenCalledWith('exportWorkspace', { workspaceId: 'ws-123' });
      expect(FileSystem.writeAsStringAsync).toHaveBeenCalled();
      expect(Sharing.shareAsync).toHaveBeenCalled();
      expect(FileSystem.deleteAsync).toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockExportData);
    });

    it('should handle Cloud Function errors', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      (mockCallCloudFunction as jest.Mock).mockRejectedValue(new Error('Export failed'));

      const result = await exportAndShare('exportWorkspace', 'test.json');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Export failed');
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should handle sharing errors', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const mockData = { some: 'data' };
      
      (mockCallCloudFunction as jest.Mock).mockResolvedValue(mockData);
      (Sharing.shareAsync as jest.Mock).mockRejectedValue(new Error('Share failed'));

      const result = await exportAndShare('exportFunction', 'file.json');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Share failed');

      consoleSpy.mockRestore();
    });

    it('should format JSON with proper indentation', async () => {
      const mockData = { key: 'value', nested: { data: 123 } };
      
      (mockCallCloudFunction as jest.Mock).mockResolvedValue(mockData);

      await exportAndShare('test', 'file.json');

      const writeCall = (FileSystem.writeAsStringAsync as jest.Mock).mock.calls[0][1];
      expect(writeCall).toContain('  "key": "value"'); // 2-space indent
      expect(writeCall).toContain('  "nested": {');
    });

    it('should work without optional data parameter', async () => {
      const mockData = { result: 'success' };
      
      (mockCallCloudFunction as jest.Mock).mockResolvedValue(mockData);
      (Sharing.shareAsync as jest.Mock).mockResolvedValue(undefined);
      (Sharing.isAvailableAsync as jest.Mock).mockResolvedValue(true);

      const result = await exportAndShare('noParamsFunction', 'output.json');

      expect(mockCallCloudFunction).toHaveBeenCalledWith('noParamsFunction', undefined);
      expect(result.success).toBe(true);
    });
  });
});

