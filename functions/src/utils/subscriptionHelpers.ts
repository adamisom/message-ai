/**
 * Phase 4: Subscription Helpers
 * Pure functions for subscription calculations
 */

/**
 * Calculate subscription end date (1 year from start)
 */
export function calculateSubscriptionEndDate(startDate: Date = new Date()): Date {
  const endDate = new Date(startDate);
  endDate.setFullYear(endDate.getFullYear() + 1);
  return endDate;
}

/**
 * Check if a subscription is expired
 */
export function isSubscriptionExpired(
  subscriptionEndsAt: Date | { toMillis: () => number } | null,
  currentTime: number = Date.now()
): boolean {
  if (!subscriptionEndsAt) {
    return true;
  }
  
  const endsAt = subscriptionEndsAt instanceof Date
    ? subscriptionEndsAt.getTime()
    : subscriptionEndsAt.toMillis();
  
  return currentTime >= endsAt;
}

