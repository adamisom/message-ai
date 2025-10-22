/**
 * Unit tests for TypingIndicator component
 * Tests typing status display logic
 */

import { render } from '@testing-library/react-native';
import React from 'react';
import TypingIndicator from '../TypingIndicator';

describe('TypingIndicator', () => {
  describe('rendering', () => {
    it('should render nothing when no users are typing', () => {
      const { queryByText } = render(<TypingIndicator typingUsers={[]} />);
      
      expect(queryByText(/typing/i)).toBeNull();
    });

    it('should render single user typing', () => {
      const typingUsers = [
        { uid: 'user1', displayName: 'Alice', at: null },
      ];

      const { getByText } = render(<TypingIndicator typingUsers={typingUsers} />);
      
      expect(getByText('Alice is typing...')).toBeTruthy();
    });

    it('should render two users typing with "and"', () => {
      const typingUsers = [
        { uid: 'user1', displayName: 'Alice', at: null },
        { uid: 'user2', displayName: 'Bob', at: null },
      ];

      const { getByText } = render(<TypingIndicator typingUsers={typingUsers} />);
      
      expect(getByText('Alice and Bob are typing...')).toBeTruthy();
    });

    it('should render 3+ users typing with count', () => {
      const typingUsers = [
        { uid: 'user1', displayName: 'Alice', at: null },
        { uid: 'user2', displayName: 'Bob', at: null },
        { uid: 'user3', displayName: 'Charlie', at: null },
      ];

      const { getByText } = render(<TypingIndicator typingUsers={typingUsers} />);
      
      expect(getByText('3 people are typing...')).toBeTruthy();
    });

    it('should handle 5+ users typing', () => {
      const typingUsers = Array.from({ length: 5 }, (_, i) => ({
        uid: `user${i}`,
        displayName: `User ${i}`,
        at: null,
      }));

      const { getByText } = render(<TypingIndicator typingUsers={typingUsers} />);
      
      expect(getByText('5 people are typing...')).toBeTruthy();
    });
  });

  describe('edge cases', () => {
    it('should handle user with empty displayName', () => {
      const typingUsers = [
        { uid: 'user1', displayName: '', at: null },
      ];

      const { getByText } = render(<TypingIndicator typingUsers={typingUsers} />);
      
      // Should still render, even with empty name
      expect(getByText(' is typing...')).toBeTruthy();
    });

    it('should handle very long display names', () => {
      const longName = 'A'.repeat(100);
      const typingUsers = [
        { uid: 'user1', displayName: longName, at: null },
      ];

      const { getByText } = render(<TypingIndicator typingUsers={typingUsers} />);
      
      expect(getByText(`${longName} is typing...`)).toBeTruthy();
    });

    it('should handle special characters in display names', () => {
      const typingUsers = [
        { uid: 'user1', displayName: 'John O\'Brien', at: null },
      ];

      const { getByText } = render(<TypingIndicator typingUsers={typingUsers} />);
      
      expect(getByText('John O\'Brien is typing...')).toBeTruthy();
    });
  });

  describe('dynamic updates', () => {
    it('should update when users start typing', () => {
      const { rerender, queryByText, getByText } = render(
        <TypingIndicator typingUsers={[]} />
      );

      // Initially nothing
      expect(queryByText(/typing/i)).toBeNull();

      // User starts typing
      rerender(
        <TypingIndicator
          typingUsers={[{ uid: 'user1', displayName: 'Alice', at: null }]}
        />
      );

      expect(getByText('Alice is typing...')).toBeTruthy();
    });

    it('should update when users stop typing', () => {
      const { rerender, queryByText, getByText } = render(
        <TypingIndicator
          typingUsers={[{ uid: 'user1', displayName: 'Alice', at: null }]}
        />
      );

      // Initially showing
      expect(getByText('Alice is typing...')).toBeTruthy();

      // User stops typing
      rerender(<TypingIndicator typingUsers={[]} />);

      expect(queryByText(/typing/i)).toBeNull();
    });

    it('should update text when number of users changes', () => {
      const { rerender, getByText } = render(
        <TypingIndicator
          typingUsers={[{ uid: 'user1', displayName: 'Alice', at: null }]}
        />
      );

      expect(getByText('Alice is typing...')).toBeTruthy();

      // Add second user
      rerender(
        <TypingIndicator
          typingUsers={[
            { uid: 'user1', displayName: 'Alice', at: null },
            { uid: 'user2', displayName: 'Bob', at: null },
          ]}
        />
      );

      expect(getByText('Alice and Bob are typing...')).toBeTruthy();

      // Add third user
      rerender(
        <TypingIndicator
          typingUsers={[
            { uid: 'user1', displayName: 'Alice', at: null },
            { uid: 'user2', displayName: 'Bob', at: null },
            { uid: 'user3', displayName: 'Charlie', at: null },
          ]}
        />
      );

      expect(getByText('3 people are typing...')).toBeTruthy();
    });
  });
});

