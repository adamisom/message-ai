/**
 * Cloud Functions Wrapper
 * Centralized wrapper for calling Firebase Cloud Functions
 * 
 * Refactoring: Eliminates boilerplate from 20+ service files
 * - Consistent error handling
 * - Consistent logging
 * - Type safety
 */

import { httpsCallable, HttpsCallableResult } from 'firebase/functions';
import { functions } from '../firebase.config';

/**
 * Call a Cloud Function with standardized error handling
 * 
 * @param functionName - Name of the Cloud Function
 * @param data - Data to pass to the function (optional)
 * @returns The function result data
 * @throws Error with user-friendly message
 * 
 * @example
 * const result = await callCloudFunction<{ conversationId: string }>(
 *   'acceptDirectMessageInvitation',
 *   { invitationId: 'inv-123' }
 * );
 * console.log(result.conversationId);
 */
export async function callCloudFunction<T = any>(
  functionName: string,
  data?: any
): Promise<T> {
  try {
    const fn = httpsCallable(functions, functionName);
    const result: HttpsCallableResult = await fn(data || {});
    return result.data as T;
  } catch (error: any) {
    console.error(`[${functionName}] Cloud Function error:`, error);
    console.error(`[${functionName}] Error code:`, error.code);
    console.error(`[${functionName}] Error message:`, error.message);
    
    // Extract user-friendly error message
    const message = error.message || `Failed to call ${functionName}`;
    throw new Error(message);
  }
}

/**
 * Call a Cloud Function with timeout support
 * Useful for long-running AI operations
 * 
 * @param functionName - Name of the Cloud Function
 * @param data - Data to pass to the function
 * @param timeoutMs - Timeout in milliseconds
 * @returns The function result data
 * @throws Error on timeout or function error
 */
export async function callCloudFunctionWithTimeout<T = any>(
  functionName: string,
  data: any,
  timeoutMs: number
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('Request timeout')), timeoutMs);
  });

  const functionPromise = callCloudFunction<T>(functionName, data);

  try {
    return await Promise.race([functionPromise, timeoutPromise]);
  } catch (error: any) {
    console.error(`[${functionName}] Timeout or error:`, error);
    throw error;
  }
}

/**
 * Call a Cloud Function and return success/error object
 * Useful when you want to handle errors without try/catch
 * 
 * @param functionName - Name of the Cloud Function
 * @param data - Data to pass to the function
 * @returns Object with success flag and data or error
 * 
 * @example
 * const { success, data, error } = await callCloudFunctionSafe('someFunction', { ... });
 * if (success) {
 *   console.log(data);
 * } else {
 *   Alert.alert('Error', error);
 * }
 */
export async function callCloudFunctionSafe<T = any>(
  functionName: string,
  data?: any
): Promise<{
  success: boolean;
  data?: T;
  error?: string;
}> {
  try {
    const result = await callCloudFunction<T>(functionName, data);
    return { success: true, data: result };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || `Failed to call ${functionName}`,
    };
  }
}

