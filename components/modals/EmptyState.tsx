import { ReactElement } from 'react';
import { Text, View } from 'react-native';
import { commonModalStyles } from '../../styles/commonModalStyles';

interface EmptyStateProps {
  icon: string;
  message: string;
  submessage?: string;
}

/**
 * Reusable empty state for modals
 */
export function EmptyState({ icon, message, submessage }: EmptyStateProps): ReactElement {
  return (
    <View style={commonModalStyles.emptyContainer}>
      <Text style={commonModalStyles.emptyIcon}>{icon}</Text>
      <Text style={commonModalStyles.emptyText}>{message}</Text>
      {submessage && (
        <Text style={commonModalStyles.emptySubtext}>{submessage}</Text>
      )}
    </View>
  );
}

