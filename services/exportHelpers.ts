/**
 * Export Helpers
 * Shared helper for workspace and user conversation exports
 * 
 * Refactoring: Eliminates duplicate export logic between services
 */

import { Share, Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { callCloudFunction } from './cloudFunctions';

/**
 * Export data from Cloud Function and share as JSON
 * 
 * @param functionName - Cloud Function to call
 * @param filename - Display name for the export
 * @param data - Optional data to pass to function
 * @returns Result with success flag, data, and optional error
 */
export async function exportAndShare<T = any>(
  functionName: string,
  filename: string,
  data?: any
): Promise<{
  success: boolean;
  data?: T;
  error?: string;
}> {
  try {
    console.log(`[exportHelpers] Starting export: ${functionName}`);
    
    // Call Cloud Function to generate export
    const exportData = await callCloudFunction<T>(functionName, data);
    
    console.log(`[exportHelpers] Export received for ${functionName}`);
    
    // Convert to formatted JSON string
    const jsonString = JSON.stringify(exportData, null, 2);
    
    // iOS: Use file system + expo-sharing for proper filename
    if (Platform.OS === 'ios') {
      const fileUri = `${FileSystem.cacheDirectory}${filename}`;
      
      // Write JSON to file (utf8 is the default encoding)
      await FileSystem.writeAsStringAsync(fileUri, jsonString);
      
      // Check if sharing is available
      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        throw new Error('Sharing is not available on this device');
      }
      
      // Share the file (this properly sets the filename)
      await Sharing.shareAsync(fileUri, {
        mimeType: 'application/json',
        dialogTitle: 'Export Workspace Data',
        UTI: 'public.json',
      });
      
      // Clean up temp file
      await FileSystem.deleteAsync(fileUri, { idempotent: true });
    } else {
      // Android: Use native Share API
      const result = await Share.share({
        message: jsonString,
        title: filename,
      });
      
      // Check if user dismissed
      if (result.action === Share.dismissedAction) {
        console.log('[exportHelpers] User dismissed share dialog');
        return {
          success: false,
          error: 'Export cancelled',
        };
      }
    }
    
    return {
      success: true,
      data: exportData,
    };
  } catch (error: any) {
    console.error(`[exportHelpers] Export error for ${functionName}:`, error);
    return {
      success: false,
      error: error.message || 'Failed to export data',
    };
  }
}

