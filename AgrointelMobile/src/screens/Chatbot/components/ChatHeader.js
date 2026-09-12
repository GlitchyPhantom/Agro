import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function ChatHeader({
  onOpenDrawer,
  onOpenLangModal,
  onNewChat,
  currentLang = 'en',
}) {
  return (
    <View style={styles.header}>
      {/* Left: Sleek Menu Button */}
      <TouchableOpacity
        style={styles.headerBtn}
        onPress={onOpenDrawer}
        activeOpacity={0.7}
      >
        <Ionicons name="menu-outline" size={24} color="#E2E8F0" />
      </TouchableOpacity>

      {/* Center: Brand Title with AI Badge */}
      <View style={styles.brandRow}>
        <Text style={styles.brandTitle}>AgroIntel</Text>
        <View style={styles.brandBadge}>
          <Text style={styles.brandBadgeText}>AI</Text>
        </View>
      </View>

      {/* Right: Language Pill + New Chat Icon */}
      <View style={styles.headerActions}>
        <TouchableOpacity
          style={styles.langPill}
          onPress={onOpenLangModal}
          activeOpacity={0.7}
        >
          <Ionicons name="globe-outline" size={13} color="#10B981" />
          <Text style={styles.langPillText}>{currentLang.toUpperCase()}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.headerBtn}
          onPress={onNewChat}
          activeOpacity={0.7}
        >
          <Ionicons name="create-outline" size={22} color="#CBD5E1" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 52,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
    backgroundColor: '#090D16',
  },
  headerBtn: {
    padding: 6,
    borderRadius: 8,
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  langPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#131B2E',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  langPillText: {
    color: '#10B981',
    fontSize: 11,
    fontWeight: '700',
  },
});
