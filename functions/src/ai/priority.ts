import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import { callClaude } from '../utils/anthropic';
import { quickPriorityCheck } from '../utils/priorityHeuristics';
import { parseAIResponse, PrioritySchema } from '../utils/validation';

const db = admin.firestore();

// Real-time heuristic check on message creation
export const quickPriorityCheckTrigger = functions.firestore
  .document('conversations/{conversationId}/messages/{messageId}')
  .onCreate(async (snap, context) => {
    const message = snap.data();
    const quickPriority = quickPriorityCheck(message.text);

    if (quickPriority === 'high') {
      // Send enhanced push notification
      await sendPriorityNotification(message, 'high');

      // Update message
      await snap.ref.update({
        priorityQuick: 'high',
        priority: 'high', // Tentative
        priorityNeedsAnalysis: true,
      });
    } else if (quickPriority === 'low') {
      await snap.ref.update({
        priorityQuick: 'low',
        priority: 'low',
        priorityNeedsAnalysis: false,
      });
    } else {
      // Unknown - defer to batch
      await snap.ref.update({
        priorityQuick: 'unknown',
        priority: 'medium', // Default
        priorityNeedsAnalysis: true,
      });
    }
  });

// Scheduled batch AI priority analysis (every 10 minutes)
export const batchAnalyzePriority = functions.pubsub
  .schedule('every 10 minutes')
  .onRun(async (context) => {
    const needsAnalysis = await db
      .collectionGroup('messages')
      .where('priorityNeedsAnalysis', '==', true)
      .orderBy('createdAt', 'desc')
      .limit(100)
      .get();

    if (needsAnalysis.empty) {
      console.log('No messages need priority analysis');
      return;
    }

    console.log(`Analyzing priority for ${needsAnalysis.size} messages`);

    for (const messageDoc of needsAnalysis.docs) {
      const message = messageDoc.data();

      try {
        const aiPriority = await analyzeMessagePriorityWithAI(message.text);

        // Check if priority changed from heuristic
        const priorityChanged =
          message.priorityQuick === 'high' && aiPriority !== 'high';

        await messageDoc.ref.update({
          priority: aiPriority,
          priorityNeedsAnalysis: false,
          priorityAnalyzedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // Notify user if downgraded
        if (priorityChanged) {
          await notifyPriorityDowngrade(message, aiPriority);
        }
      } catch (error) {
        console.error(`Priority analysis failed for ${messageDoc.id}:`, error);
        // Keep heuristic result
        await messageDoc.ref.update({priorityNeedsAnalysis: false});
      }
    }
  });

async function analyzeMessagePriorityWithAI(text: string): Promise<string> {
  const prompt = `
Analyze this message and determine its priority level.

Message: "${text}"

Respond with JSON:
{ "priority": "high" | "medium" | "low", "reason": "brief explanation" }

Priority guidelines:
- HIGH: Urgent matters, time-sensitive requests, emergencies, critical decisions
- MEDIUM: Important but not urgent, questions needing response, scheduled items
- LOW: Casual conversation, acknowledgments, social messages
`;

  const rawResponse = await callClaude(prompt, 150);
  const result = parseAIResponse(rawResponse, PrioritySchema);
  return result.priority;
}

async function sendPriorityNotification(message: any, priority: string) {
  // TODO: Implement enhanced notification
  // For now, log
  console.log(`Priority ${priority} message detected:`, message);
}

async function notifyPriorityDowngrade(message: any, newPriority: string) {
  // TODO: Send in-app notification
  console.log(
    `Priority downgraded to ${newPriority} for message ${message.id}`
  );
}

