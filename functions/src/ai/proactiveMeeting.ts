import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import {callClaudeWithTool} from '../utils/anthropic';
import {suggestMeetingTimesTool} from '../utils/aiTools';
import {getConversationOrThrow, getMessagesForAI} from '../utils/conversationHelpers';
import {checkAIRateLimit} from '../utils/rateLimit';
import {verifyConversationAccess} from '../utils/security';

const db = admin.firestore();

interface MeetingSchedulerRequest {
  conversationId: string;
  messageCount?: number; // Optional: number of recent messages to analyze (default: 50)
}

interface MeetingTime {
  dateTime: string;
  reasoning: string;
  confidence: number;
}

interface MeetingSuggestion {
  suggestedTimes: MeetingTime[];
  participants: string[];
  context: string;
  conflicts?: string[];
}

/**
 * Proactive Meeting Scheduler (Advanced AI Capability)
 * 
 * Analyzes conversation history to detect scheduling discussions and
 * suggests optimal meeting times based on mentioned availability,
 * preferences, and constraints.
 * 
 * This is an advanced AI capability that demonstrates:
 * - Context understanding across multiple messages
 * - Intelligent time analysis and conflict detection
 * - Proactive assistance without explicit requests
 * - Integration with conversation history
 */
export const analyzeMeetingScheduling = functions
  .runWith({
    secrets: ['ANTHROPIC_API_KEY'],
    timeoutSeconds: 60, // Allow longer timeout for complex analysis
  })
  .https.onCall(async (data: MeetingSchedulerRequest, context) => {
    console.log('📅 [Meeting Scheduler] Starting analysis for conversation:', data.conversationId);

    // 1. Auth check
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'Must be authenticated to use meeting scheduler'
      );
    }

    // 2. Verify access to conversation
    await verifyConversationAccess(context.auth.uid, data.conversationId);

    // 3. Rate limit check
    const allowed = await checkAIRateLimit(context.auth.uid, 'meetingScheduler');
    if (!allowed) {
      throw new functions.https.HttpsError(
        'resource-exhausted',
        'Meeting scheduler usage limit exceeded (50/hour, 1000/month)'
      );
    }

    // 4. Get conversation and messages
    const {data: conversationData} = await getConversationOrThrow(data.conversationId);
    
    const messageLimit = data.messageCount || 50; // Default to last 50 messages
    const {messages, formatted: formattedMessages} = await getMessagesForAI(
      data.conversationId,
      {limit: messageLimit}
    );

    if (messages.length === 0) {
      throw new functions.https.HttpsError(
        'failed-precondition',
        'No messages found in conversation'
      );
    }

    console.log(`📅 [Meeting Scheduler] Analyzing ${messages.length} messages`);

    // 5. Get participant details for context
    const participantDetails = conversationData.participantDetails || {};
    const participantList = Object.entries(participantDetails)
      .map(([uid, details]: [string, any]) => `- ${details.displayName || 'Unknown'} (ID: ${uid})`)
      .join('\n');

    // 6. Get current date/time for context
    const now = new Date();
    const currentDateTime = now.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      hour12: true,
      timeZoneName: 'short',
    });

    // 7. Build prompt for Claude
    const prompt = `You are a scheduling assistant for a remote team. Analyze the following conversation and suggest 3 optimal meeting times.

CURRENT DATE/TIME: ${currentDateTime}

PARTICIPANTS:
${participantList}

CONVERSATION (${messages.length} messages):
${formattedMessages}

YOUR TASK:
1. Identify any scheduling-related discussions in the conversation
2. Extract mentioned availability, preferences, and constraints
3. Consider time zones if mentioned (default to Eastern Time if not specified)
4. Detect any conflicts or blockers
5. Suggest 3 specific meeting times with reasoning

GUIDELINES:
- Be specific: "Tuesday, October 29, 2025 at 2:00 PM ET" NOT "next week"
- Suggest times within the next 2 weeks unless otherwise indicated
- Consider typical business hours (9 AM - 6 PM)
- If availability is mentioned, respect those constraints
- If no specific availability mentioned, suggest general good meeting times
- Account for any mentioned conflicts or busy periods
- Order suggestions by confidence (most confident first)

RETURN:
- 3 specific meeting time suggestions
- Clear reasoning for each suggestion
- List of participants who should attend
- Brief context of what needs to be scheduled
- Any conflicts or constraints detected`;

    // 8. Call Claude with Tool Use API
    console.log('📅 [Meeting Scheduler] Calling Claude API...');
    const startTime = Date.now();
    
    const meetingSuggestion = await callClaudeWithTool<MeetingSuggestion>(
      prompt,
      suggestMeetingTimesTool,
      {
        maxTokens: 2000, // Allow more tokens for detailed analysis
      }
    );

    const responseTime = Date.now() - startTime;
    console.log(`📅 [Meeting Scheduler] Claude responded in ${responseTime}ms`);

    // 9. Validate response structure (already validated by Tool Use, but add safety check)
    if (!meetingSuggestion.suggestedTimes || meetingSuggestion.suggestedTimes.length === 0) {
      throw new functions.https.HttpsError(
        'internal',
        'Failed to generate meeting suggestions'
      );
    }

    // 10. Enhance response with metadata
    const enhancedResult = {
      ...meetingSuggestion,
      conversationId: data.conversationId,
      messagesAnalyzed: messages.length,
      generatedAt: admin.firestore.FieldValue.serverTimestamp(),
      generatedBy: context.auth.uid,
      model: 'claude-sonnet-4',
      responseTime: responseTime,
    };

    // 11. Optional: Store result in Firestore for learning/analytics
    // (Not required for MVP, but could be useful for tracking suggestions)
    try {
      await db
        .collection('conversations')
        .doc(data.conversationId)
        .collection('ai_meeting_suggestions')
        .add(enhancedResult);
      console.log('📅 [Meeting Scheduler] Stored suggestion in Firestore');
    } catch (error) {
      // Non-critical error, just log it
      console.warn('📅 [Meeting Scheduler] Failed to store suggestion:', error);
    }

    // 12. Return suggestions to client
    console.log(`📅 [Meeting Scheduler] Returning ${meetingSuggestion.suggestedTimes.length} suggestions`);
    return meetingSuggestion;
  });

