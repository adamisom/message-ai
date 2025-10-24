/**
 * Feature Flags Configuration
 * 
 * Centralized control for experimental or in-development features.
 * Set flags to true/false to enable/disable features across the app.
 */

export const FEATURE_FLAGS = {
  /**
   * Priority Badge Detection (Phase 2 AI)
   * Shows colored badges (🔴 high, 🟡 medium) next to messages based on AI priority analysis.
   * 
   * Status: Enabled for testing - only shows high priority (red) badges
   * TODO: Monitor for layout issues
   */
  PRIORITY_BADGES_ENABLED: true,

  /**
   * Semantic Search (Phase 2 AI)
   * Enables vector-based semantic search in conversations.
   */
  SEMANTIC_SEARCH_ENABLED: true,

  /**
   * Thread Summarization (Phase 2 AI)
   * Enables AI-powered conversation summaries.
   */
  THREAD_SUMMARY_ENABLED: true,

  /**
   * Action Items Extraction (Phase 2 AI)
   * Enables AI-powered action item detection and tracking.
   */
  ACTION_ITEMS_ENABLED: true,

  /**
   * Decision Tracking (Phase 2 AI)
   * Enables AI-powered decision detection in group conversations.
   */
  DECISION_TRACKING_ENABLED: true,
} as const;

/**
 * Type-safe feature flag checker
 */
export function isFeatureEnabled(flag: keyof typeof FEATURE_FLAGS): boolean {
  return FEATURE_FLAGS[flag];
}

