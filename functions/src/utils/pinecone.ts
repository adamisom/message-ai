import {Pinecone} from '@pinecone-database/pinecone';
import * as functions from 'firebase-functions';

let pineconeClient: Pinecone | null = null;
let pineconeIndex: any = null;

function getPineconeClient(): Pinecone {
  if (!pineconeClient) {
    pineconeClient = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY!,
    });
  }
  return pineconeClient;
}

function getPineconeIndex() {
  if (!pineconeIndex) {
    const config = functions.config();
    const client = getPineconeClient();
    pineconeIndex = client.index(config.pinecone.index);
  }
  return pineconeIndex;
}

export interface MessageVector {
  id: string;
  values: number[];
  metadata: {
    conversationId: string;
    text: string;
    senderId: string;
    senderName: string;
    participants: string[];
    createdAt: number;
  };
}

export async function upsertVectors(vectors: MessageVector[]): Promise<void> {
  const index = getPineconeIndex();
  await index.upsert(vectors);
}

export async function queryVectors(
  queryVector: number[],
  conversationId: string,
  topK: number = 10
) {
  const index = getPineconeIndex();
  return await index.query({
    vector: queryVector,
    filter: {conversationId},
    topK,
    includeMetadata: true,
  });
}

