import { ReactElement } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { commonModalStyles } from '../../styles/commonModalStyles';

interface ModalHeaderProps {
  title: string;
  onClose: () => void;
}

/**
 * Reusable modal header with title and close button
 */
export function ModalHeader({ title, onClose }: ModalHeaderProps): ReactElement {
  return (
    <View style={commonModalStyles.header}>
      <Text style={commonModalStyles.headerTitle}>{title}</Text>
      <TouchableOpacity onPress={onClose} style={commonModalStyles.closeButton}>
        <Text style={commonModalStyles.closeButtonText}>✕</Text>
      </TouchableOpacity>
    </View>
  );
}

