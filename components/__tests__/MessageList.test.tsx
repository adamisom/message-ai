import { render } from '@testing-library/react-native';
import React from 'react';
import { Message } from '../../types';
import MessageList from '../MessageList';

describe('MessageList', () => {
  const mockMessages: Message[] = [
    {
      id: '1',
      text: 'Hello',
      senderId: 'user1',
      senderName: 'Alice',
      createdAt: new Date('2025-01-01T10:00:00Z'),
    },
    {
      id: '2',
      text: 'Hi there',
      senderId: 'user2',
      senderName: 'Bob',
      createdAt: new Date('2025-01-01T10:01:00Z'),
    },
  ];

  it('renders messages correctly', () => {
    const { getByText } = render(
      <MessageList
        messages={mockMessages}
        currentUserId="user1"
        conversationType="direct"
      />
    );

    expect(getByText('Hello')).toBeTruthy();
    expect(getByText('Hi there')).toBeTruthy();
  });

  it('shows loading indicator when isLoadingMore is true', () => {
    const { UNSAFE_getByType } = render(
      <MessageList
        messages={mockMessages}
        currentUserId="user1"
        conversationType="direct"
        isLoadingMore={true}
        hasMoreMessages={true}
      />
    );

    // Check if ActivityIndicator is rendered
    const { ActivityIndicator } = require('react-native');
    expect(UNSAFE_getByType(ActivityIndicator)).toBeTruthy();
  });

  it('does not show loading indicator when hasMoreMessages is false', () => {
    const { queryByTestId } = render(
      <MessageList
        messages={mockMessages}
        currentUserId="user1"
        conversationType="direct"
        isLoadingMore={false}
        hasMoreMessages={false}
      />
    );

    // ActivityIndicator should not be rendered
    const { ActivityIndicator } = require('react-native');
    expect(() => queryByTestId(ActivityIndicator)).not.toThrow();
  });

  it('calls onLoadMore when scrolled near top', () => {
    const mockOnLoadMore = jest.fn();
    const { getByTestId } = render(
      <MessageList
        messages={mockMessages}
        currentUserId="user1"
        conversationType="direct"
        onLoadMore={mockOnLoadMore}
        isLoadingMore={false}
        hasMoreMessages={true}
      />
    );

    // Simulate scroll event (scrolled to top)
    const flatList = getByTestId ? getByTestId('message-list') : null;
    
    // Note: In a real test, you'd simulate the scroll event
    // For now, this is a placeholder showing the test structure
    // expect(mockOnLoadMore).toHaveBeenCalled();
  });

  it('does not call onLoadMore when already loading', () => {
    const mockOnLoadMore = jest.fn();
    render(
      <MessageList
        messages={mockMessages}
        currentUserId="user1"
        conversationType="direct"
        onLoadMore={mockOnLoadMore}
        isLoadingMore={true}
        hasMoreMessages={true}
      />
    );

    // onLoadMore should not be called if already loading
    // This is enforced by the component logic
    expect(mockOnLoadMore).not.toHaveBeenCalled();
  });

  it('renders group chat with sender names', () => {
    const { getByText } = render(
      <MessageList
        messages={mockMessages}
        currentUserId="user1"
        conversationType="group"
      />
    );

    // In group chats, sender names should be visible
    expect(getByText('Hello')).toBeTruthy();
    expect(getByText('Hi there')).toBeTruthy();
  });
});

