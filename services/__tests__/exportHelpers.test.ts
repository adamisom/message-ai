/**
 * Unit tests for Export Helpers
 */

import { Share } from 'react-native';
import { exportAndShare } from '../exportHelpers';
import * as cloudFunctions from '../cloudFunctions';

// Mock Firebase config to prevent initialization
jest.mock('../../firebase.config', () => ({
  functions: {},
}));

// Mock dependencies
jest.mock('../cloudFunctions');
jest.mock('react-native', () => ({
  Share: {
    share: jest.fn(),
  },
}));

const mockCallCloudFunction = cloudFunctions.callCloudFunction as jest.MockedFunction<typeof cloudFunctions.callCloudFunction>;

describe('exportHelpers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('exportAndShare', () => {
    it('should call Cloud Function and share data', async () => {
      const mockExportData = {
        workspaceId: 'ws-123',
        workspaceName: 'Test Workspace',
        members: [],
        conversations: [],
        metadata: { totalMessages: 100 },
      };

      (mockCallCloudFunction as jest.Mock).mockResolvedValue(mockExportData);
      (Share.share as jest.Mock).mockResolvedValue({ action: 'sharedAction' });

      const result = await exportAndShare('exportWorkspace', 'test.json', { workspaceId: 'ws-123' });

      expect(mockCallCloudFunction).toHaveBeenCalledWith('exportWorkspace', { workspaceId: 'ws-123' });
      expect(Share.share).toHaveBeenCalledWith({
        message: expect.stringContaining('"workspaceId": "ws-123"'),
        title: 'test.json',
      });
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

    it('should handle Share.share errors', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const mockData = { some: 'data' };
      
      (mockCallCloudFunction as jest.Mock).mockResolvedValue(mockData);
      (Share.share as jest.Mock).mockRejectedValue(new Error('Share cancelled'));

      const result = await exportAndShare('exportFunction', 'file.json');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Share cancelled');

      consoleSpy.mockRestore();
    });

    it('should format JSON with proper indentation', async () => {
      const mockData = { key: 'value', nested: { data: 123 } };
      
      (mockCallCloudFunction as jest.Mock).mockResolvedValue(mockData);
      (Share.share as jest.Mock).mockResolvedValue({});

      await exportAndShare('test', 'file.json');

      const shareCall = (Share.share as jest.Mock).mock.calls[0][0];
      expect(shareCall.message).toContain('  "key": "value"'); // 2-space indent
      expect(shareCall.message).toContain('  "nested": {');
    });

    it('should work without optional data parameter', async () => {
      const mockData = { result: 'success' };
      
      (mockCallCloudFunction as jest.Mock).mockResolvedValue(mockData);
      (Share.share as jest.Mock).mockResolvedValue({});

      const result = await exportAndShare('noParamsFunction', 'output.json');

      expect(mockCallCloudFunction).toHaveBeenCalledWith('noParamsFunction', undefined);
      expect(result.success).toBe(true);
    });
  });
});

