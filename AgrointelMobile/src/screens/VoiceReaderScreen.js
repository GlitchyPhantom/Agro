import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import colors from '../theme/colors';

const LANGUAGES = [
  { id: 'hi-IN', label: 'Hindi', flag: '🇮🇳', sample: 'नमस्ते! आपकी फसल में रोग नियंत्रण के लिए अनुशंसित दवा का छिड़काव करें और मिट्टी में उचित नमी बनाए रखें।' },
  { id: 'or-IN', label: 'Odia', flag: '🇮🇳', sample: 'ନମସ୍କାର! ଆପଣଙ୍କ ଫସଲରେ ରୋଗ ନିୟନ୍ତ୍ରଣ ପାଇଁ ଔଷଧ ସ୍ପ୍ରେ କରନ୍ତୁ ଏବଂ କୃଷି ବିଶେଷଜ୍ଞଙ୍କ ପରାମର୍ଶ ନିଅନ୍ତୁ।' },
  { id: 'en-US', label: 'English', flag: '🇬🇧', sample: 'Hello farmer! Monitor your crops regularly for early signs of disease and maintain healthy soil moisture.' },
  { id: 'bn-IN', label: 'Bengali', flag: '🇮🇳', sample: 'নমস্কার! আপনার ফসলে রোগ নিয়ন্ত্রণের জন্য সঠিক কীটনাশক স্প্রে করুন এবং মাটির আর্দ্রতা পরীক্ষা করুন।' },
  { id: 'te-IN', label: 'Telugu', flag: '🇮🇳', sample: 'నమస్కారం! పంటలకు తెగుళ్ల నివారణ కోసం సిఫార్సు చేసిన మందులను పిచికారీ చేయండి.' },
];

