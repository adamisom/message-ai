/**
 * Message Edit/Delete Service
 * Sub-Phase 11 (Polish): Pro-only feature
 */

import { callCloudFunction } from './cloudFunctions';

/**
 * Edit a message (Pro-only)
 */
export async function editMessage(
  conversationId: string,
  messageId: string,
  newText: string
): Promise<void> {
  try {
    await callCloudFunction('editMessage', { conversationId, messageId, newText });
  } catch (error: any) {
    console.error('[editMessage] Error:', error);
    throw new Error(error.message || 'Failed to edit message');
  }
}

/**
 * Delete a message (Pro-only)
 */
export async function deleteMessage(
  conversationId: string,
  messageId: string
): Promise<void> {
  try {
    await callCloudFunction('deleteMessage', { conversationId, messageId });
  } catch (error: any) {
    console.error('[deleteMessage] Error:', error);
    throw new Error(error.message || 'Failed to delete message');
  }
}

