import Anthropic from '@anthropic-ai/sdk';

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

