/**
 * Tests for auth middleware utilities
 */

import * as functions from 'firebase-functions';
import {
  requireAuth,
  requireUser,
  requireProUser,
  requireWorkspaceAdmin,
  requireWorkspaceMember,
} from '../authMiddleware';

// Create a global mock data store that can be accessed from jest.mock
const globalMockFirestoreData = new Map<string, any>();

// Mock firebase-admin at module level
jest.mock('firebase-admin', () => ({
  firestore: () => ({
    collection: (name: string) => ({
      doc: (id: string) => ({
        get: async () => {
          const key = `${name}/${id}`;
          const data = globalMockFirestoreData.get(key);
          return {
            exists: !!data,
            data: () => data,
          };
        },
      }),
    }),
  }),
}));

// Helper to set mock data
function setMockData(collection: string, docId: string, data: any) {
  globalMockFirestoreData.set(`${collection}/${docId}`, data);
}

function clearMockData() {
  globalMockFirestoreData.clear();
}

describe('authMiddleware', () => {
  beforeEach(() => {
    clearMockData();
  });

  describe('requireAuth', () => {
    it('should return uid when user is authenticated', () => {
      const context = { auth: { uid: 'user123' } } as functions.https.CallableContext;
      const uid = requireAuth(context);
      expect(uid).toBe('user123');
    });

    it('should throw unauthenticated error when user is not authenticated', () => {
      const context = {} as functions.https.CallableContext;
      expect(() => requireAuth(context)).toThrow('Must be authenticated');
    });
  });

  describe('requireUser', () => {
    it('should return uid and user data when user exists', async () => {
      const context = { auth: { uid: 'user123' } } as functions.https.CallableContext;
      const userData = { email: 'test@example.com', displayName: 'Test User' };
      
      setMockData('users', 'user123', userData);

      const result = await requireUser(context);
      
      expect(result.uid).toBe('user123');
      expect(result.user).toEqual(userData);
    });

    it('should throw not-found error when user document does not exist', async () => {
      const context = { auth: { uid: 'user123' } } as functions.https.CallableContext;
      
      // Don't set any mock data - document won't exist

      await expect(requireUser(context)).rejects.toThrow('User not found');
    });

    it('should throw unauthenticated error when not authenticated', async () => {
      const context = {} as functions.https.CallableContext;
      
      await expect(requireUser(context)).rejects.toThrow('Must be authenticated');
    });
  });

  describe('requireProUser', () => {
    it('should return user data when user is paid', async () => {
      const context = { auth: { uid: 'user123' } } as functions.https.CallableContext;
      const userData = { email: 'test@example.com', isPaidUser: true };
      
      setMockData('users', 'user123', userData);

      const result = await requireProUser(context);
      
      expect(result.uid).toBe('user123');
      expect(result.user).toEqual(userData);
    });

    it('should return user data when user is in trial', async () => {
      const context = { auth: { uid: 'user123' } } as functions.https.CallableContext;
      const futureDate = Date.now() + 100000;
      const userData = { 
        email: 'test@example.com', 
        isPaidUser: false,
        trialEndsAt: futureDate,
      };
      
      setMockData('users', 'user123', userData);

      const result = await requireProUser(context);
      
      expect(result.uid).toBe('user123');
      expect(result.user).toEqual(userData);
    });

    it('should throw permission-denied when user is not Pro', async () => {
      const context = { auth: { uid: 'user123' } } as functions.https.CallableContext;
      const userData = { email: 'test@example.com', isPaidUser: false };
      
      setMockData('users', 'user123', userData);

      await expect(requireProUser(context)).rejects.toThrow('Pro subscription');
    });
  });

  describe('requireWorkspaceAdmin', () => {
    it('should return workspace data when user is admin', async () => {
      const context = { auth: { uid: 'user123' } } as functions.https.CallableContext;
      const userData = { email: 'test@example.com' };
      const workspaceData = { createdBy: 'user123', name: 'Test Workspace' };
      
      setMockData('users', 'user123', userData);
      setMockData('workspaces', 'workspace123', workspaceData);

      const result = await requireWorkspaceAdmin(context, 'workspace123');
      
      expect(result.uid).toBe('user123');
      expect(result.workspace).toEqual(workspaceData);
    });

    it('should throw permission-denied when user is not admin', async () => {
      const context = { auth: { uid: 'user123' } } as functions.https.CallableContext;
      const userData = { email: 'test@example.com' };
      const workspaceData = { createdBy: 'otherUser', name: 'Test Workspace' };
      
      setMockData('users', 'user123', userData);
      setMockData('workspaces', 'workspace123', workspaceData);

      await expect(requireWorkspaceAdmin(context, 'workspace123')).rejects.toThrow('workspace admins');
    });

    it('should throw not-found when workspace does not exist', async () => {
      const context = { auth: { uid: 'user123' } } as functions.https.CallableContext;
      const userData = { email: 'test@example.com' };
      
      setMockData('users', 'user123', userData);
      // Don't set workspace data

      await expect(requireWorkspaceAdmin(context, 'workspace123')).rejects.toThrow('Workspace not found');
    });
  });

  describe('requireWorkspaceMember', () => {
    it('should return workspace data when user is member', async () => {
      const context = { auth: { uid: 'user123' } } as functions.https.CallableContext;
      const userData = { email: 'test@example.com' };
      const workspaceData = { 
        createdBy: 'admin',
        members: ['admin', 'user123', 'user456'],
        name: 'Test Workspace',
      };
      
      setMockData('users', 'user123', userData);
      setMockData('workspaces', 'workspace123', workspaceData);

      const result = await requireWorkspaceMember(context, 'workspace123');
      
      expect(result.uid).toBe('user123');
      expect(result.workspace).toEqual(workspaceData);
    });

    it('should throw permission-denied when user is not a member', async () => {
      const context = { auth: { uid: 'user123' } } as functions.https.CallableContext;
      const userData = { email: 'test@example.com' };
      const workspaceData = { 
        createdBy: 'admin',
        members: ['admin', 'user456'],
        name: 'Test Workspace',
      };
      
      setMockData('users', 'user123', userData);
      setMockData('workspaces', 'workspace123', workspaceData);

      await expect(requireWorkspaceMember(context, 'workspace123')).rejects.toThrow('must be a member');
    });
  });
});

