import { useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { searchMessages } from '../services/aiService';
import { commonModalStyles } from '../styles/commonModalStyles';
import type { SearchResult } from '../types';
import { Colors } from '../utils/colors';
import { formatDate } from '../utils/dateFormat';
import { EmptyState } from './modals/EmptyState';
import { LoadingState } from './modals/LoadingState';
import { ModalHeader } from './modals/ModalHeader';

interface SearchModalProps {
  visible: boolean;
  conversationId: string;
  onClose: () => void;
  onSelectMessage: (messageId: string) => void;
}

export function SearchModal({
  visible,
  conversationId,
  onClose,
  onSelectMessage,
}: SearchModalProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async () => {
    if (!query.trim()) {
      setError('Please enter a search query');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await searchMessages(query, conversationId) as any;
      setResults(response.results || []);
      if (response.results.length === 0) {
        setError('No messages found');
      }
    } catch (err: any) {
      console.error('Search error:', err);
      setError(err.message || 'Search failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setQuery('');
    setResults([]);
    setError('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={commonModalStyles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ModalHeader title="Search Messages" onClose={handleClose} />

        {/* Search Input */}
        <View style={styles.searchContainer}>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search for messages..."
            onSubmitEditing={handleSearch}
            autoFocus
            style={styles.searchInput}
            returnKeyType="search"
          />
          <TouchableOpacity
            onPress={handleSearch}
            style={styles.searchButton}
            disabled={loading}
          >
            <Text style={styles.searchButtonText}>
              {loading ? '...' : '🔍'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Loading State */}
        {loading && <LoadingState message="Searching..." />}

        {/* Error State */}
        {error && !loading && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>{error}</Text>
          </View>
        )}

        {/* Results List */}
        {!loading && results.length > 0 && (
          <FlatList
            data={results}
            keyExtractor={(item) => item.id}
            renderItem={({item}) => (
              <TouchableOpacity
                onPress={() => {
                  onSelectMessage(item.id);
                  handleClose();
                }}
                style={styles.resultItem}
              >
                <View style={styles.resultHeader}>
                  <Text style={styles.senderName}>{item.senderName}</Text>
                  <Text style={styles.resultDate}>
                    {formatDate(item.createdAt)}
                  </Text>
                </View>
                <Text style={styles.messageText} numberOfLines={2}>
                  {item.text}
                </Text>
                <View style={styles.resultFooter}>
                  <Text style={styles.sourceIndicator}>
                    {item.source === 'local' ? '📍 Recent' : '🔍 Search'}
                  </Text>
                  {item.score && (
                    <Text style={styles.scoreText}>
                      {Math.round(item.score * 100)}% match
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            )}
            contentContainerStyle={styles.resultsList}
          />
        )}

        {/* Empty State */}
        {!loading && !error && results.length === 0 && query.length === 0 && (
          <EmptyState
            icon="🔍"
            message="Search for messages in this conversation"
            submessage="Try searching for keywords, topics, or names"
          />
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  searchContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
  },
  searchButton: {
    width: 44,
    height: 44,
    backgroundColor: Colors.primary,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchButtonText: {
    fontSize: 20,
  },
  errorBanner: {
    padding: 16,
    backgroundColor: Colors.errorBackground,
    marginHorizontal: 16,
    borderRadius: 8,
  },
  errorBannerText: {
    color: Colors.error,
    fontSize: 14,
  },
  resultsList: {
    paddingHorizontal: 16,
  },
  resultItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  senderName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textDark,
  },
  resultDate: {
    fontSize: 12,
    color: Colors.textLight,
  },
  messageText: {
    fontSize: 14,
    color: Colors.textMedium,
    marginBottom: 4,
  },
  resultFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sourceIndicator: {
    fontSize: 12,
    color: Colors.textLight,
  },
  scoreText: {
    fontSize: 12,
    color: Colors.primary,
  },
});
