import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import FormattedMessage from '../../../components/FormattedMessage';
import { SUGGESTIONS } from '../constants';

export default function ChatMessageFeed({
  messages = [],
  loading = false,
  flatListRef,
  onSelectSuggestion,
  onSpeak,
  playingAudioId,
  feedback = {},
  onToggleFeedback,
  copiedId,
  onCopy,
}) {
  if (messages.length === 0) {
    return (
      <ScrollView
        contentContainerStyle={styles.starterContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Minimalist Hero Emblem */}
        <View style={styles.heroCenter}>
          <View style={styles.heroEmblem}>
            <Ionicons name="leaf" size={24} color="#10B981" />
          </View>
          <Text style={styles.heroGreeting}>How can I help you today?</Text>
          <Text style={styles.heroSubtext}>
            Ask anything about crop health, pest treatments, or soil care.
          </Text>
        </View>

        {/* Compact 2x2 Suggestion Grid */}
        <View style={styles.gridContainer}>
          {SUGGESTIONS.map((s, idx) => (
            <TouchableOpacity
              key={idx}
              style={styles.suggestionCard}
              onPress={() => onSelectSuggestion(s.prompt)}
              activeOpacity={0.75}
            >
              <View style={styles.cardTopRow}>
                <View style={styles.cardIconBox}>
                  <Ionicons name={s.icon} size={15} color="#10B981" />
                </View>
                <Text style={styles.cardTitle}>{s.title}</Text>
              </View>
              <Text style={styles.cardPrompt} numberOfLines={2}>
                {s.prompt}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    );
  }

  return (
    <FlatList
      ref={flatListRef}
      data={messages}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.messagesList}
      onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
      renderItem={({ item }) => {
        const isUser = item.role === 'user';
        if (isUser) {
          return (
            <View style={styles.userMessageRow}>
              <View style={styles.userBubble}>
                <Text style={styles.userText}>{item.content}</Text>
              </View>
            </View>
          );
        }

        // Assistant: Full screen width, NO card boundary, Gemini layout
        return (
          <View style={styles.assistantMessageBlock}>
            {/* Top: Sparkles Icon + AgroIntel Model Name + Audio Listen */}
            <View style={styles.assistantTopBar}>
              <View style={styles.assistantTitleRow}>
                <Ionicons name="sparkles" size={17} color="#10B981" />
                <Text style={styles.assistantModelName}>AgroIntel</Text>
              </View>
              <TouchableOpacity
                style={styles.actionIconBtn}
                onPress={() => onSpeak(item.id, item.content)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={playingAudioId === item.id ? 'stop-circle' : 'volume-medium-outline'}
                  size={20}
                  color={playingAudioId === item.id ? '#10B981' : '#94A3B8'}
                />
              </TouchableOpacity>
            </View>

            {/* Body: Full Width Markdown Content */}
            <View style={styles.assistantBody}>
              <FormattedMessage text={item.content} isUser={false} />
            </View>

            {/* Bottom Actions: Thumbs up, Thumbs down, Copy */}
            <View style={styles.assistantBottomActions}>
              <TouchableOpacity
                style={styles.actionIconBtn}
                onPress={() => onToggleFeedback(item.id, 'like')}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={feedback[item.id] === 'like' ? 'thumbs-up' : 'thumbs-up-outline'}
                  size={17}
                  color={feedback[item.id] === 'like' ? '#10B981' : '#64748B'}
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionIconBtn}
                onPress={() => onToggleFeedback(item.id, 'dislike')}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={feedback[item.id] === 'dislike' ? 'thumbs-down' : 'thumbs-down-outline'}
                  size={17}
                  color={feedback[item.id] === 'dislike' ? '#EF4444' : '#64748B'}
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionIconBtn}
                onPress={() => onCopy(item.id, item.content)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={copiedId === item.id ? 'checkmark' : 'copy-outline'}
                  size={17}
                  color={copiedId === item.id ? '#10B981' : '#64748B'}
                />
              </TouchableOpacity>
            </View>

            {/* Gemini-style Disclaimer */}
            <Text style={styles.geminiDisclaimer}>
              AgroIntel is AI and can make mistakes.
            </Text>
          </View>
        );
      }}
      ListFooterComponent={
        loading ? (
          <View style={styles.assistantLoadingBlock}>
            <View style={styles.assistantTopBar}>
              <View style={styles.assistantTitleRow}>
                <Ionicons name="sparkles" size={17} color="#10B981" />
                <Text style={styles.assistantModelName}>AgroIntel</Text>
              </View>
            </View>
            <View style={styles.loadingRow}>
              <ActivityIndicator color="#10B981" size="small" />
              <Text style={styles.loadingLabel}>AgroIntel is thinking...</Text>
            </View>
          </View>
        ) : null
      }
    />
  );
}

const styles = StyleSheet.create({
  /* ── Starter / Calm Empty State ── */
  starterContainer: {
    paddingHorizontal: 16,
    paddingTop: 36,
    paddingBottom: 24,
    alignItems: 'center',
  },
  heroCenter: {
    alignItems: 'center',
    marginBottom: 28,
  },
  heroEmblem: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  heroGreeting: {
    fontSize: 21,
    fontWeight: '700',
    color: '#F8FAFC',
    textAlign: 'center',
    letterSpacing: -0.2,
    marginBottom: 6,
  },
  heroSubtext: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    maxWidth: 290,
    lineHeight: 18,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    width: '100%',
  },
  suggestionCard: {
    width: '48.5%',
    backgroundColor: '#111827',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    minHeight: 88,
    justifyContent: 'space-between',
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  cardIconBox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitle: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '600',
  },
  cardPrompt: {
    color: '#94A3B8',
    fontSize: 11,
    lineHeight: 15,
  },

  /* ── Messages List ── */
  messagesList: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },

  /* ── User Query (Gemini Neutral Pill, No Green) ── */
  userMessageRow: {
    width: '100%',
    alignItems: 'flex-end',
    marginBottom: 20,
    marginTop: 6,
  },
  userBubble: {
    backgroundColor: '#272A34', // Neutral dark charcoal/slate pill, matching Gemini (#282A2C)
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingVertical: 10,
    maxWidth: '85%',
  },
  userText: {
    color: '#F8FAFC',
    fontSize: 15,
    lineHeight: 21,
  },

  /* ── Assistant Message (Gemini Full Width, No Card Boundary) ── */
  assistantMessageBlock: {
    width: '100%',
    backgroundColor: 'transparent',
    paddingVertical: 4,
    marginBottom: 28,
  },
  assistantTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  assistantTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  assistantModelName: {
    color: '#F1F5F9',
    fontSize: 14.5,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  assistantBody: {
    width: '100%',
  },
  assistantBottomActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
    marginTop: 14,
    paddingTop: 4,
  },
  actionIconBtn: {
    padding: 4,
  },
  geminiDisclaimer: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 10,
    lineHeight: 16,
  },

  /* ── Assistant Loading Block ── */
  assistantLoadingBlock: {
    width: '100%',
    paddingVertical: 4,
    marginBottom: 20,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
  },
  loadingLabel: {
    color: '#94A3B8',
    fontSize: 13,
  },
});
