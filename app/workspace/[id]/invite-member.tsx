/**
 * Phase 4: Workspace Invite Member Screen
 * Admin can invite members to workspace by phone number
 */

import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Button,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { extractDigits, formatPhoneNumber } from '../../(tabs)/new-chat-helpers';
import { callCloudFunction } from '../../../services/cloudFunctions';
import { findUserByPhoneNumber } from '../../../services/firestoreService';
import { useAuthStore } from '../../../store/authStore';
import { Alerts } from '../../../utils/alerts';
import { Colors } from '../../../utils/colors';
import { validatePhoneNumber } from '../../../utils/validators';

export default function InviteMemberScreen() {
  const router = useRouter();
  const { id: workspaceId } = useLocalSearchParams<{ id: string }>();
  const user = useAuthStore((state: any) => state.user);

  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleInviteMember = async () => {
    if (!workspaceId) {
      Alerts.error('Workspace not found');
      return;
    }

    setError('');
    setLoading(true);

    try {
      // Extract raw digits for validation
      const rawDigits = extractDigits(phoneNumber);

      // Validate phone number format
      if (!validatePhoneNumber(rawDigits)) {
        setError('Invalid phone number (must be 10 digits, US/Canada only)');
        return;
      }

      // Find user by phone number
      const foundUser = await findUserByPhoneNumber(rawDigits);

      if (!foundUser) {
        setError('No user found with that phone number');
        return;
      }

      // Check if it's the current user
      if (foundUser.uid === user?.uid) {
        setError("You can't invite yourself");
        return;
      }

      // Call Cloud Function to send workspace invitation
      await callCloudFunction('inviteWorkspaceMember', {
        workspaceId,
        invitedUserUid: foundUser.uid,
      });

      Alerts.success(
        `Invitation sent to ${foundUser.displayName}! They can accept it from their profile.`,
        () => router.back()
      );
    } catch (err: any) {
      console.error('Error inviting member:', err);
      setError(err.message || 'Failed to send invitation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.textDark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Invite Member</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Info Card */}
      <View style={styles.infoCard}>
        <View style={styles.iconCircle}>
          <Ionicons name="person-add" size={32} color={Colors.primary} />
        </View>
        <Text style={styles.infoTitle}>Invite a team member</Text>
        <Text style={styles.infoText}>
          Enter their phone number to send them a workspace invitation.
        </Text>
      </View>

      {/* Phone Input */}
      <View style={styles.inputSection}>
        <Text style={styles.inputLabel}>Phone Number</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter phone number"
          value={phoneNumber}
          onChangeText={(text) => setPhoneNumber(formatPhoneNumber(text))}
          keyboardType="phone-pad"
          editable={!loading}
          returnKeyType="done"
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>

      {/* Send Button */}
      <TouchableOpacity
        style={[styles.sendButton, (!phoneNumber.trim() || loading) && styles.sendButtonDisabled]}
        onPress={handleInviteMember}
        disabled={!phoneNumber.trim() || loading}
      >
        {loading ? (
          <ActivityIndicator color="#FFF" />
        ) : (
          <>
            <Ionicons name="send" size={20} color="#FFF" />
            <Text style={styles.sendButtonText}>Send Invitation</Text>
          </>
        )}
      </TouchableOpacity>

      {/* Help Text */}
      <View style={styles.helpSection}>
        <Text style={styles.helpTitle}>💡 Note</Text>
        <Text style={styles.helpText}>
          • The recipient will receive an in-app notification
        </Text>
        <Text style={styles.helpText}>
          • They can accept or decline from their profile
        </Text>
        <Text style={styles.helpText}>
          • They'll gain access to all workspace chats once they accept
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: 16,
    paddingTop: 60,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
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
  infoCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#E3F2FD',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  infoTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.textDark,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: Colors.textMedium,
    textAlign: 'center',
    lineHeight: 20,
  },
  inputSection: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textDark,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: Colors.textDark,
  },
  error: {
    color: '#DC2626',
    fontSize: 14,
    marginTop: 8,
  },
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    gap: 8,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  helpSection: {
    backgroundColor: '#F8F9FA',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
  },
  helpTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textDark,
    marginBottom: 8,
  },
  helpText: {
    fontSize: 13,
    color: Colors.textMedium,
    marginBottom: 4,
    lineHeight: 18,
  },
});