export default function VoiceReaderScreen({ navigation }) {
  const [selectedLang, setSelectedLang] = useState('hi-IN');
  const [text, setText] = useState(LANGUAGES[0].sample);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [rate, setRate] = useState(1.0);
  const [pitch, setPitch] = useState(1.0);
  const [availableVoices, setAvailableVoices] = useState([]);
  const [showVoices, setShowVoices] = useState(false);

  const textRef = useRef(text);
  textRef.current = text;

  // Cleanup on screen unmount
  useEffect(() => {
    return () => {
      try {
        Speech.stop();
      } catch (e) {}
    };
  }, []);

  // Fetch device voices on mount
  useEffect(() => {
    const fetchVoices = async () => {
      try {
        const voices = await Speech.getAvailableVoicesAsync();
        if (voices && voices.length > 0) {
          setAvailableVoices(voices);
        }
      } catch (e) {
        console.log('Voices list note:', e.message);
      }
    };
    fetchVoices();
  }, []);

  const handleSelectLanguage = (langObj) => {
    // If currently playing, stop
    handleStop();
    setSelectedLang(langObj.id);
    setText(langObj.sample);
  };

  const handlePlay = () => {
    const trimmed = text.trim();
    if (!trimmed) {
      Alert.alert('Empty Text', 'Please enter or select some text to speak.');
      return;
    }

    try {
      Speech.stop();
    } catch (e) {}

    setIsPlaying(true);
    setIsPaused(false);

    try {
      Speech.speak(trimmed, {
        language: selectedLang,
        rate: rate,
        pitch: pitch,
        onStart: () => {
          setIsPlaying(true);
          setIsPaused(false);
        },
        onDone: () => {
          setIsPlaying(false);
          setIsPaused(false);
        },
        onStopped: () => {
          setIsPlaying(false);
        },
        onError: (err) => {
          console.warn('Speech error:', err);
          setIsPlaying(false);
          setIsPaused(false);
          Alert.alert(
            'Speech Notice',
            `Could not play audio with voice '${selectedLang}'. If Odia is not pre-installed, you can install the language pack in Android Settings -> Accessibility -> Text-to-Speech.`
          );
        },
      });
    } catch (err) {
      console.warn('Speech speak exception:', err);
      setIsPlaying(false);
      setIsPaused(false);
    }
  };

  const handlePause = () => {
    // On Android/iOS/Web: Speech.stop() halts current audio
    try {
      Speech.stop();
    } catch (e) {}
    setIsPlaying(false);
    setIsPaused(true);
  };

  const handleResume = () => {
    // Replay from start or resume
    handlePlay();
  };

  const handleStop = () => {
    try {
      Speech.stop();
    } catch (e) {}
    setIsPlaying(false);
    setIsPaused(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0B1218" />

      {/* ── Top Header ── */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            handleStop();
            navigation.goBack();
          }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
        </TouchableOpacity>

        <View style={styles.headerTitles}>
          <Text style={styles.headerTitle}>Free Voice Reader</Text>
          <Text style={styles.headerSubtitle}>Device Engine • 100% Free • ₹0 Sarvam</Text>
        </View>

        <View style={styles.freeBadge}>
          <Ionicons name="sparkles" size={12} color="#10B981" />
          <Text style={styles.freeBadgeText}>₹0 API Cost</Text>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Explanatory Banner ── */}
        <View style={styles.infoBanner}>
          <View style={styles.infoIconBox}>
            <Ionicons name="shield-checkmark" size={20} color="#10B981" />
          </View>
          <View style={styles.infoTextCol}>
            <Text style={styles.infoTitle}>Zero Sarvam Credits Used</Text>
            <Text style={styles.infoDesc}>
              This reader uses your device’s built-in text-to-speech engine (Android Google TTS / iOS Voice).
              It never calls external cloud APIs, so your balance will never decrease.
            </Text>
          </View>
        </View>

        {/* ── Language Selector Pills ── */}
        <Text style={styles.sectionHeading}>Select Language</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.langPillsRow}
        >
          {LANGUAGES.map((item) => {
            const isSelected = selectedLang === item.id;
            return (
              <TouchableOpacity
                key={item.id}
                style={[styles.langPill, isSelected && styles.langPillActive]}
                onPress={() => handleSelectLanguage(item)}
                activeOpacity={0.75}
              >
                <Text style={styles.langFlag}>{item.flag}</Text>
                <Text style={[styles.langLabel, isSelected && styles.langLabelActive]}>
                  {item.label}
                </Text>
                {isSelected && (
                  <Ionicons name="checkmark-circle" size={14} color="#10B981" style={{ marginLeft: 4 }} />
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* ── Text Input Card ── */}
        <View style={styles.inputCard}>
          <View style={styles.inputHeader}>
            <Text style={styles.inputLabel}>Input Text to Speak</Text>
            <View style={styles.inputActions}>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => setText('')}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <Ionicons name="trash-outline" size={15} color="#94A3B8" />
                <Text style={styles.actionBtnText}>Clear</Text>
              </TouchableOpacity>
            </View>
          </View>

          <TextInput
            style={styles.textInput}
            multiline
            numberOfLines={6}
            placeholder="Type or paste any text in Hindi, Odia, English, etc..."
            placeholderTextColor="#64748B"
            value={text}
            onChangeText={setText}
            textAlignVertical="top"
          />

          <View style={styles.inputFooter}>
            <Text style={styles.charCountText}>
              {text.length} characters • <Text style={{ color: '#10B981', fontWeight: 'bold' }}>Free ₹0</Text>
            </Text>
            <Text style={styles.engineText}>Engine: expo-speech</Text>
          </View>
        </View>

        {/* ── Audio Control Center ── */}
        <View style={styles.controlCard}>
          {/* Status Indicator */}
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, isPlaying && styles.statusDotActive]} />
            <Text style={styles.statusText}>
              {isPlaying
                ? `Speaking in ${LANGUAGES.find(l => l.id === selectedLang)?.label || selectedLang}...`
                : isPaused
                ? 'Audio Paused'
                : 'Ready to Play'}
            </Text>
          </View>

          {/* Big Action Buttons */}
          <View style={styles.mainControlsRow}>
            {isPlaying ? (
              <TouchableOpacity
                style={[styles.primaryBtn, styles.pauseBtn]}
                onPress={handlePause}
                activeOpacity={0.8}
              >
                <Ionicons name="pause" size={24} color="#FFFFFF" />
                <Text style={styles.primaryBtnText}>Pause Audio</Text>
              </TouchableOpacity>
            ) : isPaused ? (
              <TouchableOpacity
                style={[styles.primaryBtn, styles.playBtn]}
                onPress={handleResume}
                activeOpacity={0.8}
              >
                <Ionicons name="play" size={24} color="#FFFFFF" />
                <Text style={styles.primaryBtnText}>Resume Audio</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.primaryBtn, styles.playBtn]}
                onPress={handlePlay}
                activeOpacity={0.8}
              >
                <Ionicons name="play" size={24} color="#FFFFFF" />
                <Text style={styles.primaryBtnText}>Play Free Audio</Text>
              </TouchableOpacity>
            )}

            {(isPlaying || isPaused) && (
              <TouchableOpacity
                style={styles.stopBtn}
                onPress={handleStop}
                activeOpacity={0.8}
              >
                <Ionicons name="stop" size={22} color="#EF4444" />
                <Text style={styles.stopBtnText}>Stop</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Speed / Rate Selector */}
          <View style={styles.speedRow}>
            <Text style={styles.rateTitle}>Speech Rate:</Text>
            {[0.8, 1.0, 1.25].map((s) => (
              <TouchableOpacity
                key={s}
                style={[styles.ratePill, rate === s && styles.ratePillActive]}
                onPress={() => {
                  setRate(s);
                  if (isPlaying) {
                    handlePlay();
                  }
                }}
              >
                <Text style={[styles.ratePillText, rate === s && styles.ratePillTextActive]}>
                  {s === 1.0 ? 'Normal (1.0x)' : `${s}x`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── Preset Sample Cards ── */}
        <Text style={styles.sectionHeading}>Quick Test Samples</Text>
        <View style={styles.samplesGrid}>
          {LANGUAGES.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.sampleCard,
                selectedLang === item.id && styles.sampleCardActive,
              ]}
              onPress={() => {
                handleStop();
                setSelectedLang(item.id);
                setText(item.sample);
              }}
              activeOpacity={0.75}
            >
              <View style={styles.sampleTopRow}>
                <Text style={styles.sampleFlag}>{item.flag}</Text>
                <Text style={styles.sampleLangName}>{item.label}</Text>
                <Ionicons name="arrow-forward-circle-outline" size={16} color="#10B981" />
              </View>
              <Text style={styles.sampleSnippet} numberOfLines={2}>
                {item.sample}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Installed Voices Inspector ── */}
        <TouchableOpacity
          style={styles.voicesAccordion}
          onPress={() => setShowVoices(!showVoices)}
          activeOpacity={0.7}
        >
          <View style={styles.voicesAccordionLeft}>
            <Ionicons name="hardware-chip-outline" size={18} color="#94A3B8" />
            <Text style={styles.voicesAccordionTitle}>
              Device TTS Voices ({availableVoices.length} detected)
            </Text>
          </View>
          <Ionicons
            name={showVoices ? 'chevron-up' : 'chevron-down'}
            size={18}
            color="#94A3B8"
          />
        </TouchableOpacity>

        {showVoices && (
          <View style={styles.voicesListCard}>
            {availableVoices.length === 0 ? (
              <Text style={styles.emptyVoicesText}>
                Default system TTS engine active. You can install Indian language voice packs in Android Settings &gt; System &gt; Language &gt; Text-to-speech output.
              </Text>
            ) : (
              availableVoices.slice(0, 8).map((v, i) => (
                <View key={v.identifier || i} style={styles.voiceRow}>
                  <Text style={styles.voiceName}>{v.name || v.identifier}</Text>
                  <Text style={styles.voiceLang}>{v.language || 'auto'}</Text>
                </View>
              ))
            )}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B1218',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#16222F',
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#16222F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitles: {
    flex: 1,
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 1,
  },
  freeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#064E3B',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#059669',
  },
  freeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#10B981',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  infoBanner: {
    flexDirection: 'row',
    backgroundColor: '#0F291E',
    borderWidth: 1,
    borderColor: '#059669',
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
    alignItems: 'flex-start',
    gap: 12,
  },
  infoIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#064E3B',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  infoTextCol: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#10B981',
    marginBottom: 2,
  },
  infoDesc: {
    fontSize: 12,
    color: '#94A3B8',
    lineHeight: 17,
  },
  sectionHeading: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  langPillsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
    paddingBottom: 2,
  },
  langPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#16222F',
    borderWidth: 1,
    borderColor: '#233549',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 22,
    gap: 6,
  },
  langPillActive: {
    backgroundColor: '#0F291E',
    borderColor: '#10B981',
  },
  langFlag: {
    fontSize: 16,
  },
  langLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94A3B8',
  },
  langLabelActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  inputCard: {
    backgroundColor: '#121C26',
    borderWidth: 1,
    borderColor: '#1E3044',
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
  },
  inputHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#E2E8F0',
  },
  inputActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#1B2A3B',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  actionBtnText: {
    fontSize: 11,
    color: '#94A3B8',
  },
  textInput: {
    backgroundColor: '#0B1218',
    borderWidth: 1,
    borderColor: '#1F3144',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: '#FFFFFF',
    minHeight: 110,
    lineHeight: 20,
  },
  inputFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  charCountText: {
    fontSize: 11,
    color: '#94A3B8',
  },
  engineText: {
    fontSize: 11,
    color: '#64748B',
  },
  controlCard: {
    backgroundColor: '#121C26',
    borderWidth: 1,
    borderColor: '#1E3044',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#64748B',
  },
  statusDotActive: {
    backgroundColor: '#10B981',
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#E2E8F0',
  },
  mainControlsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  primaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  playBtn: {
    backgroundColor: '#10B981',
  },
  pauseBtn: {
    backgroundColor: '#F59E0B',
  },
  primaryBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  stopBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 16,
    backgroundColor: '#2A181C',
    borderWidth: 1,
    borderColor: '#EF4444',
    borderRadius: 12,
  },
  stopBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#EF4444',
  },
  speedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#1A2939',
    paddingTop: 12,
  },
  rateTitle: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
  },
  ratePill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#1A2939',
  },
  ratePillActive: {
    backgroundColor: '#0F291E',
    borderWidth: 1,
    borderColor: '#10B981',
  },
  ratePillText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
  },
  ratePillTextActive: {
    color: '#10B981',
    fontWeight: '700',
  },
  samplesGrid: {
    gap: 8,
    marginBottom: 20,
  },
  sampleCard: {
    backgroundColor: '#121C26',
    borderWidth: 1,
    borderColor: '#1E3044',
    borderRadius: 12,
    padding: 12,
  },
  sampleCardActive: {
    borderColor: '#10B981',
    backgroundColor: '#0F221B',
  },
  sampleTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  sampleFlag: {
    fontSize: 14,
  },
  sampleLangName: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  sampleSnippet: {
    fontSize: 12,
    color: '#94A3B8',
    lineHeight: 17,
  },
  voicesAccordion: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#121C26',
    borderWidth: 1,
    borderColor: '#1E3044',
    borderRadius: 12,
    padding: 14,
  },
  voicesAccordionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  voicesAccordionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94A3B8',
  },
  voicesListCard: {
    backgroundColor: '#0B1218',
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: '#1E3044',
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    padding: 12,
    gap: 6,
  },
  emptyVoicesText: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 16,
  },
  voiceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#16222F',
  },
  voiceName: {
    fontSize: 12,
    color: '#CBD5E1',
  },
  voiceLang: {
    fontSize: 11,
    color: '#64748B',
  },
});
