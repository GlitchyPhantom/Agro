import React from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function ChatInputBar({
  input = '',
  onChangeInput,
  onSend,
  isRecording = false,
  onToggleRecording,
  loading = false,
}) {
  const hasText = input.trim().length > 0;

  return (
    <View style={styles.bottomBar}>
      <View style={styles.capsuleInput}>
        {/* Left: Voice Recording Button */}
        <TouchableOpacity
          style={[styles.iconActionBtn, isRecording && styles.iconActionBtnActive]}
          onPress={onToggleRecording}
          activeOpacity={0.7}
        >
          <Ionicons
            name={isRecording ? 'stop-circle' : 'mic-outline'}
            size={20}
            color={isRecording ? '#EF4444' : '#94A3B8'}
          />
        </TouchableOpacity>

        {/* Input Field */}
        <TextInput
          style={styles.inputField}
          placeholder="Message AgroIntel..."
          placeholderTextColor="#64748B"
          value={input}
          onChangeText={onChangeInput}
          multiline
          maxLength={1000}
        />

        {/* Right: Circular Send Button */}
        <TouchableOpacity
          style={[
            styles.sendCircleBtn,
            hasText && !loading && styles.sendCircleBtnActive,
          ]}
          onPress={onSend}
          disabled={!hasText || loading}
          activeOpacity={0.8}
        >
          <Ionicons
            name="arrow-up"
            size={18}
            color={hasText && !loading ? '#FFFFFF' : '#64748B'}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bottomBar: {
    paddingHorizontal: 14,
    paddingBottom: Platform.OS === 'ios' ? 10 : 10,
    paddingTop: 6,
    backgroundColor: 'transparent',
  },
  capsuleInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#131B2E',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingLeft: 6,
    paddingRight: 6,
    paddingVertical: 5,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  iconActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconActionBtnActive: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  inputField: {
    flex: 1,
    color: '#F8FAFC',
    fontSize: 14,
    maxHeight: 100,
    paddingHorizontal: 6,
    paddingVertical: Platform.OS === 'ios' ? 6 : 2,
  },
  sendCircleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendCircleBtnActive: {
    backgroundColor: '#10B981',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
});
