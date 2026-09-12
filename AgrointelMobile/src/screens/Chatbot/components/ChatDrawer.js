import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Pressable,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function ChatDrawer({
  visible,
  onClose,
  onNewChat,
  threads = [],
  activeSessionId,
  loadingHistory = false,
  onSelectThread,
  onHoldThread,
}) {
  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.drawerOverlay}>
        <Pressable style={styles.drawerBackdrop} onPress={onClose} />

        <View style={styles.drawerPanel}>
          {/* Drawer Header */}
          <View style={styles.drawerHeader}>
            <View style={styles.brandRow}>
              <Text style={styles.brandTitle}>AgroIntel</Text>
              <View style={styles.brandBadge}>
                <Text style={styles.brandBadgeText}>AI</Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={onClose}
              style={styles.drawerCloseBtn}
              activeOpacity={0.7}
            >
              <Ionicons name="close-outline" size={22} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* 1. New Chat Capsule Button */}
          <TouchableOpacity
            style={styles.newChatBtn}
            onPress={onNewChat}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={20} color="#10B981" />
            <Text style={styles.newChatBtnText}>New chat</Text>
          </TouchableOpacity>

          {/* 2. Chats Section (Directly from Supabase) */}
          <View style={styles.chatsHeadingRow}>
            <Text style={styles.chatsHeadingText}>
              CHATS {threads.length > 0 ? `(${threads.length})` : ''}
            </Text>
            {loadingHistory && (
              <ActivityIndicator size="small" color="#10B981" />
            )}
          </View>

          <ScrollView style={styles.drawerScroll} showsVerticalScrollIndicator={false}>
            {loadingHistory && threads.length === 0 ? (
              <View style={styles.drawerEmptyBox}>
                <ActivityIndicator size="small" color="#10B981" />
                <Text style={styles.drawerEmptyText}>Loading from Supabase...</Text>
              </View>
            ) : threads.length === 0 ? (
              <View style={styles.drawerEmptyBox}>
                <Ionicons name="chatbubble-ellipses-outline" size={30} color="#475569" />
                <Text style={styles.drawerEmptyTitle}>No conversations yet</Text>
                <Text style={styles.drawerEmptySub}>
                  Start chatting to see your Supabase chat records here.
                </Text>
              </View>
            ) : (
              threads.map((thread) => {
                const isActive = thread.id === activeSessionId;
                return (
                  <TouchableOpacity
                    key={thread.id}
                    style={[styles.chatRow, isActive && styles.chatRowActive]}
                    onPress={() => onSelectThread(thread)}
                    onLongPress={() => onHoldThread(thread)}
                    delayLongPress={300}
                    activeOpacity={0.75}
                  >
                    <Ionicons
                      name={thread.isPinned ? 'pin' : 'chatbubble-outline'}
                      size={15}
                      color={thread.isPinned ? '#10B981' : isActive ? '#10B981' : '#64748B'}
                      style={{ marginRight: 10 }}
                    />
                    <Text
                      style={[
                        styles.chatRowTitle,
                        isActive && styles.chatRowTitleActive,
                        thread.isPinned && styles.chatRowTitlePinned,
                      ]}
                      numberOfLines={1}
                    >
                      {thread.title}
                    </Text>
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  drawerOverlay: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
  },
  drawerBackdrop: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  },
  drawerPanel: {
    width: '80%',
    maxWidth: 300,
    backgroundColor: '#0B0F1A',
    borderRightWidth: 1,
    borderRightColor: 'rgba(255, 255, 255, 0.08)',
    paddingTop: Platform.OS === 'ios' ? 44 : 20,
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  drawerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
    paddingHorizontal: 2,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  brandTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#F8FAFC',
    letterSpacing: 0.2,
  },
  brandBadge: {
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  brandBadgeText: {
    color: '#10B981',
    fontSize: 10,
    fontWeight: '800',
  },
  drawerCloseBtn: {
    padding: 6,
  },
  newChatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#131B2E',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  newChatBtnText: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '600',
  },
  chatsHeadingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
    marginBottom: 10,
  },
  chatsHeadingText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 1.2,
  },
  drawerScroll: {
    flex: 1,
  },
  drawerEmptyBox: {
    paddingVertical: 36,
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 6,
  },
  drawerEmptyTitle: {
    color: '#CBD5E1',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 6,
  },
  drawerEmptySub: {
    color: '#64748B',
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
  },
  drawerEmptyText: {
    color: '#64748B',
    fontSize: 12,
  },
  chatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: 10,
    borderRadius: 10,
    marginBottom: 3,
  },
  chatRowActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  chatRowTitle: {
    flex: 1,
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '500',
  },
  chatRowTitleActive: {
    color: '#F8FAFC',
    fontWeight: '600',
  },
  chatRowTitlePinned: {
    color: '#E2E8F0',
    fontWeight: '600',
  },
});
