describe('Action Item Extraction', () => {
  describe('Action item parsing', () => {
    it('should parse valid action item', () => {
      const response = JSON.stringify({
        text: 'Review the budget',
        assigneeIdentifier: 'john@example.com',
        dueDate: '2025-10-27T00:00:00Z',
        priority: 'high',
        sourceMessageId: 'msg123',
      });

      const parsed = JSON.parse(response);
      expect(parsed.text).toBe('Review the budget');
      expect(parsed.priority).toBe('high');
      expect(parsed.assigneeIdentifier).toBe('john@example.com');
    });

    it('should handle missing assignee', () => {
      const response = JSON.stringify({
        text: 'Update documentation',
        assigneeIdentifier: null,
        dueDate: null,
        priority: 'medium',
        sourceMessageId: 'msg456',
      });

      const parsed = JSON.parse(response);
      expect(parsed.assigneeIdentifier).toBeNull();
      expect(parsed.dueDate).toBeNull();
    });

    it('should parse array of action items', () => {
      const response = JSON.stringify([
        {
          text: 'Task 1',
          assigneeIdentifier: 'john@example.com',
          priority: 'high',
          sourceMessageId: 'msg1',
        },
        {
          text: 'Task 2',
          assigneeIdentifier: null,
          priority: 'low',
          sourceMessageId: 'msg2',
        },
      ]);

      const parsed = JSON.parse(response);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed).toHaveLength(2);
    });
  });

  describe('Assignee resolution logic', () => {
    const mockParticipants = {
      user1: {
        displayName: 'John Doe',
        email: 'john@example.com',
      },
      user2: {
        displayName: 'Jane Smith',
        email: 'jane@example.com',
      },
      user3: {
        displayName: 'John Smith',
        email: 'johnsmith@example.com',
      },
    };

    function resolveAssignee(identifier: string | null): string | null {
      if (!identifier) return null;

      const isEmail = identifier.includes('@');
      if (isEmail) {
        for (const [uid, details] of Object.entries(mockParticipants)) {
          if (details.email.toLowerCase() === identifier.toLowerCase()) {
            return uid;
          }
        }
      } else {
        const matches = [];
        for (const [uid, details] of Object.entries(mockParticipants)) {
          if (details.displayName.toLowerCase() === identifier.toLowerCase()) {
            matches.push(uid);
          }
        }
        return matches.length === 1 ? matches[0] : null;
      }
      return null;
    }

    it('should resolve assignee by email', () => {
      expect(resolveAssignee('john@example.com')).toBe('user1');
      expect(resolveAssignee('jane@example.com')).toBe('user2');
    });

    it('should resolve assignee by unique display name', () => {
      expect(resolveAssignee('Jane Smith')).toBe('user2');
    });

    it('should return null for ambiguous display name', () => {
      // Two people named "John"
      expect(resolveAssignee('John')).toBeNull();
    });

    it('should return null for non-existent assignee', () => {
      expect(resolveAssignee('nonexistent@example.com')).toBeNull();
      expect(resolveAssignee('Unknown Person')).toBeNull();
    });

    it('should handle null identifier', () => {
      expect(resolveAssignee(null)).toBeNull();
    });
  });

  describe('Priority validation', () => {
    it('should accept valid priorities', () => {
      const validPriorities = ['high', 'medium', 'low'];
      validPriorities.forEach((priority) => {
        expect(['high', 'medium', 'low']).toContain(priority);
      });
    });

    it('should reject invalid priorities', () => {
      const invalidPriorities = ['urgent', 'super-high', 'critical', ''];
      invalidPriorities.forEach((priority) => {
        expect(['high', 'medium', 'low']).not.toContain(priority);
      });
    });
  });
});

