import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  useAudioRecorder,
  RecordingPresets,
  requestRecordingPermissionsAsync,
  createAudioPlayer,
} from 'expo-audio';
import * as SecureStore from 'expo-secure-store';

import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { API_BASE_URL } from '../../config';

import {
  DEFAULT_USER_ID,
  PINNED_STORAGE_KEY,
  TITLES_STORAGE_KEY,
} from './constants';

import ChatHeader from './components/ChatHeader';
import ChatDrawer from './components/ChatDrawer';
import { LanguageModal, ActionSheetModal, RenameModal } from './components/ChatModals';
import ChatMessageFeed from './components/ChatMessageFeed';
import ChatInputBar from './components/ChatInputBar';

export default function ChatbotScreen({ navigation }) {
  const { user } = useAuth();
  const userId = user?.id || DEFAULT_USER_ID;

  // Chat conversation state
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [lang, setLang] = useState('en');
  const [activeSessionId, setActiveSessionId] = useState(() => `session_${Date.now()}`);

  // Modals state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [langModalOpen, setLangModalOpen] = useState(false);

  // Chat history from Supabase
  const [chatHistory, setChatHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Long-press Action Sheet & Rename Modal
  const [actionSheetVisible, setActionSheetVisible] = useState(false);
  const [selectedChat, setSelectedChat] = useState(null);
  const [renameModalVisible, setRenameModalVisible] = useState(false);
  const [renameText, setRenameText] = useState('');

  // Persisted pinned IDs and custom titles
  const [pinnedChatIds, setPinnedChatIds] = useState([]);
  const [customTitles, setCustomTitles] = useState({});

  // Message feedback, copy, and audio states
  const [feedback, setFeedback] = useState({});
  const [copiedId, setCopiedId] = useState(null);
  const [playingAudioId, setPlayingAudioId] = useState(null);
  const audioPlayerRef = useRef(null);

  // Voice recording
  const [isRecording, setIsRecording] = useState(false);
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  const flatListRef = useRef(null);

  // Audio player cleanup
  useEffect(() => {
    return () => {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.remove();
        audioPlayerRef.current = null;
      }
    };
  }, []);

  // ── Load Pinned & Renamed Metadata from Storage ──────────────────────────
  useEffect(() => {
    const loadStoredMetadata = async () => {
      try {
        const [rawPinned, rawTitles] = await Promise.all([
          SecureStore.getItemAsync(PINNED_STORAGE_KEY),
          SecureStore.getItemAsync(TITLES_STORAGE_KEY),
        ]);
        if (rawPinned) setPinnedChatIds(JSON.parse(rawPinned));
        if (rawTitles) setCustomTitles(JSON.parse(rawTitles));
      } catch (err) {
        console.warn('Load metadata error:', err);
      }
    };
    loadStoredMetadata();
  }, []);

  // ── Fetch Chats directly from Supabase (with deduplication) ─────────────
  const fetchChatsFromSupabase = useCallback(async () => {
    try {
      setLoadingHistory(true);
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

      if (error) {
        console.warn('[Supabase Error] fetch chats:', error.message);
        return;
      }

      if (data && data.length > 0) {
        const threadsMap = {};

        data.forEach((row, idx) => {
          const sid = row.session_id || `chat_${row.id || idx}`;
          const cleanMsg = (row.message || '').replace(/^\[Mode:\s*[^\]]+\]\s*/i, '').trim();
          const role = row.sender === 'user' ? 'user' : 'assistant';
          const content = cleanMsg || row.message;

          if (!threadsMap[sid]) {
            threadsMap[sid] = {
              id: sid,
              title: cleanMsg
                ? cleanMsg.slice(0, 32) + (cleanMsg.length > 32 ? '...' : '')
                : `Conversation ${Object.keys(threadsMap).length + 1}`,
              messages: [],
              messageIds: [],
              createdAt: row.created_at,
            };
          }

          if (row.id) {
            threadsMap[sid].messageIds.push(row.id);
          }

          // Deduplicate: avoid pushing identical message if same role and content was already added in this thread
          const prevMessages = threadsMap[sid].messages;
          const isDuplicate = prevMessages.some(
            (m) => m.role === role && m.content === content
          );

          if (!isDuplicate) {
            threadsMap[sid].messages.push({
              id: row.id || `msg_${idx}`,
              role,
              content,
            });
          }
        });

        const sortedThreads = Object.values(threadsMap).reverse();
        setChatHistory(sortedThreads);
      } else {
        setChatHistory([]);
      }
    } catch (err) {
      console.warn('[Supabase] fetch error:', err);
    } finally {
      setLoadingHistory(false);
    }
  }, [userId]);

  // Load chat history from Supabase on mount
  useEffect(() => {
    fetchChatsFromSupabase();
  }, [fetchChatsFromSupabase]);

  // ── New Chat ────────────────────────────────────────────────────────────
  const startNewChat = () => {
    const newSid = `session_${Date.now()}`;
    setActiveSessionId(newSid);
    setMessages([]);
    setInput('');
    setDrawerOpen(false);
  };

  // ── Load an Existing Chat Thread ────────────────────────────────────────
  const loadChatThread = (thread) => {
    setActiveSessionId(thread.id);
    setMessages(thread.messages || []);
    setInput('');
    setDrawerOpen(false);
  };

  // ── Open Action Sheet on Long-Press ─────────────────────────────────────
  const handleHoldChat = (thread) => {
    setSelectedChat(thread);
    setActionSheetVisible(true);
  };

  // ── Toggle Pin / Unpin ──────────────────────────────────────────────────
  const handleTogglePin = async () => {
    if (!selectedChat) return;
    const isPinned = pinnedChatIds.includes(selectedChat.id);
    const nextPinned = isPinned
      ? pinnedChatIds.filter((id) => id !== selectedChat.id)
      : [selectedChat.id, ...pinnedChatIds];

    setPinnedChatIds(nextPinned);
    setActionSheetVisible(false);

    try {
      await SecureStore.setItemAsync(PINNED_STORAGE_KEY, JSON.stringify(nextPinned));
    } catch (err) {
      console.warn('Save pin error:', err);
    }
  };

  // ── Open Rename Dialog ──────────────────────────────────────────────────
  const handleOpenRename = () => {
    if (!selectedChat) return;
    const currentDisplayTitle = customTitles[selectedChat.id] || selectedChat.title;
    setRenameText(currentDisplayTitle);
    setActionSheetVisible(false);
    setRenameModalVisible(true);
  };

  // ── Save Renamed Chat ───────────────────────────────────────────────────
  const handleSaveRename = async () => {
    if (!selectedChat || !renameText.trim()) {
      setRenameModalVisible(false);
      return;
    }
    const trimmed = renameText.trim();
    const nextTitles = { ...customTitles, [selectedChat.id]: trimmed };
    setCustomTitles(nextTitles);
    setRenameModalVisible(false);

    try {
      await SecureStore.setItemAsync(TITLES_STORAGE_KEY, JSON.stringify(nextTitles));
    } catch (err) {
      console.warn('Save rename error:', err);
    }
  };

  // ── Delete a Chat Thread from Supabase ──────────────────────────────────
  const handleDeleteChat = () => {
    if (!selectedChat) return;
    const threadId = selectedChat.id;
    const messageIds = selectedChat.messageIds || [];
    setActionSheetVisible(false);

    Alert.alert(
      'Delete Conversation',
      'Are you sure you want to permanently delete this chat from Supabase?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // 1. Delete by session_id from Supabase chat_messages
              if (threadId && !threadId.startsWith('chat_')) {
                const { error: sessionErr } = await supabase
                  .from('chat_messages')
                  .delete()
                  .eq('session_id', threadId);

                if (sessionErr) {
                  console.warn('[Supabase Delete session_id Error]:', sessionErr.message);
                }
              }

              // 2. Also delete any messages matching the captured row IDs
              if (messageIds.length > 0) {
                const { error: idErr } = await supabase
                  .from('chat_messages')
                  .delete()
                  .in('id', messageIds);

                if (idErr) {
                  console.warn('[Supabase Delete IDs Error]:', idErr.message);
                }
              }

              // 3. Remove from pinned & custom titles
              const nextPinned = pinnedChatIds.filter((id) => id !== threadId);
              setPinnedChatIds(nextPinned);
              SecureStore.setItemAsync(PINNED_STORAGE_KEY, JSON.stringify(nextPinned)).catch(() => null);

              const nextTitles = { ...customTitles };
              delete nextTitles[threadId];
              setCustomTitles(nextTitles);
              SecureStore.setItemAsync(TITLES_STORAGE_KEY, JSON.stringify(nextTitles)).catch(() => null);

              // 4. Update local state
              setChatHistory((prev) => prev.filter((t) => t.id !== threadId));

              // If active chat was deleted, reset to new chat
              if (activeSessionId === threadId) {
                startNewChat();
              }
            } catch (err) {
              Alert.alert('Error', 'Failed to delete chat record.');
            }
          },
        },
      ]
    );
  };

  // ── Feedback & Actions ──────────────────────────────────────────────────
  const toggleFeedback = (msgId, type) => {
    setFeedback((prev) => ({
      ...prev,
      [msgId]: prev[msgId] === type ? null : type,
    }));
  };

  const handleCopy = (msgId, text) => {
    try {
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
        navigator.clipboard.writeText(text);
      }
    } catch {}
    setCopiedId(msgId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSpeak = async (msgId, text) => {
    if (playingAudioId === msgId) {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.remove();
        audioPlayerRef.current = null;
      }
      setPlayingAudioId(null);
      return;
    }
    try {
      setPlayingAudioId(msgId);
      const cleanText = text
        .replace(/<think>[\s\S]*?<\/think>/gi, '')
        .replace(/[#*_•`]/g, '')
        .trim()
        .slice(0, 320);

      const res = await fetch(`${API_BASE_URL}/api/tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: cleanText, language: lang }),
      });

      if (res.ok) {
        const data = await res.json();
        const audioBase64 = data.audio_base64 || data.audio;
        if (audioBase64) {
          if (audioPlayerRef.current) {
            audioPlayerRef.current.remove();
          }
          const player = createAudioPlayer({ uri: `data:audio/mp3;base64,${audioBase64}` });
          audioPlayerRef.current = player;
          player.addListener('playbackStatusUpdate', (status) => {
            if (status.didJustFinish) {
              setPlayingAudioId(null);
            }
          });
          player.play();
          return;
        }
      }
    } catch (err) {
      console.warn('TTS playback error:', err);
    }
    setPlayingAudioId(null);
  };

  // ── Send Message ────────────────────────────────────────────────────────
  const sendMessage = async (promptOverride) => {
    const textToSend = (promptOverride || input).trim();
    if (!textToSend || loading) return;

    setInput('');
    const userMsgId = `u_${Date.now()}`;
    const userMsg = { id: userMsgId, role: 'user', content: textToSend };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setLoading(true);

    const currentSid = activeSessionId;

    // Send query to AI backend (backend saves both query & bot response to Supabase)
    try {
      const historyPayload = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch(`${API_BASE_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': userId,
        },
        body: JSON.stringify({
          message: textToSend,
          history: historyPayload,
          user_id: userId,
          mode: 'General',
          language: lang,
          session_id: currentSid,
        }),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();
      const botReply = data.reply || data.response || 'No response received from advisor.';

      const botMsg = {
        id: `a_${Date.now()}`,
        role: 'assistant',
        content: botReply,
      };

      setMessages([...updatedMessages, botMsg]);

      // Refresh chats list in drawer after background DB save
      setTimeout(() => {
        fetchChatsFromSupabase();
      }, 500);
    } catch (err) {
      console.warn('[Chat Error]:', err);
      Alert.alert(
        'Backend Connection',
        `Could not reach ${API_BASE_URL}.\n\nEnsure Uvicorn is running with:\nuvicorn main:app --reload --host 0.0.0.0 --port 8000`,
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };

  // ── Voice Input (STT) ───────────────────────────────────────────────────
  const startVoiceRecording = async () => {
    try {
      const { granted } = await requestRecordingPermissionsAsync();
      if (!granted) {
        Alert.alert('Permission Denied', 'Microphone access is required for voice input.');
        return;
      }
      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();
      setIsRecording(true);
    } catch (err) {
      console.warn('Voice record error:', err);
    }
  };

  const stopVoiceRecording = async () => {
    try {
      setIsRecording(false);
      await audioRecorder.stop();
      const uri = audioRecorder.uri;

      if (uri) {
        setLoading(true);
        const filename = uri.split('/').pop() || 'voice.m4a';
        const formData = new FormData();
        formData.append('audio', {
          uri,
          name: filename,
          type: 'audio/m4a',
        });
        formData.append('language', lang);

        const res = await fetch(`${API_BASE_URL}/api/stt`, {
          method: 'POST',
          body: formData,
        });

        if (res.ok) {
          const data = await res.json();
          if (data.transcript) {
            setInput(data.transcript);
          }
        }
      }
    } catch (err) {
      console.warn('Voice STT error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Process and sort threads: Pinned threads first, then newest
  const processedThreads = chatHistory.map((thread) => {
    const isPinned = pinnedChatIds.includes(thread.id);
    const displayTitle = customTitles[thread.id] || thread.title;
    return {
      ...thread,
      title: displayTitle,
      isPinned,
    };
  });

  const sortedThreads = [...processedThreads].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return 0;
  });

  const isSelectedChatPinned = selectedChat ? pinnedChatIds.includes(selectedChat.id) : false;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#090D16" />

      {/* ── Minimalist Premium Header ── */}
      <ChatHeader
        onOpenDrawer={() => {
          fetchChatsFromSupabase();
          setDrawerOpen(true);
        }}
        onOpenLangModal={() => setLangModalOpen(true)}
        onNewChat={startNewChat}
        currentLang={lang}
      />

      {/* ── Language Selector Modal ── */}
      <LanguageModal
        visible={langModalOpen}
        onClose={() => setLangModalOpen(false)}
        currentLang={lang}
        onSelectLang={(code) => {
          setLang(code);
          setLangModalOpen(false);
        }}
      />

      {/* ── Slide Drawer (Chats & New Chat) ── */}
      <ChatDrawer
        visible={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onNewChat={startNewChat}
        threads={sortedThreads}
        activeSessionId={activeSessionId}
        loadingHistory={loadingHistory}
        onSelectThread={loadChatThread}
        onHoldThread={handleHoldChat}
      />

      {/* ── Hold/Long-Press Action Sheet Modal ── */}
      <ActionSheetModal
        visible={actionSheetVisible}
        onClose={() => setActionSheetVisible(false)}
        selectedChat={selectedChat}
        isPinned={isSelectedChatPinned}
        onTogglePin={handleTogglePin}
        onOpenRename={handleOpenRename}
        onDeleteChat={handleDeleteChat}
      />

      {/* ── Rename Conversation Modal Dialog ── */}
      <RenameModal
        visible={renameModalVisible}
        onClose={() => setRenameModalVisible(false)}
        renameText={renameText}
        onChangeRenameText={setRenameText}
        onSaveRename={handleSaveRename}
      />

      {/* ── Main Conversation Area (Starter State or Message Feed) ── */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ChatMessageFeed
          messages={messages}
          loading={loading}
          flatListRef={flatListRef}
          onSelectSuggestion={(prompt) => sendMessage(prompt)}
          onSpeak={handleSpeak}
          playingAudioId={playingAudioId}
          feedback={feedback}
          onToggleFeedback={toggleFeedback}
          copiedId={copiedId}
          onCopy={handleCopy}
        />

        {/* ── Floating Capsule Input Bar ── */}
        <ChatInputBar
          input={input}
          onChangeInput={setInput}
          onSend={() => sendMessage()}
          isRecording={isRecording}
          onToggleRecording={isRecording ? stopVoiceRecording : startVoiceRecording}
          loading={loading}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090D16', // Deep luxury slate
  },
});
