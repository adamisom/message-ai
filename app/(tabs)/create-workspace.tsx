/**
 * Phase 4: Create Workspace Screen
 * Allows Pro users to create new workspaces
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../firebase.config';
import { authStore } from '../../store/authStore';
import { Colors } from '../../utils/colors';

export default function CreateWorkspaceScreen() {
  const router = useRouter();
  const user = authStore((state) => state.user);

  const [workspaceName, setWorkspaceName] = useState('');
  const [maxUsers, setMaxUsers] = useState('5');
  const [isCreating, setIsCreating] = useState(false);

  // Capacity presets
  const capacityOptions = [
    { value: 2, label: '2 users', price: '$1.00/mo' },
    { value: 5, label: '5 users', price: '$2.50/mo' },
    { value: 10, label: '10 users', price: '$5.00/mo' },
    { value: 15, label: '15 users', price: '$7.50/mo' },
    { value: 20, label: '20 users', price: '$10.00/mo' },
    { value: 25, label: '25 users', price: '$12.50/mo' },
  ];

  const handleCreate = async () => {
    // Validation
    if (!workspaceName.trim()) {
      Alert.alert('Error', 'Please enter a workspace name');
      return;
    }

    if (!maxUsers || parseInt(maxUsers) < 2 || parseInt(maxUsers) > 25) {
      Alert.alert('Error', 'Capacity must be between 2 and 25 users');
      return;
    }

    setIsCreating(true);

    try {
      const createWorkspace = httpsCallable(functions, 'createWorkspace');
      const result = await createWorkspace({
        name: workspaceName.trim(),
        maxUsers: parseInt(maxUsers),
        initialMemberEmails: [], // Could add email input later
      });

      Alert.alert(
        'Success!',
        `Workspace "${workspaceName}" created successfully!`,
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error: any) {
      console.error('Create workspace error:', error);
      
      // Parse error message
      let errorMessage = 'Failed to create workspace';
      if (error.message.includes('Pro subscription required')) {
        errorMessage = 'Pro subscription required to create workspaces';
      } else if (error.message.includes('Workspace limit reached')) {
        errorMessage = 'You\'ve reached the 5 workspace limit';
      } else if (error.message.includes('already have a workspace')) {
        errorMessage = 'You already have a workspace with that name';
      } else if (error.message.includes('spam')) {
        errorMessage = 'Account restricted from creating workspaces';
      }

      Alert.alert('Error', errorMessage);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={Colors.textDark} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create Workspace</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Pro Badge */}
        <View style={styles.proBadge}>
          <Ionicons name="star" size={16} color="#FFD700" />
          <Text style={styles.proBadgeText}>Pro Feature</Text>
        </View>

        {/* Info Box */}
        <View style={styles.infoBox}>
          <Ionicons name="information-circle" size={20} color={Colors.primary} />
          <Text style={styles.infoText}>
            Workspaces help teams collaborate with shared chats and AI features
          </Text>
        </View>

        {/* Workspace Name */}
        <View style={styles.section}>
          <Text style={styles.label}>Workspace Name *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Marketing Team"
            value={workspaceName}
            onChangeText={setWorkspaceName}
            maxLength={50}
            autoCapitalize="words"
          />
          <Text style={styles.helperText}>
            Choose a unique name (case-insensitive)
          </Text>
        </View>

        {/* Capacity Selection */}
        <View style={styles.section}>
          <Text style={styles.label}>Member Capacity *</Text>
          <Text style={styles.helperText}>
            Select how many team members you need ($0.50 per user/month)
          </Text>
          
          <View style={styles.capacityGrid}>
            {capacityOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.capacityOption,
                  parseInt(maxUsers) === option.value && styles.capacityOptionSelected,
                ]}
                onPress={() => setMaxUsers(option.value.toString())}
              >
                <Text
                  style={[
                    styles.capacityLabel,
                    parseInt(maxUsers) === option.value && styles.capacityLabelSelected,
                  ]}
                >
                  {option.label}
                </Text>
                <Text
                  style={[
                    styles.capacityPrice,
                    parseInt(maxUsers) === option.value && styles.capacityPriceSelected,
                  ]}
                >
                  {option.price}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Summary */}
        <View style={styles.summaryBox}>
          <Text style={styles.summaryTitle}>Billing Summary</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Capacity:</Text>
            <Text style={styles.summaryValue}>{maxUsers} users</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Monthly charge:</Text>
            <Text style={styles.summaryValue}>
              ${(parseInt(maxUsers || '0') * 0.5).toFixed(2)}/month
            </Text>
          </View>
          <Text style={styles.summaryNote}>
            You can expand or downgrade capacity anytime
          </Text>
        </View>

        {/* Create Button */}
        <TouchableOpacity
          style={[styles.createButton, isCreating && styles.createButtonDisabled]}
          onPress={handleCreate}
          disabled={isCreating}
        >
          {isCreating ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <Ionicons name="add-circle" size={20} color="#FFF" />
              <Text style={styles.createButtonText}>Create Workspace</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Limits Info */}
        <View style={styles.limitsBox}>
          <Text style={styles.limitsText}>• Maximum 5 workspaces per Pro user</Text>
          <Text style={styles.limitsText}>• Maximum 25 members per workspace</Text>
          <Text style={styles.limitsText}>• Instant billing, pro-rated</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.textDark,
  },
  headerSpacer: {
    width: 40,
  },
  proBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#FFF9E6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 16,
  },
  proBadgeText: {
    marginLeft: 4,
    fontSize: 12,
    fontWeight: '600',
    color: '#F59E0B',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#E3F2FD',
    padding: 12,
    borderRadius: 8,
    marginBottom: 24,
  },
  infoText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: Colors.primary,
    lineHeight: 20,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textDark,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#FFF',
  },
  helperText: {
    fontSize: 13,
    color: Colors.textMedium,
    marginTop: 4,
  },
  capacityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    gap: 8,
  },
  capacityOption: {
    width: '48%',
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderColor: Colors.borderLight,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  capacityOptionSelected: {
    borderColor: Colors.primary,
    backgroundColor: '#E3F2FD',
  },
  capacityLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textDark,
    marginBottom: 4,
  },
  capacityLabelSelected: {
    color: Colors.primary,
  },
  capacityPrice: {
    fontSize: 12,
    color: Colors.textMedium,
  },
  capacityPriceSelected: {
    color: Colors.primary,
  },
  summaryBox: {
    backgroundColor: '#F8F8F8',
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textDark,
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: Colors.textMedium,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textDark,
  },
  summaryNote: {
    fontSize: 12,
    color: Colors.textMedium,
    marginTop: 8,
    fontStyle: 'italic',
  },
  createButton: {
    flexDirection: 'row',
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  createButtonDisabled: {
    opacity: 0.6,
  },
  createButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  limitsBox: {
    padding: 16,
  },
  limitsText: {
    fontSize: 13,
    color: Colors.textMedium,
    marginBottom: 4,
  },
});

