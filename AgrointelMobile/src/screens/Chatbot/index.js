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
import * as Speech from 'expo-speech';
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
  const [audioLoadingId, setAudioLoadingId] = useState(null);
  const [pausedAudioId, setPausedAudioId] = useState(null);
  const audioPlayerRef = useRef(null);
  const currentAudioMsgIdRef = useRef(null);
  const abortControllerRef = useRef(null);

  // Sequential chunk playback & built-in speech refs
  const audioModeRef = useRef(null); // 'speech' | 'sarvam'
  const isPlayingRef = useRef(false);
  const sarvamQueueRef = useRef([]);
  const currentChunkIndexRef = useRef(0);
  const cleanTextRef = useRef('');
  const speechLocaleRef = useRef('en-US');
  const sarvamLangRef = useRef('od');
  const hasOdiaVoiceRef = useRef(null);

  // Voice recording
  const [isRecording, setIsRecording] = useState(false);
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  const flatListRef = useRef(null);

  // Stop & clear all audio playback
  const stopAudio = useCallback(() => {
    isPlayingRef.current = false;
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    try {
      Speech.stop();
    } catch (e) {}
    if (audioPlayerRef.current) {
      try {
        audioPlayerRef.current.pause();
        audioPlayerRef.current.remove();
      } catch (e) {}
      audioPlayerRef.current = null;
    }
    sarvamQueueRef.current = [];
    currentChunkIndexRef.current = 0;
    currentAudioMsgIdRef.current = null;
    audioModeRef.current = null;
    setPlayingAudioId(null);
    setPausedAudioId(null);
    setAudioLoadingId(null);
  }, []);

  // Audio player cleanup on unmount
  useEffect(() => {
    return () => {
      stopAudio();
    };
  }, [stopAudio]);

  // ── Helper: Check if device has native Odia TTS voice installed ───────────
  const checkDeviceHasOdiaVoice = async () => {
    try {
      const voices = await Speech.getAvailableVoicesAsync();
      if (!Array.isArray(voices) || voices.length === 0) return false;
      return voices.some((v) => {
        const langCode = (v.language || '').toLowerCase().replace(/_/g, '-');
        const voiceName = (v.name || '').toLowerCase();
        return (
          langCode === 'or' ||
          langCode.startsWith('or-') ||
          langCode === 'ory' ||
          langCode.startsWith('ory-') ||
          voiceName.includes('odia') ||
          voiceName.includes('oriya')
        );
      });
    } catch (e) {
      console.warn('[Speech] Voice check error:', e);
      return false;
    }
  };

  // Check device native Odia TTS capability on mount
  useEffect(() => {
    checkDeviceHasOdiaVoice().then((hasVoice) => {
      hasOdiaVoiceRef.current = hasVoice;
      console.log('[TTS Check] Device has native Odia TTS:', hasVoice);
    });
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
    stopAudio();
    const newSid = `session_${Date.now()}`;
    setActiveSessionId(newSid);
    setMessages([]);
    setInput('');
    setDrawerOpen(false);
  };

  // ── Load an Existing Chat Thread ────────────────────────────────────────
  const loadChatThread = (thread) => {
    stopAudio();
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

  // ── Split text into natural chunks for Sarvam fallback (<= 100 chars each) ──
  const splitTextIntoChunks = (text, maxChunkLen = 100) => {
    if (!text) return [];
    // Split on sentence & natural clause boundaries: '.', '!', '?', '।', ',', ';', '\n'
    const sentenceRegex = /[^.!?।,;\n]+[.!?।,;\n]+|[^.!?।,;\n]+$/g;
    const rawSentences = text.match(sentenceRegex) || [text];
    const chunks = [];
    let currentChunk = '';

    for (let s of rawSentences) {
      const sentence = s.trim();
      if (!sentence) continue;
      if ((currentChunk + ' ' + sentence).trim().length <= maxChunkLen) {
        currentChunk = (currentChunk + ' ' + sentence).trim();
      } else {
        if (currentChunk) chunks.push(currentChunk);
        if (sentence.length > maxChunkLen) {
          const words = sentence.split(/\s+/);
          let subChunk = '';
          for (let w of words) {
            if ((subChunk + ' ' + w).trim().length <= maxChunkLen) {
              subChunk = (subChunk + ' ' + w).trim();
            } else {
              if (subChunk) chunks.push(subChunk);
              subChunk = w;
            }
          }
          currentChunk = subChunk;
        } else {
          currentChunk = sentence;
        }
      }
    }
    if (currentChunk) chunks.push(currentChunk);
    return chunks;
  };

  // ── Play one Sarvam chunk at a time (sequential, credit-saving queue) ────
  const playSarvamChunk = async (msgId, targetLang, chunkIndex) => {
    if (!isPlayingRef.current || currentAudioMsgIdRef.current !== msgId) return;
    const queue = sarvamQueueRef.current;
    if (chunkIndex >= queue.length) {
      // Entire message completed
      isPlayingRef.current = false;
      setPlayingAudioId(null);
      setPausedAudioId(null);
      currentAudioMsgIdRef.current = null;
      sarvamQueueRef.current = [];
      return;
    }

    const chunkText = queue[chunkIndex];
    const controller = new AbortController();
    abortControllerRef.current = controller;
    setAudioLoadingId(msgId);

    try {
      const res = await fetch(`${API_BASE_URL}/api/tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: chunkText, language: targetLang }),
        signal: controller.signal,
      });

      if (controller.signal.aborted || !isPlayingRef.current) return;

      if (res.ok) {
        const data = await res.json();
        const audioBase64 = data.audio_base64 || data.audio;
        if (audioBase64 && !controller.signal.aborted && isPlayingRef.current) {
          if (audioPlayerRef.current) {
            try {
              audioPlayerRef.current.pause();
              audioPlayerRef.current.remove();
            } catch (e) {}
            audioPlayerRef.current = null;
          }

          const audioUri = audioBase64.startsWith('data:')
            ? audioBase64
            : `data:audio/wav;base64,${audioBase64}`;
          const player = createAudioPlayer({ uri: audioUri });
          audioPlayerRef.current = player;

          player.addListener('playbackStatusUpdate', (status) => {
            if (status?.didJustFinish) {
              // Current chunk finished: ONLY fetch next chunk if user is still actively listening!
              if (currentAudioMsgIdRef.current === msgId && isPlayingRef.current) {
                const nextIndex = chunkIndex + 1;
                currentChunkIndexRef.current = nextIndex;
                playSarvamChunk(msgId, targetLang, nextIndex);
              }
            }
          });

          player.play();
          setPlayingAudioId(msgId);
          setPausedAudioId(null);
          return;
        }
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.warn('Sarvam chunk error:', err);
      }
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
        setAudioLoadingId(null);
      }
    }

    // Fallback if fetch was interrupted or failed
    if (currentAudioMsgIdRef.current === msgId && isPlayingRef.current && !audioPlayerRef.current) {
      isPlayingRef.current = false;
      setPlayingAudioId(null);
      setPausedAudioId(null);
    }
  };

  // ── Fallback: Play via Sarvam API with 100-character chunking (credit-saving) ──
  const startSarvamFallback = (msgId, cleanedText, targetLang = 'od') => {
    // 100-character chunking to minimize credit usage and start playback instantly
    const chunks = splitTextIntoChunks(cleanedText, 100);
    if (!chunks.length) return;

    audioModeRef.current = 'sarvam';
    sarvamLangRef.current = targetLang;
    sarvamQueueRef.current = chunks;
    currentChunkIndexRef.current = 0;
    isPlayingRef.current = true;
    currentAudioMsgIdRef.current = msgId;

    playSarvamChunk(msgId, targetLang, 0);
  };

  // ── Clean text specifically for crystal-clear, smooth on-device TTS ──────
  const cleanTextForSpeech = (rawText, isOdia = false) => {
    let cleaned = (rawText || '')
      .replace(/<think>[\s\S]*?<\/think>/gi, '')
      .replace(/```[\s\S]*?```/g, '')
      .replace(/https?:\/\/\S+/g, '')
      // Remove all emojis and pictographic symbols
      .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F100}-\u{1F64F}\u{1F680}-\u{1F6FF}]/gu, '')
      // Remove English branding intro that confuses Indian TTS
      .replace(/AgroIntel(\s+AI\s+Assistant)?\s*[-–:]?\s*/gi, '')
      // Remove English parenthetical words like "(seed)" or "(fertilizer)"
      .replace(/\([a-zA-Z\s]+\)/g, '')
      // Remove numbered list markers like "1. ", "2. "
      .replace(/^[0-9]+\.\s*/gm, '')
      // Remove bullet glyphs at start of lines
      .replace(/^[•\-\*]\s*/gm, '')
      // Remove all markdown formatting symbols (bold, italic, headers, backticks, pipes, quotes, bullets)
      .replace(/[*#`_~>|•]/g, ' ')
      .replace(/[–—]/g, '-')
      .replace(/[:;]/g, ', ')
      .replace(/\s+/g, ' ')
      .trim();

    // If Odia, translate common stray English agricultural words so it speaks with natural Odia accent
    if (isOdia) {
      cleaned = cleaned
        .replace(/\bseed\b/gi, 'ବିହନ')
        .replace(/\bfertilizer\b/gi, 'ଖତ')
        .replace(/\bpesticide\b/gi, 'କୀଟନାଶକ')
        .replace(/\bfarmer\b/gi, 'କୃଷକ')
        .replace(/\bhelp\b/gi, 'ସାହାଯ୍ୟ')
        .replace(/\bAI\b/gi, 'ଏଆଇ')
        .replace(/\bAssistant\b/gi, 'ସହାୟକ');
    }

    return cleaned;
  };

  const handleSpeak = async (msgId, text) => {
    // 1. If currently playing this message -> PAUSE IT
    if (playingAudioId === msgId) {
      isPlayingRef.current = false;
      try {
        Speech.stop();
      } catch (e) {}
      if (audioPlayerRef.current) {
        try {
          audioPlayerRef.current.pause();
        } catch (err) {}
      }
      setPlayingAudioId(null);
      setPausedAudioId(msgId);
      return;
    }

    // 2. If currently fetching audio for this message -> CANCEL IT
    if (audioLoadingId === msgId) {
      isPlayingRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      setAudioLoadingId(null);
      setPlayingAudioId(null);
      setPausedAudioId(null);
      return;
    }

    // 3. If audio is paused on this exact message -> RESUME PLAYBACK
    if (currentAudioMsgIdRef.current === msgId) {
      isPlayingRef.current = true;
      if (audioModeRef.current === 'sarvam') {
        // Resume Sarvam audio player or continue from current chunk
        if (audioPlayerRef.current) {
          try {
            audioPlayerRef.current.play();
            setPlayingAudioId(msgId);
            setPausedAudioId(null);
            return;
          } catch (e) {}
        }
        playSarvamChunk(msgId, sarvamLangRef.current || 'od', currentChunkIndexRef.current || 0);
        return;
      }

      // Resume on-device Speech
      try {
        Speech.stop();
        Speech.speak(cleanTextRef.current, {
          language: speechLocaleRef.current,
          rate: 1.0,
          pitch: 1.0,
          onStart: () => setPlayingAudioId(msgId),
          onDone: () => {
            isPlayingRef.current = false;
            setPlayingAudioId(null);
            setPausedAudioId(null);
            currentAudioMsgIdRef.current = null;
          },
          onStopped: () => {
            isPlayingRef.current = false;
          },
          onError: (e) => {
            console.warn('Resume speech error:', e);
            if (speechLocaleRef.current === 'or-IN') {
              hasOdiaVoiceRef.current = false;
              startSarvamFallback(msgId, cleanTextRef.current, 'od');
            } else {
              isPlayingRef.current = false;
              setPlayingAudioId(null);
              setPausedAudioId(null);
              currentAudioMsgIdRef.current = null;
            }
          },
        });
        setPlayingAudioId(msgId);
        setPausedAudioId(null);
        return;
      } catch (err) {
        console.warn('Resume speech error:', err);
        if (speechLocaleRef.current === 'or-IN') {
          hasOdiaVoiceRef.current = false;
          startSarvamFallback(msgId, cleanTextRef.current, 'od');
          return;
        }
      }
    }

    // 4. Starting fresh speech for this or another message -> Stop previous audio
    stopAudio();

    // Smart language detection matching user requirements
    const containsOdia = /[\u0B00-\u0B7F]/.test(text);
    const containsHindi = /[\u0900-\u097F]/.test(text);
    const isOdia = containsOdia || lang === 'od';
    const isHindi = containsHindi || lang === 'hi';

    const cleaned = cleanTextForSpeech(text, isOdia);
    if (!cleaned) return;
    cleanTextRef.current = cleaned;

    // ── 5. ODIA LANGUAGE HANDLING ──────────────────────────────────────────
    // Step A: First check if the device has native Odia TTS
    // Step B: If device HAS TTS -> use expo-speech (100% Free, ₹0 Sarvam API cost)
    // Step C: If device DOES NOT HAVE TTS -> automatically fall back to Sarvam API with 100-character chunking
    if (isOdia) {
      if (hasOdiaVoiceRef.current === null) {
        hasOdiaVoiceRef.current = await checkDeviceHasOdiaVoice();
      }

      if (!hasOdiaVoiceRef.current) {
        console.log('[TTS] Device lacks native Odia TTS. Falling back to Sarvam API with 100-character chunking.');
        startSarvamFallback(msgId, cleaned, 'od');
        return;
      }

      console.log('[TTS] Device has native Odia TTS. Speaking via expo-speech (or-IN).');
      speechLocaleRef.current = 'or-IN';
      audioModeRef.current = 'speech';
      isPlayingRef.current = true;
      currentAudioMsgIdRef.current = msgId;
      setPlayingAudioId(msgId);
      setPausedAudioId(null);
      setAudioLoadingId(null);

      try {
        Speech.stop();
        Speech.speak(cleaned, {
          language: 'or-IN',
          rate: 1.0,
          pitch: 1.0,
          onStart: () => setPlayingAudioId(msgId),
          onDone: () => {
            isPlayingRef.current = false;
            setPlayingAudioId(null);
            setPausedAudioId(null);
            currentAudioMsgIdRef.current = null;
          },
          onStopped: () => {
            isPlayingRef.current = false;
          },
          onError: (e) => {
            console.warn('[Speech] Device Odia TTS failed:', e, '-> Falling back to Sarvam API with 100 chunking');
            hasOdiaVoiceRef.current = false;
            startSarvamFallback(msgId, cleaned, 'od');
          },
        });
      } catch (err) {
        console.warn('[Speech] Device Odia TTS invocation error:', err, '-> Falling back to Sarvam API with 100 chunking');
        hasOdiaVoiceRef.current = false;
        startSarvamFallback(msgId, cleaned, 'od');
      }
      return;
    }

    // ── 6. HINDI & ENGLISH ON-DEVICE SPEECH (100% Free) ───────────────────
    const speechLocale = isHindi ? 'hi-IN' : 'en-US';
    speechLocaleRef.current = speechLocale;
    audioModeRef.current = 'speech';

    isPlayingRef.current = true;
    currentAudioMsgIdRef.current = msgId;
    setPlayingAudioId(msgId);
    setPausedAudioId(null);
    setAudioLoadingId(null);

    try {
      Speech.stop();
      Speech.speak(cleaned, {
        language: speechLocale,
        rate: 1.0,
        pitch: 1.0,
        onStart: () => setPlayingAudioId(msgId),
        onDone: () => {
          isPlayingRef.current = false;
          setPlayingAudioId(null);
          setPausedAudioId(null);
          currentAudioMsgIdRef.current = null;
        },
        onStopped: () => {
          isPlayingRef.current = false;
        },
        onError: (e) => {
          console.warn('Speech error for locale', speechLocale, e);
          isPlayingRef.current = false;
          setPlayingAudioId(null);
          setPausedAudioId(null);
          currentAudioMsgIdRef.current = null;
        },
      });
    } catch (err) {
      console.warn('Speech speak error:', err);
      isPlayingRef.current = false;
      setPlayingAudioId(null);
    }
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
    stopAudio();
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

        // Safe conversion of audio URI to Blob for React Native
        let blob;
        try {
          // Method 1: Blob upload with writable properties
          let blob;
          try {
            const fileRes = await fetch(uri);
            blob = await fileRes.blob();
          } catch (e) {
            blob = await new Promise((resolve, reject) => {
              const xhr = new XMLHttpRequest();
              xhr.onload = () => resolve(xhr.response);
              xhr.onerror = () => reject(new Error('Failed to read audio data'));
              xhr.responseType = 'blob';
              xhr.open('GET', uri, true);
              xhr.send(null);
            });
          }

          try {
            Object.defineProperty(blob, 'name', {
              value: filename,
              writable: true,
              configurable: true,
              enumerable: true,
            });
          } catch (e) {}

          try {
            Object.defineProperty(blob, 'type', {
              value: 'audio/m4a',
              writable: true,
              configurable: true,
              enumerable: true,
            });
          } catch (e) {}

          const formData = new FormData();
          formData.append('audio', blob, filename);
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
        } catch (fetchErr) {
          // Method 2: XHR fallback
          const data = await new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open('POST', `${API_BASE_URL}/api/stt`);
            xhr.onload = () => {
              if (xhr.status >= 200 && xhr.status < 300) {
                try {
                  resolve(JSON.parse(xhr.responseText));
                } catch (e) {
                  resolve(xhr.responseText);
                }
              } else {
                reject(new Error(`STT failed: ${xhr.status}`));
              }
            };
            xhr.onerror = () => reject(new Error('STT network error'));
            const nativeFormData = new FormData();
            nativeFormData.append('audio', {
              uri,
              name: filename,
              type: 'audio/m4a',
            });
            nativeFormData.append('language', lang);
            xhr.send(nativeFormData);
          });

          if (data?.transcript) {
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
          audioLoadingId={audioLoadingId}
          pausedAudioId={pausedAudioId}
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
