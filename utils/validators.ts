/**
 * Input validation functions
 * Used across registration, login, and user discovery screens
 */

import { MIN_PASSWORD_LENGTH } from './constants';

/**
 * Validate email format
 * @param email - Email string to validate
 * @returns true if valid email format
 */
export const validateEmail = (email: string): boolean => {
  if (!email || typeof email !== 'string') {
    return false;
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
};

/**
 * Validate password strength
 * MVP requirement: minimum 6 characters (Firebase Auth minimum)
 * @param password - Password string to validate
 * @returns true if valid password
 */
export const validatePassword = (password: string): boolean => {
  if (!password || typeof password !== 'string') {
    return false;
  }
  
  return password.length >= MIN_PASSWORD_LENGTH;
};

/**
 * Validate display name
 * @param name - Display name to validate
 * @returns true if valid display name
 */
export const validateDisplayName = (name: string): boolean => {
  if (!name || typeof name !== 'string') {
    return false;
  }
  
  const trimmed = name.trim();
  return trimmed.length > 0 && trimmed.length <= 50;
};

/**
 * Get validation error message for email
 * @param email - Email to validate
 * @returns Error message or null if valid
 */
export const getEmailError = (email: string): string | null => {
  if (!email) {
    return 'Email is required';
  }
  if (!validateEmail(email)) {
    return 'Please enter a valid email address';
  }
  return null;
};

/**
 * Get validation error message for password
 * @param password - Password to validate
 * @returns Error message or null if valid
 */
export const getPasswordError = (password: string): string | null => {
  if (!password) {
    return 'Password is required';
  }
  if (!validatePassword(password)) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters`;
  }
  return null;
};

/**
 * Get validation error message for display name
 * @param name - Display name to validate
 * @returns Error message or null if valid
 */
export const getDisplayNameError = (name: string): string | null => {
  if (!name || !name.trim()) {
    return 'Display name is required';
  }
  if (name.trim().length > 50) {
    return 'Display name must be 50 characters or less';
  }
  return null;
};

