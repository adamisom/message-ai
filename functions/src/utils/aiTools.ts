/**
 * AI Tool Definitions for Anthropic Claude Tool Use API
 * 
 * These tools define structured outputs for Claude to ensure:
 * - Server-side schema validation
 * - No markdown wrapping
 * - Already-parsed JSON responses
 */

import { Tool } from '@anthropic-ai/sdk/resources/messages';

/**
 * Tool for extracting action items from conversations
 */
export const extractActionItemsTool: Tool = {
  name: 'extract_action_items',
  description: `Extract action items (tasks, commitments, todos) from a conversation.
  
An action item is a specific task that:
- Was explicitly mentioned by a participant
- Needs to be completed or addressed
- Has a clear action (e.g., "review", "send", "update", "discuss")

Look for phrases like:
- "I will...", "Can you...", "Please...", "Should..."
- Assignments: "John should review", "Alice will send"
- Commitments: "Let's discuss tomorrow", "I'll check with the team"

Do NOT include:
- General statements or opinions
- Questions without clear action
- Already completed tasks`,
  input_schema: {
    type: 'object',
    properties: {
      items: {
        type: 'array',
        description: 'List of action items found in the conversation',
        items: {
          type: 'object',
          properties: {
            text: {
              type: 'string',
              description: 'Clear description of the action item (what needs to be done)',
            },
            assigneeIdentifier: {
              type: 'string',
              description: 'Display name or email of person assigned to this task. Use null if no specific person mentioned.',
            },
            dueDate: {
              type: 'string',
              description: 'ISO 8601 timestamp if a deadline is mentioned (e.g., "by Friday", "tomorrow", "end of day"). Use null if no deadline mentioned.',
            },
            priority: {
              type: 'string',
              enum: ['high', 'medium', 'low'],
              description: 'Priority level based on language and urgency: high=uses urgent language (ASAP, urgent, immediately) or has near deadline; medium=standard tasks with timeframes; low=optional suggestions or vague future tasks',
            },
            sourceMessageId: {
              type: 'string',
              description: 'ID of the message where this action item was mentioned',
            },
          },
          required: ['text', 'priority', 'sourceMessageId'],
        },
      },
    },
    required: ['items'],
  },
};

/**
 * Tool for generating conversation summaries
 */
export const generateSummaryTool: Tool = {
  name: 'generate_summary',
  description: `Generate a concise summary of a conversation with key discussion points.
  
The summary should:
- Be 2-4 sentences capturing the main topics discussed
- Highlight any decisions made or conclusions reached
- Note important participants and their contributions
- Be written in third person, professional tone

Key points should:
- Be specific, actionable bullet points
- Cover different topics discussed (not just repeating the summary)
- Include any decisions, action items decided, or important details
- Be 3-10 points total`,
  input_schema: {
    type: 'object',
    properties: {
      summary: {
        type: 'string',
        description: '2-4 sentence summary of the conversation',
      },
      keyPoints: {
        type: 'array',
        description: '3-10 key discussion points from the conversation',
        items: {
          type: 'string',
          description: 'A specific, clear point about what was discussed',
        },
        minItems: 3,
        maxItems: 10,
      },
    },
    required: ['summary', 'keyPoints'],
  },
};

/**
 * Tool for tracking decisions in group conversations
 */
export const trackDecisionsTool: Tool = {
  name: 'track_decisions',
  description: `Identify and track decisions made in a group conversation.
  
A decision is:
- A clear choice or conclusion reached by the group
- Has agreement from multiple participants (not just one person's opinion)
- Is actionable or impacts future behavior
- Uses decisive language: "we'll go with", "decided to", "agreed on"

Examples of decisions:
- "We'll go with option A for the Q4 budget"
- "Let's postpone the launch until December"
- "Agreed: John will lead the project"

NOT decisions:
- Single person's opinion: "I think we should..."
- Questions: "Should we consider option B?"
- Tentative: "Maybe we could...", "Let's think about..."

Only return decisions you are confident about (>70% confidence).`,
  input_schema: {
    type: 'object',
    properties: {
      decisions: {
        type: 'array',
        description: 'List of decisions made in the conversation',
        items: {
          type: 'object',
          properties: {
            decision: {
              type: 'string',
              description: 'Clear statement of what was decided',
            },
            context: {
              type: 'string',
              description: '1-2 sentence context: what led to this decision, why it matters',
            },
            participantIds: {
              type: 'array',
              description: 'User IDs of participants who agreed or contributed to this decision',
              items: {
                type: 'string',
              },
            },
            sourceMessageIds: {
              type: 'array',
              description: 'IDs of messages where this decision was discussed',
              items: {
                type: 'string',
              },
            },
            confidence: {
              type: 'number',
              description: 'Confidence score 0-1 that this is actually a decision (only return if > 0.7)',
              minimum: 0.7,
              maximum: 1.0,
            },
          },
          required: ['decision', 'context', 'participantIds', 'sourceMessageIds', 'confidence'],
        },
      },
    },
    required: ['decisions'],
  },
};

/**
 * Tool for analyzing message priority
 */
export const analyzeMessagePriorityTool: Tool = {
  name: 'analyze_message_priority',
  description: `Analyze a message and determine its priority level.
  
Priority should reflect urgency and importance:
- HIGH: Urgent matters requiring immediate attention
  * Time-sensitive requests ("need ASAP", "urgent")
  * Emergencies or critical issues
  * Requests with near deadlines
  * All-caps messages indicating urgency
  
- MEDIUM: Important but not immediately urgent
  * Questions needing response
  * Scheduled items without near deadlines
  * Standard work requests
  * Discussion topics
  
- LOW: Casual conversation, non-urgent
  * Greetings, acknowledgments ("thanks", "ok", "lol")
  * Social messages, chitchat
  * Messages with only emojis
  * Non-actionable comments

Consider the language, tone, and content to determine priority.`,
  input_schema: {
    type: 'object',
    properties: {
      priority: {
        type: 'string',
        enum: ['high', 'medium', 'low'],
        description: 'Priority level of the message',
      },
      reason: {
        type: 'string',
        description: 'Brief explanation (1 sentence) why this priority was assigned',
      },
    },
    required: ['priority', 'reason'],
  },
};

