import { ReactElement } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { commonModalStyles } from '../../styles/commonModalStyles';
import { UserFriendlyError } from '../../utils/errorTranslator';

interface ErrorStateProps {
  message?: string;
  error?: UserFriendlyError | null;
  onRetry: () => void;
}

/**
 * Reusable error state with retry button for modals
 * Supports both legacy string errors and new UserFriendlyError type
 */
export function ErrorState({ message, error, onRetry }: ErrorStateProps): ReactElement {
  const displayTitle = error?.title || 'Error';
  const displayMessage = error?.message || message || 'Something went wrong';
  const actionText = error?.action || 'Try Again';

  return (
    <View style={commonModalStyles.errorContainer}>
      {error?.title && (
        <Text style={commonModalStyles.errorTitle}>{displayTitle}</Text>
      )}
      <Text style={commonModalStyles.errorText}>{displayMessage}</Text>
      <TouchableOpacity onPress={onRetry} style={commonModalStyles.retryButton}>
        <Text style={commonModalStyles.retryButtonText}>{actionText}</Text>
      </TouchableOpacity>
    </View>
  );
}

