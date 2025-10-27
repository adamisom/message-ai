/**
 * Register Screen
 * User registration with email, password, and display name
 */

import { Link, router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { registerUser } from '../../services/authService';
import { useAuthStore } from '../../store/authStore';
import {
  getDisplayNameError,
  getEmailError,
  getPasswordError,
  getPhoneNumberError,
} from '../../utils/validators';

export default function RegisterScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({
    email: '',
    password: '',
    displayName: '',
    phoneNumber: '',
    general: '',
  });

  const setUser = useAuthStore((state) => state.setUser);

  const handleRegister = async () => {
    // Clear previous errors
    setErrors({ email: '', password: '', displayName: '', phoneNumber: '', general: '' });

    // Validate inputs
    const emailError = getEmailError(email);
    const passwordError = getPasswordError(password);
    const displayNameError = getDisplayNameError(displayName);
    const phoneNumberError = getPhoneNumberError(phoneNumber);

    if (emailError || passwordError || displayNameError || phoneNumberError) {
      setErrors({
        email: emailError || '',
        password: passwordError || '',
        displayName: displayNameError || '',
        phoneNumber: phoneNumberError || '',
        general: '',
      });
      return;
    }

    setLoading(true);

    try {
      const userProfile = await registerUser(email, password, displayName, phoneNumber);
      await setUser(userProfile);
      
      // Navigate to main app (will be redirected by index.tsx)
      router.replace('/');
    } catch (error: any) {
      setErrors({
        email: '',
        password: '',
        displayName: '',
        phoneNumber: '',
        general: error.message || 'Registration failed. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Sign up to get started</Text>

          {errors.general ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{errors.general}</Text>
            </View>
          ) : null}

          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Display Name</Text>
              <TextInput
                style={[styles.input, errors.displayName ? styles.inputError : null]}
                placeholder="Enter your name"
                value={displayName}
                onChangeText={setDisplayName}
                autoCapitalize="words"
                editable={!loading}
              />
              {errors.displayName ? (
                <Text style={styles.inputErrorText}>{errors.displayName}</Text>
              ) : null}
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Phone Number</Text>
              <TextInput
                style={[styles.input, errors.phoneNumber ? styles.inputError : null]}
                placeholder="(123) 456-7890"
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                keyboardType="phone-pad"
                autoComplete="tel"
                editable={!loading}
              />
              {errors.phoneNumber ? (
                <Text style={styles.inputErrorText}>{errors.phoneNumber}</Text>
              ) : (
                <Text style={styles.helperText}>
                  Phone number is required because that's how friends find you
                </Text>
              )}
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={[styles.input, errors.email ? styles.inputError : null]}
                placeholder="Enter your email"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
                editable={!loading}
              />
              {errors.email ? (
                <Text style={styles.inputErrorText}>{errors.email}</Text>
              ) : null}
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={[styles.input, errors.password ? styles.inputError : null]}
                placeholder="Enter your password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
                autoComplete="password-new"
                editable={!loading}
              />
              {errors.password ? (
                <Text style={styles.inputErrorText}>{errors.password}</Text>
              ) : null}
            </View>

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleRegister}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Create Account</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <Link href="/(auth)/login" asChild>
              <TouchableOpacity disabled={loading}>
                <Text style={styles.link}>Sign In</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#000',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 32,
  },
  errorContainer: {
    backgroundColor: '#fee',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#f00',
  },
  errorText: {
    color: '#c00',
    fontSize: 14,
  },
  form: {
    width: '100%',
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#000',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  inputError: {
    borderColor: '#f00',
  },
  inputErrorText: {
    color: '#f00',
    fontSize: 12,
    marginTop: 4,
  },
  helperText: {
    color: '#666',
    fontSize: 12,
    marginTop: 4,
    fontStyle: 'italic',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  footerText: {
    color: '#666',
    fontSize: 14,
  },
  link: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
  },
});

