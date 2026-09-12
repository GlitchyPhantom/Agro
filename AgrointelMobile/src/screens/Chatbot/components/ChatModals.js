import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LANGUAGES } from '../constants';

/**
 * Language Selector Modal
 */
export function LanguageModal({ visible, onClose, currentLang, onSelectLang }) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>Choose Language</Text>
          <FlatList
            data={Object.entries(LANGUAGES)}
            keyExtractor={([code]) => code}
            renderItem={({ item: [code, name] }) => {
              const isSelected = currentLang === code;
              return (
                <TouchableOpacity
                  style={[styles.langItem, isSelected && styles.langItemActive]}
                  onPress={() => onSelectLang(code)}
                >
                  <Text style={[styles.langItemName, isSelected && styles.langItemNameActive]}>
                    {name}
                  </Text>
                  <Text style={[styles.langItemCode, isSelected && styles.langItemCodeActive]}>
                    {code.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              );
            }}
          />
        </View>
      </Pressable>
    </Modal>
  );
}

/**
 * Long-Press Action Sheet Modal (Pin, Rename, Delete)
 */
export function ActionSheetModal({
  visible,
  onClose,
  selectedChat,
  isPinned,
  onTogglePin,
  onOpenRename,
  onDeleteChat,
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.actionSheetOverlay} onPress={onClose}>
        <View style={styles.actionSheetPanel}>
          {/* Grab Handle */}
          <View style={styles.handleBar} />

          {/* Chat Title Preview */}
          <Text style={styles.actionSheetTitle} numberOfLines={1}>
            {selectedChat?.title || 'Conversation'}
          </Text>

          {/* Action 1: Pin / Unpin */}
          <TouchableOpacity
            style={styles.actionItem}
            onPress={onTogglePin}
            activeOpacity={0.7}
          >
            <Ionicons
              name={isPinned ? 'pin' : 'pin-outline'}
              size={20}
              color={isPinned ? '#10B981' : '#F8FAFC'}
            />
            <Text style={[styles.actionItemText, isPinned && { color: '#10B981' }]}>
              {isPinned ? 'Unpin' : 'Pin'}
            </Text>
          </TouchableOpacity>

          {/* Action 2: Rename */}
          <TouchableOpacity
            style={styles.actionItem}
            onPress={onOpenRename}
            activeOpacity={0.7}
          >
            <Ionicons name="pencil-outline" size={20} color="#F8FAFC" />
            <Text style={styles.actionItemText}>Rename</Text>
          </TouchableOpacity>

          {/* Action 3: Delete */}
          <TouchableOpacity
            style={[styles.actionItem, styles.actionItemDelete]}
            onPress={onDeleteChat}
            activeOpacity={0.7}
          >
            <Ionicons name="trash-outline" size={20} color="#EF4444" />
            <Text style={[styles.actionItemText, styles.actionItemDeleteText]}>Delete</Text>
          </TouchableOpacity>
        </View>
      </Pressable>
    </Modal>
  );
}

/**
 * Rename Conversation Modal Dialog
 */
export function RenameModal({
  visible,
  onClose,
  renameText,
  onChangeRenameText,
  onSaveRename,
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.renameBackdrop}
      >
        <View style={styles.renameCard}>
          <Text style={styles.renameCardTitle}>Rename Conversation</Text>
          <TextInput
            style={styles.renameTextInput}
            value={renameText}
            onChangeText={onChangeRenameText}
            placeholder="Enter conversation name"
            placeholderTextColor="#64748B"
            autoFocus
            maxLength={50}
          />
          <View style={styles.renameBtnRow}>
            <TouchableOpacity
              style={styles.renameCancelBtn}
              onPress={onClose}
            >
              <Text style={styles.renameCancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.renameSaveBtn}
              onPress={onSaveRename}
            >
              <Text style={styles.renameSaveBtnText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  /* ── Language Modal ── */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: '#131B2E',
    borderRadius: 20,
    width: '100%',
    maxWidth: 320,
    maxHeight: 400,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalTitle: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
  },
  langItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  langItemActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  langItemName: {
    color: '#CBD5E1',
    fontSize: 14,
  },
  langItemNameActive: {
    color: '#10B981',
    fontWeight: '700',
  },
  langItemCode: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '600',
  },
  langItemCodeActive: {
    color: '#10B981',
  },

  /* ── Long-Press Action Sheet Modal ── */
  actionSheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  actionSheetPanel: {
    backgroundColor: '#131B2A',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  handleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#475569',
    alignSelf: 'center',
    marginBottom: 16,
  },
  actionSheetTitle: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  actionItemText: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '500',
  },
  actionItemDelete: {
    borderBottomWidth: 0,
  },
  actionItemDeleteText: {
    color: '#EF4444',
  },

  /* ── Rename Modal ── */
  renameBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  renameCard: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: '#131B2E',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  renameCardTitle: {
    color: '#F8FAFC',
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 16,
  },
  renameTextInput: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#F8FAFC',
    fontSize: 15,
    marginBottom: 20,
  },
  renameBtnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  renameCancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#1E293B',
  },
  renameCancelBtnText: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '600',
  },
  renameSaveBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#10B981',
  },
  renameSaveBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
