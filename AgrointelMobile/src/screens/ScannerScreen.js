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
  Modal,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { createAudioPlayer } from 'expo-audio';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useDrawer } from '../context/DrawerContext';
import { supabase } from '../lib/supabase';
import { API_BASE_URL } from '../config';
import colors from '../theme/colors';
import LanguageSelector from '../components/LanguageSelector';

export default function ScannerScreen() {
  const { user } = useAuth();
  const navigation = useNavigation();
  const { openDrawer } = useDrawer();

  const [imageUri, setImageUri] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [lang, setLang] = useState('en');
  const [translatedAdvisory, setTranslatedAdvisory] = useState(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const playerRef = useRef(null);

  // Farm Plots state
  const [plots, setPlots] = useState([]);
  const [selectedPlotId, setSelectedPlotId] = useState('');
  const [plotPickerVisible, setPlotPickerVisible] = useState(false);

  useEffect(() => {
    return () => {
      if (playerRef.current) {
        playerRef.current.remove();
        playerRef.current = null;
      }
    };
  }, []);

  // Fetch plots for personalized treatment
  useEffect(() => {
    async function loadPlots() {
      if (!user?.id) return;
      try {
        const { data, error } = await supabase
          .from('farm_plots')
          .select('*')
          .eq('user_id', user.id);
        if (!error && data && data.length > 0) {
          setPlots(data);
          if (!selectedPlotId) {
            setSelectedPlotId(data[0].id);
          }
        }
      } catch (err) {
        console.warn('Could not load plots in scanner:', err);
      }
    }
    loadPlots();
  }, [user?.id]);

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
          mediaTypes: ['images'],
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
          mediaTypes: ['images'],
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

  // Convert local URI to Blob safely (handles React Native / Android schemes)
  const uriToBlob = async (uri) => {
    try {
      const res = await fetch(uri);
      const blob = await res.blob();
      if (blob && blob.size > 0) {
        return blob;
      }
    } catch (fetchErr) {
      console.log('fetch(uri) blob failed, falling back to XHR:', fetchErr);
    }

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.onload = () => resolve(xhr.response);
      xhr.onerror = () => reject(new Error('Failed to read image binary from device'));
      xhr.responseType = 'blob';
      xhr.open('GET', uri, true);
      xhr.send(null);
    });
  };

  const handleScan = async () => {
    if (!imageUri) return;
    setLoading(true);

    try {
      const filename = imageUri.split('/').pop() || 'leaf.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1].toLowerCase()}` : 'image/jpeg';

      const headers = {};
      if (user?.id) headers['X-User-Id'] = user.id;
      if (selectedPlotId) headers['X-Plot-Id'] = selectedPlotId;

      let data;

      // Method 1: Try modern Blob upload with writable property descriptor
      try {
        const blob = await uriToBlob(imageUri);

        // Predefine writable name and type so normalizeArgs doesn't fail on getters
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
            value: type,
            writable: true,
            configurable: true,
            enumerable: true,
          });
        } catch (e) {}

        const formData = new FormData();
        formData.append('file', blob, filename);
        if (selectedPlotId) {
          formData.append('plot_id', selectedPlotId);
        }

        const res = await fetch(`${API_BASE_URL}/api/predict`, {
          method: 'POST',
          headers,
          body: formData,
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.detail || `Server returned status ${res.status}`);
        }

        data = await res.json();
      } catch (fetchErr) {
        console.warn('Fetch upload encountered issue, using native XHR fallback:', fetchErr.message);

        // Method 2: Fallback to native React Native XMLHttpRequest
        data = await new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open('POST', `${API_BASE_URL}/api/predict`);
          if (user?.id) xhr.setRequestHeader('X-User-Id', user.id);
          if (selectedPlotId) xhr.setRequestHeader('X-Plot-Id', selectedPlotId);

          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              try {
                resolve(JSON.parse(xhr.responseText));
              } catch (parseErr) {
                resolve(xhr.responseText);
              }
            } else {
              try {
                const errJson = JSON.parse(xhr.responseText);
                reject(new Error(errJson.detail || `Server error (${xhr.status})`));
              } catch (e) {
                reject(new Error(`Server error (${xhr.status})`));
              }
            }
          };

          xhr.onerror = () => {
            reject(new Error('Network error. Check backend connection.'));
          };

          // Native React Native format
          const nativeFormData = new FormData();
          nativeFormData.append('file', {
            uri: imageUri,
            name: filename,
            type,
          });
          if (selectedPlotId) {
            nativeFormData.append('plot_id', selectedPlotId);
          }
          xhr.send(nativeFormData);
        });
      }

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

  const resetScan = () => {
    setImageUri(null);
    setResult(null);
    setTranslatedAdvisory(null);
    if (playerRef.current) {
      playerRef.current.remove();
      playerRef.current = null;
      setIsPlayingAudio(false);
    }
  };

  const parsedAdv = result?.advisory ? parseAdvisory(result.advisory) : null;
  const diseaseName = result?.primary_disease || result?.disease || '';
  const isHealthy =
    result?.is_healthy ||
    diseaseName.toLowerCase().includes('healthy') ||
    result?.severity?.toLowerCase() === 'healthy';

  const selectedPlot = plots.find((p) => p.id === selectedPlotId) || result?.plot_info;
  const pres = parsedAdv?.personalized_prescription;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg.primary} />

      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.headerLeftWrap}>
          <TouchableOpacity
            style={styles.hamburgerBtn}
            onPress={openDrawer}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="menu-outline" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerBrand}>
            <Ionicons name="scan" size={20} color={colors.accent.bright} />
            <Text style={styles.headerTitle}>Disease Scanner</Text>
          </View>
        </View>
        <LanguageSelector currentLang={lang} onChangeLang={handleLangChange} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Target Plot Selector (Before Scan) */}
        {!result && (
          <View style={styles.plotSelectorCard}>
            <View style={styles.plotCardHeader}>
              <View style={styles.plotIconBox}>
                <Ionicons name="location" size={18} color={colors.accent.bright} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.plotCardTag}>TARGET FARM PLOT (OPTIONAL)</Text>
                <Text style={styles.plotCardDesc}>
                  Calculate exact spray dosage tailored to your plot
                </Text>
              </View>
            </View>

            <View style={styles.plotActionRow}>
              <TouchableOpacity
                style={styles.plotDropdown}
                onPress={() => setPlotPickerVisible(true)}
                activeOpacity={0.7}
              >
                <Text style={styles.plotDropdownText} numberOfLines={1}>
                  {selectedPlot
                    ? `${selectedPlot.plot_name} (${selectedPlot.area} ${selectedPlot.area_unit || 'Acres'} - ${selectedPlot.crop || 'Crop'})`
                    : 'General Scan (1 Acre standard)'}
                </Text>
                <Ionicons name="chevron-down" size={16} color="#9CA3AF" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.addPlotBtn}
                onPress={() => navigation.navigate('FarmPlots')}
                activeOpacity={0.7}
              >
                <Ionicons name="add" size={16} color={colors.accent.bright} />
                <Text style={styles.addPlotText}>Plots</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Upload Zone & Actions */}
        {!result ? (
          <View style={styles.uploadSection}>
            {imageUri ? (
              <View style={styles.previewContainer}>
                <Image source={{ uri: imageUri }} style={styles.previewImage} resizeMode="cover" />
                <View style={styles.previewOverlayActions}>
                  <TouchableOpacity
                    style={styles.previewChangeBtn}
                    onPress={() => pickImage(false)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="refresh" size={16} color="#FFFFFF" />
                    <Text style={styles.previewChangeText}>Change</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={styles.dropZone}>
                <View style={styles.uploadIconCircle}>
                  <Ionicons name="cloud-upload-outline" size={36} color={colors.accent.bright} />
                </View>
                <Text style={styles.dropZoneTitle}>Capture or Upload Leaf</Text>
                <Text style={styles.dropZoneSubtitle}>
                  Take a clear photo of the diseased leaf under daylight
                </Text>

                <View style={styles.pickerButtonsRow}>
                  <TouchableOpacity
                    style={styles.btnCamera}
                    onPress={() => pickImage(true)}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="camera" size={18} color="#FFFFFF" />
                    <Text style={styles.btnTextWhite}>Camera</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.btnGallery}
                    onPress={() => pickImage(false)}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="images" size={18} color="#FFFFFF" />
                    <Text style={styles.btnTextWhite}>Gallery</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {imageUri && (
              <View style={styles.analyzeActionsRow}>
                <TouchableOpacity
                  style={styles.btnResetSmall}
                  onPress={resetScan}
                  activeOpacity={0.8}
                >
                  <Text style={styles.btnResetSmallText}>Reset</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.btnAnalyze, loading && styles.btnDisabled]}
                  onPress={handleScan}
                  disabled={loading}
                  activeOpacity={0.85}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <>
                      <Ionicons name="sparkles" size={18} color="#FFFFFF" />
                      <Text style={styles.btnAnalyzeText}>Analyze with AI</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        ) : (
          /* ── Results Section (Exact match to Website) ─────────────────── */
          <View style={styles.resultsSection}>
            {/* Primary Result Card */}
            <View style={styles.primaryResultCard}>
              <View style={styles.primaryResultTop}>
                {imageUri && (
                  <Image
                    source={{ uri: imageUri }}
                    style={styles.resultThumbnail}
                    resizeMode="cover"
                  />
                )}
                <View style={styles.resultMeta}>
                  <View style={styles.diseaseTitleRow}>
                    <Ionicons
                      name={isHealthy ? 'checkmark-circle' : 'warning'}
                      size={22}
                      color={isHealthy ? '#10B981' : '#F59E0B'}
                    />
                    <Text style={styles.diseaseTitle} numberOfLines={2}>
                      {diseaseName.replace(/___/g, ' - ').replace(/_/g, ' ') || 'Leaf Analyzed'}
                    </Text>
                  </View>

                  <Text style={styles.confidenceText}>
                    Confidence:{' '}
                    <Text style={styles.confidenceVal}>
                      {result.primary_confidence || result.confidence || 95}%
                    </Text>
                  </Text>

                  <View
                    style={[
                      styles.severityBadge,
                      {
                        backgroundColor: isHealthy
                          ? 'rgba(16, 185, 129, 0.2)'
                          : 'rgba(245, 158, 11, 0.2)',
                        borderColor: isHealthy
                          ? 'rgba(16, 185, 129, 0.4)'
                          : 'rgba(245, 158, 11, 0.4)',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.severityBadgeText,
                        { color: isHealthy ? '#34D399' : '#FBBF24' },
                      ]}
                    >
                      {isHealthy
                        ? '✅ Healthy'
                        : `⚠️ ${(result.severity || 'Moderate').toUpperCase()}`}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Top-3 Predictions with animated percentage bars */}
              {result.predictions && result.predictions.length > 0 && (
                <View style={styles.predictionsContainer}>
                  <Text style={styles.predictionsSectionTitle}>TOP-3 PREDICTIONS</Text>
                  {result.predictions.map((pred, i) => {
                    const label = (pred.label || pred.class_name || '')
                      .replace(/___/g, ' - ')
                      .replace(/_/g, ' ');
                    const conf = Math.min(Math.round(pred.confidence || 0), 100);
                    return (
                      <View key={i} style={styles.predictionRow}>
                        <View style={styles.predLabelRow}>
                          <Text style={styles.predLabel} numberOfLines={1}>
                            {label}
                          </Text>
                          <Text style={styles.predPercent}>{conf}%</Text>
                        </View>
                        <View style={styles.predTrack}>
                          <View style={[styles.predBar, { width: `${conf}%` }]} />
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>

            {/* Audio Speech Bar */}
            {result.advisory && !isHealthy && (
              <View style={styles.audioBar}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.audioBarTitle}>Listen to Treatment Plan</Text>
                  <Text style={styles.audioBarSub}>
                    Read aloud in {lang.toUpperCase()}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.btnAudioPlay}
                  onPress={() =>
                    handleSpeak(
                      translatedAdvisory ||
                        pres?.in_stock_instructions ||
                        pres?.market_recommendation ||
                        result.advisory
                    )
                  }
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={isPlayingAudio ? 'stop-circle' : 'volume-high'}
                    size={20}
                    color="#FFFFFF"
                  />
                  <Text style={styles.btnAudioPlayText}>
                    {isPlayingAudio ? 'Stop Audio' : 'Play Audio'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Personalized Farm Prescription Card (Exact Match to Web) */}
            {pres && (
              <View
                style={[
                  styles.presCard,
                  pres.has_in_stock_remedy ? styles.presCardMatch : styles.presCardMarket,
                ]}
              >
                <View style={styles.presHead}>
                  <View style={styles.presIconBox}>
                    <Ionicons
                      name={pres.has_in_stock_remedy ? 'shield-checkmark' : 'cart'}
                      size={24}
                      color={pres.has_in_stock_remedy ? '#10B981' : '#F59E0B'}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View
                      style={[
                        styles.presBadge,
                        pres.has_in_stock_remedy
                          ? styles.presBadgeGreen
                          : styles.presBadgeYellow,
                      ]}
                    >
                      <Text
                        style={[
                          styles.presBadgeText,
                          { color: pres.has_in_stock_remedy ? '#34D399' : '#FCD34D' },
                        ]}
                      >
                        {pres.has_in_stock_remedy
                          ? '🟢 In-Stock Medicine Match • Money Saved'
                          : '🛒 Local Market Purchase Needed'}
                      </Text>
                    </View>
                    <Text style={styles.presTitle}>
                      {pres.has_in_stock_remedy
                        ? 'Personalized Plot Treatment Plan'
                        : 'Recommended Commercial Remedy'}
                    </Text>
                  </View>
                </View>

                {/* Target Plot Tag */}
                {selectedPlot && (
                  <View style={styles.presPlotTag}>
                    <Text style={styles.presPlotTagLabel}>Prescribed For: </Text>
                    <Text style={styles.presPlotTagVal}>
                      {selectedPlot.plot_name} ({selectedPlot.area} {selectedPlot.area_unit || 'Acres'} - {selectedPlot.crop || 'Plot'})
                    </Text>
                  </View>
                )}

                {/* Matched Items Pills */}
                {pres.has_in_stock_remedy &&
                  pres.matched_items &&
                  pres.matched_items.length > 0 && (
                    <View style={styles.matchedWrap}>
                      <Text style={styles.matchedHeader}>Use Stored Resource:</Text>
                      <View style={styles.matchedChips}>
                        {pres.matched_items.map((item, idx) => (
                          <View key={idx} style={styles.matchedChip}>
                            <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                            <Text style={styles.matchedChipText}>{item}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}

                {/* Prescribed Instructions Box */}
                <View style={styles.presBox}>
                  <Text style={styles.presBoxText}>
                    {translatedAdvisory ||
                      (pres.has_in_stock_remedy
                        ? pres.in_stock_instructions
                        : pres.market_recommendation)}
                  </Text>
                </View>

                {/* Footer connecting to Shed Inventory */}
                <View style={styles.presFooter}>
                  <View style={styles.presFooterLeft}>
                    <Ionicons name="cube-outline" size={15} color={colors.accent.bright} />
                    <Text style={styles.presFooterText}>Connected with your shed inventory</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => navigation.navigate('Inventory')}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.presFooterLink}>Manage Inventory</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Cause & Symptoms Card */}
            {parsedAdv && (parsedAdv.cause || parsedAdv.symptoms) && (
              <View style={styles.detailCard}>
                <View style={styles.detailCardHead}>
                  <Ionicons name="warning-outline" size={18} color="#F59E0B" />
                  <Text style={styles.detailCardTitle}>Cause & Symptoms</Text>
                </View>
                {parsedAdv.cause ? (
                  <Text style={styles.detailCardCause}>{parsedAdv.cause}</Text>
                ) : null}
                {Array.isArray(parsedAdv.symptoms) ? (
                  <View style={styles.bulletList}>
                    {parsedAdv.symptoms.map((s, i) => (
                      <View key={i} style={styles.bulletRow}>
                        <Text style={styles.bulletPoint}>•</Text>
                        <Text style={styles.bulletText}>{s}</Text>
                      </View>
                    ))}
                  </View>
                ) : typeof parsedAdv.symptoms === 'string' ? (
                  <Text style={styles.detailCardCause}>{parsedAdv.symptoms}</Text>
                ) : null}
              </View>
            )}

            {/* Organic Treatment Card */}
            {parsedAdv && parsedAdv.organic_treatment && (
              <View style={styles.detailCard}>
                <View style={styles.detailCardHead}>
                  <Ionicons name="leaf-outline" size={18} color="#10B981" />
                  <Text style={styles.detailCardTitle}>Organic Treatment</Text>
                </View>
                {Array.isArray(parsedAdv.organic_treatment) ? (
                  <View style={styles.bulletList}>
                    {parsedAdv.organic_treatment.map((t, i) => (
                      <View key={i} style={styles.bulletRow}>
                        <Text style={styles.bulletEmoji}>🌿</Text>
                        <Text style={styles.bulletText}>{t}</Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.detailCardCause}>
                    {parsedAdv.organic_treatment}
                  </Text>
                )}
              </View>
            )}

            {/* Chemical Treatment Card */}
            {parsedAdv && parsedAdv.chemical_treatment && (
              <View style={styles.detailCard}>
                <View style={styles.detailCardHead}>
                  <Ionicons name="flask-outline" size={18} color="#60A5FA" />
                  <Text style={styles.detailCardTitle}>Chemical Treatment</Text>
                </View>
                {Array.isArray(parsedAdv.chemical_treatment) ? (
                  <View style={styles.bulletList}>
                    {parsedAdv.chemical_treatment.map((t, i) => (
                      <View key={i} style={styles.bulletRow}>
                        <Text style={styles.bulletEmoji}>💊</Text>
                        <Text style={styles.bulletText}>{t}</Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.detailCardCause}>
                    {parsedAdv.chemical_treatment}
                  </Text>
                )}
              </View>
            )}

            {/* Prevention Card */}
            {parsedAdv && parsedAdv.prevention && (
              <View style={styles.detailCard}>
                <View style={styles.detailCardHead}>
                  <Ionicons name="shield-outline" size={18} color="#34D399" />
                  <Text style={styles.detailCardTitle}>Prevention</Text>
                </View>
                {Array.isArray(parsedAdv.prevention) ? (
                  <View style={styles.bulletList}>
                    {parsedAdv.prevention.map((p, i) => (
                      <View key={i} style={styles.bulletRow}>
                        <Text style={styles.bulletEmoji}>🛡️</Text>
                        <Text style={styles.bulletText}>{p}</Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.detailCardCause}>{parsedAdv.prevention}</Text>
                )}
              </View>
            )}

            {/* Raw Text Advisory Fallback if JSON parsing fails */}
            {!parsedAdv && result.advisory && (
              <View style={styles.detailCard}>
                <View style={styles.detailCardHead}>
                  <Ionicons name="sparkles" size={18} color={colors.accent.bright} />
                  <Text style={styles.detailCardTitle}>AI Advisory</Text>
                </View>
                <Text style={styles.detailCardCause}>
                  {translatedAdvisory || result.advisory}
                </Text>
              </View>
            )}

            {/* Scan Another Image Action */}
            <TouchableOpacity
              style={styles.btnScanAnother}
              onPress={resetScan}
              activeOpacity={0.85}
            >
              <Ionicons name="refresh" size={18} color="#FFFFFF" />
              <Text style={styles.btnScanAnotherText}>Scan Another Leaf</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Target Plot Modal Picker */}
      <Modal
        visible={plotPickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPlotPickerVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Target Farm Plot</Text>
              <TouchableOpacity
                onPress={() => setPlotPickerVisible(false)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            <FlatList
              data={[
                { id: '', plot_name: 'General Scan (1 Acre standard)', area: '1.0', crop: 'Standard' },
                ...plots,
              ]}
              keyExtractor={(item) => item.id || 'general'}
              renderItem={({ item }) => {
                const isSelected = selectedPlotId === item.id;
                return (
                  <TouchableOpacity
                    style={[styles.plotItem, isSelected && styles.plotItemActive]}
                    onPress={() => {
                      setSelectedPlotId(item.id);
                      setPlotPickerVisible(false);
                    }}
                    activeOpacity={0.75}
                  >
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          styles.plotItemName,
                          isSelected && styles.plotItemNameActive,
                        ]}
                      >
                        {item.plot_name}
                      </Text>
                      {item.id ? (
                        <Text style={styles.plotItemSub}>
                          {item.area} {item.area_unit || 'Acres'} • {item.crop || 'Crop'}
                        </Text>
                      ) : null}
                    </View>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                    )}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#080C0A',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1A2620',
  },
  headerLeftWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  hamburgerBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#121C17',
    borderWidth: 1,
    borderColor: '#203027',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },

  // Plot Selector Card
  plotSelectorCard: {
    backgroundColor: '#0F1713',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1E2C24',
    padding: 14,
    marginBottom: 16,
  },
  plotCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  plotIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  plotCardTag: {
    fontSize: 10,
    fontWeight: '700',
    color: '#34D399',
    letterSpacing: 0.8,
  },
  plotCardDesc: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 1,
  },
  plotActionRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  plotDropdown: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#15201A',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#203027',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  plotDropdownText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
    flex: 1,
    marginRight: 8,
  },
  addPlotBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  addPlotText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#34D399',
  },

  // Upload Section
  uploadSection: {
    marginBottom: 16,
  },
  dropZone: {
    backgroundColor: '#0F1713',
    borderRadius: 20,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#23352C',
    alignItems: 'center',
    paddingVertical: 36,
    paddingHorizontal: 20,
  },
  uploadIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  dropZoneTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  dropZoneSubtitle: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 18,
  },
  pickerButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  btnCamera: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#10B981',
    paddingVertical: 13,
    borderRadius: 14,
  },
  btnGallery: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#192620',
    borderWidth: 1,
    borderColor: '#26382E',
    paddingVertical: 13,
    borderRadius: 14,
  },
  btnTextWhite: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Preview State
  previewContainer: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#203027',
    position: 'relative',
    height: 240,
    backgroundColor: '#000000',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  previewOverlayActions: {
    position: 'absolute',
    top: 12,
    right: 12,
  },
  previewChangeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  previewChangeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  analyzeActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  btnResetSmall: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#141E19',
    borderWidth: 1,
    borderColor: '#203027',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnResetSmallText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  btnAnalyze: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#10B981',
    borderRadius: 14,
    paddingVertical: 14,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  btnAnalyzeText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  btnDisabled: {
    opacity: 0.6,
  },

  // Results Presentation
  resultsSection: {
    gap: 14,
  },
  primaryResultCard: {
    backgroundColor: '#0F1713',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#1E2C24',
    padding: 16,
  },
  primaryResultTop: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 16,
  },
  resultThumbnail: {
    width: 90,
    height: 90,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#203027',
  },
  resultMeta: {
    flex: 1,
    justifyContent: 'center',
  },
  diseaseTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  diseaseTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    flex: 1,
  },
  confidenceText: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 6,
  },
  confidenceVal: {
    fontWeight: '700',
    color: '#34D399',
  },
  severityBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
  },
  severityBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },

  // Predictions Bars
  predictionsContainer: {
    borderTopWidth: 1,
    borderTopColor: '#1A2620',
    paddingTop: 12,
  },
  predictionsSectionTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6B7280',
    letterSpacing: 1,
    marginBottom: 8,
  },
  predictionRow: {
    marginBottom: 8,
  },
  predLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  predLabel: {
    fontSize: 12,
    color: '#D1D5DB',
    flex: 1,
  },
  predPercent: {
    fontSize: 12,
    fontWeight: '700',
    color: '#34D399',
    marginLeft: 8,
  },
  predTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#18241D',
    overflow: 'hidden',
  },
  predBar: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: '#10B981',
  },

  // Audio Bar
  audioBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#121D17',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1F2F25',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  audioBarTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  audioBarSub: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 1,
  },
  btnAudioPlay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#10B981',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  btnAudioPlayText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Prescription Card
  presCard: {
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 16,
  },
  presCardMatch: {
    backgroundColor: '#0C1611',
    borderColor: 'rgba(16, 185, 129, 0.45)',
  },
  presCardMarket: {
    backgroundColor: '#15130D',
    borderColor: 'rgba(245, 158, 11, 0.45)',
  },
  presHead: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  presIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#142018',
    justifyContent: 'center',
    alignItems: 'center',
  },
  presBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 4,
  },
  presBadgeGreen: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderColor: 'rgba(16, 185, 129, 0.35)',
  },
  presBadgeYellow: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    borderColor: 'rgba(245, 158, 11, 0.35)',
  },
  presBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  presTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  presPlotTag: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.35)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1E2C24',
    marginBottom: 12,
  },
  presPlotTagLabel: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  presPlotTagVal: {
    fontSize: 11,
    fontWeight: '700',
    color: '#34D399',
  },
  matchedWrap: {
    marginBottom: 12,
  },
  matchedHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9CA3AF',
    marginBottom: 6,
  },
  matchedChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  matchedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.35)',
  },
  matchedChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#34D399',
  },
  presBox: {
    backgroundColor: '#060A08',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1A2820',
    padding: 14,
    marginBottom: 12,
  },
  presBoxText: {
    fontSize: 13,
    color: '#F3F4F6',
    lineHeight: 20,
  },
  presFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#18241D',
    paddingTop: 10,
  },
  presFooterLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  presFooterText: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  presFooterLink: {
    fontSize: 11,
    fontWeight: '700',
    color: '#34D399',
    textDecorationLine: 'underline',
  },

  // Detail Cards (Cause, Organic, Chemical, Prevention)
  detailCard: {
    backgroundColor: '#0F1713',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#1E2C24',
    padding: 16,
  },
  detailCardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  detailCardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  detailCardCause: {
    fontSize: 13,
    color: '#D1D5DB',
    lineHeight: 19,
  },
  bulletList: {
    gap: 6,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  bulletPoint: {
    fontSize: 14,
    color: '#10B981',
    lineHeight: 18,
  },
  bulletEmoji: {
    fontSize: 13,
    lineHeight: 18,
  },
  bulletText: {
    flex: 1,
    fontSize: 13,
    color: '#D1D5DB',
    lineHeight: 19,
  },

  // Reset / Scan Another
  btnScanAnother: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#15221B',
    borderWidth: 1,
    borderColor: '#26392F',
    borderRadius: 16,
    paddingVertical: 14,
    marginTop: 10,
  },
  btnScanAnotherText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxHeight: 400,
    backgroundColor: '#0F1713',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#203027',
    padding: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1A2620',
    paddingBottom: 10,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  modalCloseBtn: {
    padding: 4,
  },
  plotItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 6,
    backgroundColor: '#141E19',
  },
  plotItemActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: '#10B981',
  },
  plotItemName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  plotItemNameActive: {
    color: '#34D399',
  },
  plotItemSub: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },
});
