import OpenAI from 'openai';

let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openaiClient;
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const client = getOpenAIClient();
  const response = await client.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
  });
  return response.data[0].embedding;
}

export async function batchGenerateEmbeddings(
  texts: string[]
): Promise<number[][]> {
  const client = getOpenAIClient();
  const response = await client.embeddings.create({
    model: 'text-embedding-3-small',
    input: texts,
  });
  return response.data.map((item) => item.embedding);
}

