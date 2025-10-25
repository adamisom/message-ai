import { ReactElement } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { commonModalStyles } from '../../styles/commonModalStyles';
import { Colors } from '../../utils/colors';

interface LoadingStateProps {
  message: string;
  submessage?: string;
}

/**
 * Reusable loading state for modals
 */
export function LoadingState({ message, submessage }: LoadingStateProps): ReactElement {
  return (
    <View style={commonModalStyles.loadingContainer}>
      <ActivityIndicator size="large" color={Colors.primary} />
      <Text style={commonModalStyles.loadingText}>{message}</Text>
      {submessage && (
        <Text style={commonModalStyles.loadingSubtext}>{submessage}</Text>
      )}
    </View>
  );
}

