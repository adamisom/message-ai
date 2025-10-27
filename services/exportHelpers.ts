/**
 * Export Helpers
 * Shared helper for workspace and user conversation exports
 * 
 * Refactoring: Eliminates duplicate export logic between services
 */

import { Share } from 'react-native';
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
    
    // Share the file using native Share API
    await Share.share({
      message: jsonString,
      title: filename,
    });
    
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

