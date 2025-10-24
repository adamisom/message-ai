import { Colors } from './colors';

/**
 * Get color for priority level
 */
export function getPriorityColor(priority: string): string {
  switch (priority) {
    case 'high':
      return Colors.priorityHigh;
    case 'medium':
      return Colors.priorityMedium;
    case 'low':
      return Colors.priorityLow;
    default:
      return Colors.priorityDefault;
  }
}

/**
 * Get color for confidence score
 */
export function getConfidenceColor(confidence: number): string {
  if (confidence >= 0.9) return Colors.confidenceHigh;
  if (confidence >= 0.8) return Colors.confidenceMedium;
  return Colors.confidenceLow;
}

