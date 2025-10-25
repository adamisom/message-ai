// Theme colors used throughout the app
export const Colors = {
  // Primary
  primary: '#007AFF',
  
  // Text
  textDark: '#333',
  textMedium: '#666',
  textLight: '#999',
  textWhite: '#fff',
  
  // Backgrounds
  background: '#fff',
  backgroundGray: '#f8f8f8',
  backgroundLight: '#f5f5f5',
  
  // Borders
  border: '#e0e0e0',
  borderLight: '#f0f0f0',
  
  // Status
  error: '#c00',
  errorBackground: '#fee',
  success: '#44ff44',
  warning: '#ffaa00',
  
  // Priority colors
  priorityHigh: '#ff4444',
  priorityMedium: '#ffaa00',
  priorityLow: '#44ff44',
  priorityDefault: '#999999',
  
  // Confidence colors
  confidenceHigh: '#44ff44',      // >= 0.9
  confidenceMedium: '#88ff88',    // >= 0.8
  confidenceLow: '#ffaa00',       // < 0.8
} as const;

