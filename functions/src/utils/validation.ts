import {z} from 'zod';

export const SummarySchema = z.object({
  summary: z.string().min(10).max(1000),
  keyPoints: z.array(z.string()).min(3).max(10),
});

export const ActionItemSchema = z.object({
  text: z.string(),
  assigneeIdentifier: z.string().optional().nullable(),
  dueDate: z.string().datetime().optional().nullable(),
  priority: z.enum(['high', 'medium', 'low']),
  sourceMessageId: z.string(),
});

export const DecisionSchema = z.object({
  decision: z.string(),
  context: z.string(),
  participantIds: z.array(z.string()),
  sourceMessageIds: z.array(z.string()),
  confidence: z.number().min(0).max(1),
});

export const PrioritySchema = z.object({
  priority: z.enum(['high', 'medium', 'low']),
  reason: z.string(),
});

export function parseAIResponse<T>(
  rawResponse: string,
  schema: z.ZodSchema<T>
): T {
  // Strip markdown code blocks
  let json = rawResponse.trim();
  if (json.startsWith('```')) {
    json = json.replace(/^```json?\n/, '').replace(/\n```$/, '');
  }

  // Parse JSON
  let parsed;
  try {
    parsed = JSON.parse(json);
  } catch (error) {
    throw new Error(`JSON parsing failed: ${(error as Error).message}`);
  }

  // Validate with Zod
  const result = schema.safeParse(parsed);
  if (!result.success) {
    throw new Error(`Validation failed: ${result.error.message}`);
  }

  return result.data;
}

