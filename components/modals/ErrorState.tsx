import { ReactElement } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { commonModalStyles } from '../../styles/commonModalStyles';

interface ErrorStateProps {
  message: string;
  onRetry: () => void;
}

/**
 * Reusable error state with retry button for modals
 */
export function ErrorState({ message, onRetry }: ErrorStateProps): ReactElement {
  return (
    <View style={commonModalStyles.errorContainer}>
      <Text style={commonModalStyles.errorText}>{message}</Text>
      <TouchableOpacity onPress={onRetry} style={commonModalStyles.retryButton}>
        <Text style={commonModalStyles.retryButtonText}>Try Again</Text>
      </TouchableOpacity>
    </View>
  );
}

