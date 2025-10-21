/**
 * Register Screen
 * User registration with email, password, and display name
 */

import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Link, router } from 'expo-router';
import { registerUser } from '../../services/authService';
import { useAuthStore } from '../../store/authStore';
import {
  getEmailError,
  getPasswordError,
  getDisplayNameError,
} from '../../utils/validators';

export default function RegisterScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({
    email: '',
    password: '',
    displayName: '',
    general: '',
  });

  const setUser = useAuthStore((state) => state.setUser);

  const handleRegister = async () => {
    console.log('=== REGISTER START ===');
    console.log('Email:', email);
    console.log('Display Name:', displayName);
    
    // Clear previous errors
    setErrors({ email: '', password: '', displayName: '', general: '' });

    // Validate inputs
    const emailError = getEmailError(email);
    const passwordError = getPasswordError(password);
    const displayNameError = getDisplayNameError(displayName);

    console.log('Validation errors:', { emailError, passwordError, displayNameError });

    if (emailError || passwordError || displayNameError) {
      console.log('Validation failed, stopping');
      setErrors({
        email: emailError || '',
        password: passwordError || '',
        displayName: displayNameError || '',
        general: '',
      });
      return;
    }

    console.log('Starting registration...');
    setLoading(true);

    try {
      console.log('Calling registerUser...');
      const userProfile = await registerUser(email, password, displayName);
      console.log('Registration successful:', userProfile);
      
      console.log('Saving user to store...');
      await setUser(userProfile);
      console.log('User saved');
      
      // Navigate to main app (will be redirected by index.tsx)
      console.log('Navigating to /');
      router.replace('/');
    } catch (error: any) {
      console.error('Registration error:', error);
      console.error('Error message:', error.message);
      console.error('Error code:', error.code);
      setErrors({
        email: '',
        password: '',
        displayName: '',
        general: error.message || 'Registration failed. Please try again.',
      });
    } finally {
      console.log('Setting loading false');
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

