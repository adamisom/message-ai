import {resolveAssignee} from '../actionItems';

describe('resolveAssignee', () => {
  beforeEach(() => {
    // Suppress console.warn in tests since we're testing error cases
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });
  const participantDetails = {
    uid1: {
      displayName: 'Alice Johnson',
      email: 'alice@example.com',
    },
    uid2: {
      displayName: 'Bob Smith',
      email: 'bob@example.com',
    },
    uid3: {
      displayName: 'Charlie Davis',
      email: 'charlie@example.com',
    },
    uid4: {
      displayName: 'Alice Johnson', // Duplicate name
      email: 'alice.j@other.com',
    },
  };

  describe('Email matching', () => {
    it('should match email case-insensitively', async () => {
      const result = await resolveAssignee(
        'ALICE@EXAMPLE.COM',
        participantDetails
      );

      expect(result).toEqual({
        uid: 'uid1',
        displayName: 'Alice Johnson',
        email: 'alice@example.com',
      });
    });

    it('should return null for non-existent email', async () => {
      const result = await resolveAssignee(
        'unknown@example.com',
        participantDetails
      );

      expect(result).toBeNull();
    });
  });

  describe('Display name matching', () => {
    it('should match display name case-insensitively', async () => {
      const result = await resolveAssignee('bob smith', participantDetails);

      expect(result).toEqual({
        uid: 'uid2',
        displayName: 'Bob Smith',
        email: 'bob@example.com',
      });
    });

    it('should return null for ambiguous display name (multiple matches)', async () => {
      const result = await resolveAssignee(
        'Alice Johnson',
        participantDetails
      );

      expect(result).toBeNull();
    });

    it('should return null for non-existent display name', async () => {
      const result = await resolveAssignee('Unknown Person', participantDetails);

      expect(result).toBeNull();
    });
  });

  describe('Edge cases', () => {
    it('should return null for null identifier', async () => {
      const result = await resolveAssignee(null, participantDetails);

      expect(result).toBeNull();
    });

    it('should return null for undefined participantDetails', async () => {
      const result = await resolveAssignee('alice@example.com', undefined);

      expect(result).toBeNull();
    });

    it('should return null for null participantDetails', async () => {
      const result = await resolveAssignee('alice@example.com', null);

      expect(result).toBeNull();
    });

    it('should handle missing email field gracefully', async () => {
      const detailsWithMissingEmail = {
        uid1: {
          displayName: 'Alice Johnson',
          // email missing
        },
      };

      const result = await resolveAssignee(
        'alice@example.com',
        detailsWithMissingEmail
      );

      expect(result).toBeNull();
    });

    it('should handle missing displayName field gracefully', async () => {
      const detailsWithMissingName = {
        uid1: {
          // displayName missing
          email: 'alice@example.com',
        },
      };

      const result = await resolveAssignee(
        'Alice',
        detailsWithMissingName
      );

      expect(result).toBeNull();
    });

    it('should return email from matched user even if email field is missing (fallback to empty string)', async () => {
      const detailsWithMissingEmailOnMatch = {
        uid1: {
          displayName: 'Alice Johnson',
          // email missing
        },
      };

      const result = await resolveAssignee(
        'Alice Johnson',
        detailsWithMissingEmailOnMatch
      );

      expect(result).toEqual({
        uid: 'uid1',
        displayName: 'Alice Johnson',
        email: '',
      });
    });
  });
});

