import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { TYPING_CLEAR_DELAY_MS } from '../utils/constants';

interface MessageInputProps {
  onSend: (text: string) => void;
  onTyping: () => void;
  onStopTyping: () => void;
  disabled?: boolean;
}

export default function MessageInput({ 
  onSend, 
  onTyping,
  onStopTyping, 
  disabled = false 
}: MessageInputProps) {
  const [text, setText] = useState('');
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Memoize to prevent effect from re-running on every render
  const memoizedStopTyping = useCallback(() => {
    onStopTyping();
  }, [onStopTyping]);

  const handleSend = () => {
    const trimmed = text.trim();
    if (trimmed) {
      console.log('📤 [MessageInput] Sending message:', trimmed.substring(0, 50));
      
      // Clear typing indicator before sending
      memoizedStopTyping();
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      
      onSend(trimmed);
      setText('');
    }
  };

  const handleTextChange = (value: string) => {
    setText(value);
    
    // Only trigger typing if there's text
    if (value.length > 0) {
      // Trigger typing indicator
      onTyping();
      
      // Clear previous timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      // Set new timeout to clear typing after inactivity
      typingTimeoutRef.current = setTimeout(() => {
        memoizedStopTyping();
        typingTimeoutRef.current = null;
      }, TYPING_CLEAR_DELAY_MS);
    } else {
      // If text is empty, immediately clear typing
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      memoizedStopTyping();
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      memoizedStopTyping();
    };
  }, [memoizedStopTyping]);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <View style={styles.container}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={handleTextChange}
          placeholder="Type a message..."
          placeholderTextColor="#999"
          multiline
          maxLength={1000}
          editable={!disabled}
        />
        <TouchableOpacity
          style={[
            styles.sendButton,
            (!text.trim() || disabled) && styles.sendButtonDisabled
          ]}
          onPress={handleSend}
          disabled={!text.trim() || disabled}
        >
          <Ionicons 
            name="send" 
            size={20} 
            color={text.trim() && !disabled ? '#007AFF' : '#999'} 
          />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 8,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    marginRight: 8,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});

