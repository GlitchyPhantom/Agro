import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { createAudioPlayer } from 'expo-audio';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../config';
import colors from '../theme/colors';
import LanguageSelector from '../components/LanguageSelector';

export default function ScannerScreen() {
  const { user } = useAuth();
  const [imageUri, setImageUri] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [lang, setLang] = useState('en');
  const [translatedAdvisory, setTranslatedAdvisory] = useState(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const playerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (playerRef.current) {
        playerRef.current.remove();
        playerRef.current = null;
      }
    };
  }, []);

  const pickImage = async (useCamera = false) => {
    try {
      let res;
      if (useCamera) {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Denied', 'Camera permission is needed to take crop photos.');
          return;
        }
        res = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [4, 3],
          quality: 0.8,
        });
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Denied', 'Gallery permission is needed to select crop photos.');
          return;
        }
        res = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [4, 3],
          quality: 0.8,
        });
      }

      if (!res.canceled && res.assets && res.assets.length > 0) {
        setImageUri(res.assets[0].uri);
        setResult(null);
        setTranslatedAdvisory(null);
        if (playerRef.current) {
          playerRef.current.remove();
          playerRef.current = null;
          setIsPlayingAudio(false);
        }
      }
    } catch (err) {
      console.warn('Image pick error:', err);
    }
  };

  const handleScan = async () => {
    if (!imageUri) return;
    setLoading(true);

    try {
      const formData = new FormData();
      const filename = imageUri.split('/').pop() || 'leaf.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : `image/jpeg`;

      formData.append('file', {
        uri: imageUri,
        name: filename,
        type,
      });

      const headers = {};
      if (user?.id) headers['X-User-Id'] = user.id;

      const res = await fetch(`${API_BASE_URL}/api/predict`, {
        method: 'POST',
        headers,
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || 'Prediction failed');
      }

      const data = await res.json();
      setResult(data);
    } catch (err) {
      Alert.alert('Scan Failed', err.message || 'Could not analyze image. Check backend connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleLangChange = async (newLang) => {
    setLang(newLang);
    if (!result?.advisory || newLang === 'en') {
      setTranslatedAdvisory(null);
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/translate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: result.advisory,
          source_lang: 'en',
          target_lang: newLang,
        }),
      });
      if (res.ok) {
        const trans = await res.json();
        setTranslatedAdvisory(trans.translated_text);
      }
    } catch (err) {
      console.warn('Translation error:', err);
    }
  };

  const handleSpeak = async (textToSpeak) => {
    if (!textToSpeak) return;
    try {
      if (playerRef.current) {
        playerRef.current.pause();
        playerRef.current.remove();
        playerRef.current = null;
        setIsPlayingAudio(false);
        return;
      }

      setIsPlayingAudio(true);
      const res = await fetch(`${API_BASE_URL}/api/tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: textToSpeak,
          language: lang,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.audio) {
          const player = createAudioPlayer({
            uri: `data:audio/wav;base64,${data.audio}`,
          });
          playerRef.current = player;
          player.addListener('playbackStatusUpdate', (status) => {
            if (status?.didJustFinish || !status?.playing) {
              setIsPlayingAudio(false);
            }
          });
          player.play();
        } else {
          setIsPlayingAudio(false);
        }
      } else {
        setIsPlayingAudio(false);
      }
    } catch (err) {
      console.warn('TTS error:', err);
      setIsPlayingAudio(false);
    }
  };

  const parseAdvisory = (text) => {
    if (!text) return null;
    try {
      const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      return JSON.parse(cleaned);
    } catch {
      return null;
    }
  };

  const parsedAdv = result?.advisory ? parseAdvisory(result.advisory) : null;
  const isHealthy =
    result?.disease?.toLowerCase().includes('healthy') ||
    result?.severity?.toLowerCase() === 'healthy';

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg.primary} />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerBrand}>
          <Ionicons name="scan" size={22} color={colors.accent.bright} />
          <Text style={styles.headerTitle}>Disease Scanner</Text>
        </View>
        <LanguageSelector currentLang={lang} onSelectLang={handleLangChange} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {!imageUri ? (
          /* Empty / Picker State */
          <View style={styles.uploadCard}>
            <View style={styles.uploadIconWrap}>
              <Ionicons name="camera" size={36} color={colors.accent.primary} />
            </View>
            <Text style={styles.uploadTitle}>Capture or Upload Leaf</Text>
            <Text style={styles.uploadSubtitle}>
              Take a clear picture of the crop leaf showing any spots or signs of disease
            </Text>

            <View style={styles.pickerBtnsRow}>
              <TouchableOpacity
                style={styles.pickerBtnPrimary}
                onPress={() => pickImage(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="camera-outline" size={20} color="#fff" />
                <Text style={styles.pickerBtnText}>Take Photo</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.pickerBtnSecondary}
                onPress={() => pickImage(false)}
                activeOpacity={0.8}
              >
                <Ionicons name="images-outline" size={20} color="#fff" />
                <Text style={styles.pickerBtnText}>Gallery</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          /* Preview & Analysis State */
          <View>
            <View style={styles.previewContainer}>
              <Image source={{ uri: imageUri }} style={styles.previewImage} resizeMode="cover" />
              <TouchableOpacity
                style={styles.changeImgBtn}
                onPress={() => pickImage(false)}
                activeOpacity={0.8}
              >
                <Ionicons name="refresh-outline" size={16} color="#fff" />
                <Text style={styles.changeImgText}>Change</Text>
              </TouchableOpacity>
            </View>

            {!result && (
              <TouchableOpacity
                style={[styles.analyzeBtn, loading && styles.btnDisabled]}
                onPress={handleScan}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Ionicons name="sparkles" size={20} color="#fff" />
                    <Text style={styles.analyzeBtnText}>Analyze with AI</Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            {/* Prediction Results */}
            {result && (
              <View style={styles.resultCard}>
                {/* Result Header */}
                <View style={styles.resultHead}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.resultDisease}>
                      {result.disease?.replace(/___/g, ' - ')?.replace(/_/g, ' ')}
                    </Text>
                    <Text style={styles.resultConfidence}>
                      Confidence: {Math.round((result.confidence || 0) * 100)}%
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.severityPill,
                      {
                        backgroundColor: isHealthy
                          ? colors.severity.healthyBg
                          : colors.severity.moderateBg,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.severityPillText,
                        {
                          color: isHealthy
                            ? colors.severity.healthy
                            : colors.severity.moderate,
                        },
                      ]}
                    >
                      {result.severity || (isHealthy ? 'Healthy' : 'Detected')}
                    </Text>
                  </View>
                </View>

                {/* Top Predictions Bar */}
                {result.predictions && (
                  <View style={styles.predictionsBox}>
                    <Text style={styles.sectionLabel}>Top Predictions</Text>
                    {result.predictions.map((p, idx) => (
                      <View key={idx} style={styles.predRow}>
                        <Text style={styles.predName} numberOfLines={1}>
                          {p.class_name?.replace(/___/g, ' - ')?.replace(/_/g, ' ')}
                        </Text>
                        <Text style={styles.predPercent}>
                          {Math.round((p.confidence || 0) * 100)}%
                        </Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Advisory Audio Button */}
                <TouchableOpacity
                  style={styles.audioBtn}
                  onPress={() =>
                    handleSpeak(
                      translatedAdvisory ||
                        parsedAdv?.symptoms ||
                        result.advisory
                    )
                  }
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={isPlayingAudio ? 'stop-circle-outline' : 'volume-high-outline'}
                    size={20}
                    color={colors.accent.bright}
                  />
                  <Text style={styles.audioBtnText}>
                    {isPlayingAudio ? 'Stop Audio' : 'Listen Advisory'}
                  </Text>
                </TouchableOpacity>

                {/* Advisory Cards */}
                {translatedAdvisory ? (
                  <View style={styles.advCard}>
                    <Text style={styles.advTitle}>Advisory ({lang.toUpperCase()})</Text>
                    <Text style={styles.advBody}>{translatedAdvisory}</Text>
                  </View>
                ) : parsedAdv ? (
                  <View style={styles.advGroup}>
                    {parsedAdv.symptoms && (
                      <View style={styles.advCard}>
                        <Text style={styles.advTitle}>Symptoms & Cause</Text>
                        <Text style={styles.advBody}>{parsedAdv.symptoms}</Text>
                      </View>
                    )}
                    {parsedAdv.organic_treatment && (
                      <View style={styles.advCard}>
                        <Text style={styles.advTitle}>🌱 Organic Treatment</Text>
                        <Text style={styles.advBody}>{parsedAdv.organic_treatment}</Text>
                      </View>
                    )}
                    {parsedAdv.chemical_treatment && (
                      <View style={styles.advCard}>
                        <Text style={styles.advTitle}>🧪 Chemical Treatment</Text>
                        <Text style={styles.advBody}>{parsedAdv.chemical_treatment}</Text>
                      </View>
                    )}
                    {parsedAdv.prevention && (
                      <View style={styles.advCard}>
                        <Text style={styles.advTitle}>🛡️ Prevention</Text>
                        <Text style={styles.advBody}>{parsedAdv.prevention}</Text>
                      </View>
                    )}
                  </View>
                ) : result.advisory ? (
                  <View style={styles.advCard}>
                    <Text style={styles.advTitle}>AI Advisory</Text>
                    <Text style={styles.advBody}>{result.advisory}</Text>
                  </View>
                ) : null}

                {/* Reset button */}
                <TouchableOpacity
                  style={styles.resetBtn}
                  onPress={() => {
                    setImageUri(null);
                    setResult(null);
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.resetBtnText}>Scan Another Leaf</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg.primary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.default,
  },
  headerBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  uploadCard: {
    backgroundColor: colors.bg.card,
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border.default,
    marginTop: 20,
  },
  uploadIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  uploadTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 8,
  },
  uploadSubtitle: {
    fontSize: 13,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  pickerBtnsRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  pickerBtnPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.accent.primary,
    paddingVertical: 14,
    borderRadius: 12,
  },
  pickerBtnSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.bg.primary,
    borderWidth: 1,
    borderColor: colors.border.default,
    paddingVertical: 14,
    borderRadius: 12,
  },
  pickerBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  previewContainer: {
    borderRadius: 18,
    overflow: 'hidden',
    position: 'relative',
    height: 280,
    backgroundColor: colors.bg.card,
    marginBottom: 16,
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  changeImgBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  changeImgText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  analyzeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.accent.primary,
    paddingVertical: 16,
    borderRadius: 14,
    shadowColor: colors.accent.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
    marginBottom: 20,
  },
  analyzeBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  btnDisabled: {
    opacity: 0.6,
  },
  resultCard: {
    backgroundColor: colors.bg.card,
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  resultHead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
    paddingBottom: 14,
  },
  resultDisease: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
  },
  resultConfidence: {
    color: colors.text.secondary,
    fontSize: 13,
    marginTop: 4,
  },
  severityPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  severityPillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  predictionsBox: {
    marginBottom: 16,
  },
  sectionLabel: {
    color: colors.text.muted,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  predRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  predName: {
    color: colors.text.secondary,
    fontSize: 13,
    flex: 1,
    marginRight: 8,
  },
  predPercent: {
    color: colors.accent.bright,
    fontSize: 13,
    fontWeight: '600',
  },
  audioBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    marginBottom: 16,
    alignSelf: 'flex-start',
  },
  audioBtnText: {
    color: colors.accent.bright,
    fontSize: 13,
    fontWeight: '700',
  },
  advGroup: {
    gap: 12,
  },
  advCard: {
    backgroundColor: colors.bg.primary,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border.default,
    marginBottom: 10,
  },
  advTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 6,
  },
  advBody: {
    color: colors.text.secondary,
    fontSize: 13,
    lineHeight: 19,
  },
  resetBtn: {
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border.default,
    marginTop: 14,
  },
  resetBtnText: {
    color: colors.text.secondary,
    fontSize: 14,
    fontWeight: '600',
  },
});
