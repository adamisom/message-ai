// Test setup file
// This runs before all tests to set up mocks and environment

// Set environment variables for tests
process.env.OPENAI_API_KEY = 'test-openai-key';
process.env.PINECONE_API_KEY = 'test-pinecone-key';
process.env.PINECONE_ENVIRONMENT = 'test-env';
process.env.PINECONE_INDEX_NAME = 'test-index';

// Mock Firebase Admin globally
jest.mock('firebase-admin', () => {
  const mockFirestore: any = {
    collection: jest.fn(function(this: any) { return this; }),
    doc: jest.fn(function(this: any) { return this; }),
    get: jest.fn(),
    set: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    where: jest.fn(function(this: any) { return this; }),
    orderBy: jest.fn(function(this: any) { return this; }),
    limit: jest.fn(function(this: any) { return this; }),
    onSnapshot: jest.fn(),
  };

  return {
    initializeApp: jest.fn(),
    credential: {
      cert: jest.fn(),
      applicationDefault: jest.fn(),
    },
    firestore: jest.fn(() => mockFirestore),
    auth: jest.fn(),
    storage: jest.fn(),
    FieldValue: {
      serverTimestamp: jest.fn(() => 'MOCK_TIMESTAMP'),
      increment: jest.fn((n) => `MOCK_INCREMENT_${n}`),
      arrayUnion: jest.fn(),
      arrayRemove: jest.fn(),
    },
    Timestamp: {
      now: jest.fn(() => ({ seconds: 1234567890, nanoseconds: 0 })),
      fromDate: jest.fn((date) => ({
        seconds: Math.floor(date.getTime() / 1000),
        nanoseconds: 0,
      })),
    },
  };
});

// Mock firebase-functions
jest.mock('firebase-functions', () => ({
  config: jest.fn(() => ({})),
  https: {
    onCall: jest.fn((handler) => handler),
    onRequest: jest.fn((handler) => handler),
    HttpsError: class HttpsError extends Error {
      constructor(public code: string, message: string) {
        super(message);
        this.name = 'HttpsError';
      }
    },
  },
  firestore: {
    document: jest.fn(() => ({
      onCreate: jest.fn(),
      onUpdate: jest.fn(),
      onDelete: jest.fn(),
    })),
  },
  pubsub: {
    schedule: jest.fn(() => ({
      onRun: jest.fn(),
    })),
  },
  runWith: jest.fn(() => ({
    https: {
      onCall: jest.fn((handler) => handler),
    },
    firestore: {
      document: jest.fn(() => ({
        onCreate: jest.fn(),
      })),
    },
    pubsub: {
      schedule: jest.fn(() => ({
        onRun: jest.fn(),
      })),
    },
  })),
}));

// Increase test timeout for integration tests
jest.setTimeout(10000);

