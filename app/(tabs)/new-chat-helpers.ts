/**
 * Helper functions for New Chat screen
 * Sub-Phase 11: Polish & Testing - Improved UX with auto-detection
 */

interface User {
  uid: string;
  email: string;
  displayName: string;
}

interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Determine chat type based on number of users
 * @param users Array of users to chat with (excluding current user)
 * @returns 'direct' for 1 user, 'group' for 2+, null for invalid count
 */
export function determineChatType(users: User[]): 'direct' | 'group' | null {
  if (users.length === 0 || users.length > 24) {
    return null; // Invalid: need 1-24 users (25 total including current user)
  }
  
  return users.length === 1 ? 'direct' : 'group';
}

/**
 * Generate dynamic button text based on chat type and user count
 * @param users Array of users
 * @param loading Whether chat creation is in progress
 * @returns Button text string
 */
export function generateCreateButtonText(users: User[], loading: boolean): string {
  if (loading) {
    return 'Creating...';
  }
  
  const chatType = determineChatType(users);
  
  if (chatType === 'direct') {
    // Direct chat: Show recipient name
    return `Chat with ${users[0]?.displayName || 'User'}`;
  } else if (chatType === 'group') {
    // Group chat: Show total member count (including current user)
    return `Create Group (${users.length + 1} members)`;
  }
  
  return 'Create Chat'; // Fallback
}

/**
 * Validate user list for chat creation
 * @param users Array of users to validate
 * @param currentUserId UID of current user (should not be in list)
 * @returns Validation result with error message if invalid
 */
export function validateUserList(users: User[], currentUserId: string): ValidationResult {
  // Check if empty
  if (users.length === 0) {
    return {
      valid: false,
      error: 'Please add at least one user',
    };
  }
  
  // Check if exceeds limit (25 total including current user)
  if (users.length > 24) {
    return {
      valid: false,
      error: 'Maximum 25 members per group (including you)',
    };
  }
  
  // Check if current user is in the list
  if (users.some(u => u.uid === currentUserId)) {
    return {
      valid: false,
      error: "You can't add yourself to the chat",
    };
  }
  
  // Check for duplicates
  const uniqueUids = new Set(users.map(u => u.uid));
  if (uniqueUids.size !== users.length) {
    return {
      valid: false,
      error: 'Duplicate users detected',
    };
  }
  
  return { valid: true };
}

/**
 * Get descriptive text for user list title
 * @param users Array of users
 * @returns Title string
 */
export function getUserListTitle(users: User[]): string {
  const chatType = determineChatType(users);
  
  if (chatType === 'direct') {
    return 'Selected User:';
  } else if (chatType === 'group') {
    return `Group Members (${users.length + 1}):`;
  }
  
  return 'Selected Users:'; // Fallback
}

