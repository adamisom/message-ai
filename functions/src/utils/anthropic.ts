import Anthropic from '@anthropic-ai/sdk';
import type {Tool} from '@anthropic-ai/sdk/resources/messages';

let anthropicClient: Anthropic | null = null;

function getAnthropicClient(): Anthropic {
  if (!anthropicClient) {
    anthropicClient = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }
  return anthropicClient;
}

export async function callClaude(
  prompt: string,
  maxTokens: number = 1500
): Promise<string> {
  const client = getAnthropicClient();
  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: maxTokens,
    messages: [{role: 'user', content: prompt}],
  });

  // Extract text from content blocks
  const textContent = response.content.find((block) => block.type === 'text');
  if (!textContent || textContent.type !== 'text') {
    throw new Error('No text content in Claude response');
  }

  return textContent.text;
}

/**
 * Call Claude with Tool Use for structured outputs
 * Returns already-parsed JSON object (no JSON.parse needed!)
 */
export async function callClaudeWithTool<T>(
  prompt: string,
  tool: Tool,
  options?: {
    maxTokens?: number;
    systemPrompt?: string;
  }
): Promise<T> {
  const client = getAnthropicClient();

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: options?.maxTokens || 2000,
    system: options?.systemPrompt,
    tools: [tool],
    tool_choice: {
      type: 'tool',
      name: tool.name,
    },
    messages: [{role: 'user', content: prompt}],
  });

  // Extract tool use response
  const toolUse = response.content.find(
    (block) => block.type === 'tool_use' && block.name === tool.name
  );

  if (!toolUse || toolUse.type !== 'tool_use') {
    throw new Error(`Claude did not use the ${tool.name} tool`);
  }

  // Return already-parsed input (no JSON.parse needed!)
  return toolUse.input as T;
}

