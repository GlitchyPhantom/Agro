import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import colors from '../theme/colors';

const FEATURES = [
  {
    icon: 'scan-outline',
    title: 'AI Disease Detection',
    desc: 'Upload or capture a leaf photo — our CNN model identifies diseases with top-3 predictions and confidence scores in seconds.',
    color: '#10B981',
  },
  {
    icon: 'shield-checkmark-outline',
    title: 'Expert Advisory',
    desc: 'Get cause analysis, organic & chemical treatments with dosage, severity assessment, and preventive measures for every detection.',
    color: '#14B8A6',
  },
  {
    icon: 'globe-outline',
    title: 'Multilingual + Voice',
    desc: 'Full support for 11 Indian languages with voice input & output — designed for farmers with low literacy, using Sarvam AI.',
    color: '#06B6D4',
  },
  {
    icon: 'chatbubbles-outline',
    title: 'AI Chatbot',
    desc: 'Ask follow-up questions about treatments, organic farming, spraying schedules — powered by Groq blazing-fast LLM.',
    color: '#3B82F6',
  },
  {
    icon: 'time-outline',
    title: 'Scan History',
    desc: 'Track disease recurrence over time, save location-tagged records, and monitor your farm health trends.',
    color: '#6366F1',
  },
  {
    icon: 'flash-outline',
    title: 'Instant Results',
    desc: 'Edge-fast inference with TensorFlow CNN model — get results in under 2 seconds, even on slow connections.',
    color: '#F59E0B',
  },
];

const CROPS = ['🌽 Corn (Maize)', '🥔 Potato', '🍅 Tomato'];

const HOW_IT_WORKS = [
  {
    step: '01',
    title: 'Upload Leaf Photo',
    desc: 'Take a picture of the affected leaf or pick from gallery. Our AI accepts any crop image.',
  },
  {
    step: '02',
    title: 'AI Analyzes Disease',
    desc: 'Our trained CNN model processes the image, identifies the disease with top-3 predictions and confidence scores.',
  },
  {
    step: '03',
    title: 'Get Treatment Plan',
    desc: 'Receive detailed advisory with organic & chemical treatments, dosage guidance, and prevention tips — in your language.',
  },
];

const DISEASES = [
  'Common Rust',
  'Northern Blight',
  'Early Blight',
  'Late Blight',
  'Healthy Detection',
];

export default function LandingScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg.primary} />

      {/* Top Navigation Bar */}
      <View style={styles.navBar}>
        <View style={styles.navBrand}>
          <View style={styles.logoBadge}>
            <Ionicons name="leaf" size={20} color="#fff" />
          </View>
          <Text style={styles.brandTitle}>
            Agro<Text style={styles.brandAccent}>Intel</Text>
          </Text>
        </View>

        <TouchableOpacity
          style={styles.navLoginBtn}
          onPress={() => navigation.navigate('Login')}
          activeOpacity={0.8}
        >
          <Text style={styles.navLoginText}>Sign In</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section */}
        <View style={styles.hero}>
          {/* Badge */}
          <View style={styles.badge}>
            <Ionicons name="sparkles" size={14} color={colors.accent.primary} />
            <Text style={styles.badgeText}>AI Agriculture for Indian Farmers</Text>
          </View>

          {/* Headline */}
          <Text style={styles.heroTitle}>
            Detect Plant Diseases{'\n'}
            <Text style={styles.heroTitleHighlight}>Instantly with AI</Text>
          </Text>

          {/* Subtitle */}
          <Text style={styles.heroSubtitle}>
            Upload a leaf photo, get accurate disease detection with treatment advisory —
            in your language, with voice support. Built for every farmer in India.
          </Text>

          {/* Action Buttons */}
          <View style={styles.ctaGroup}>
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => navigation.navigate('Signup')}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryBtnText}>Start Scanning Free</Text>
              <Ionicons name="arrow-forward" size={18} color="#fff" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => navigation.navigate('Login')}
              activeOpacity={0.85}
            >
              <Text style={styles.secondaryBtnText}>Sign In</Text>
            </TouchableOpacity>
          </View>

          {/* Currently Supporting */}
          <View style={styles.supportingBox}>
            <Text style={styles.supportingLabel}>CURRENTLY SUPPORTING</Text>
            <View style={styles.cropsRow}>
              {CROPS.map((crop) => (
                <View key={crop} style={styles.cropPill}>
                  <Text style={styles.cropText}>{crop}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Features Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Everything Your Farm Needs</Text>
            <Text style={styles.sectionSubtitle}>
              From AI-powered diagnostics to multilingual voice support — AgroIntel is the
              complete digital assistant for modern farming.
            </Text>
          </View>

          <View style={styles.featureGrid}>
            {FEATURES.map((item, index) => (
              <View key={index} style={styles.featureCard}>
                <View style={[styles.featureIconWrap, { backgroundColor: `${item.color}20` }]}>
                  <Ionicons name={item.icon} size={24} color={item.color} />
                </View>
                <Text style={styles.featureTitle}>{item.title}</Text>
                <Text style={styles.featureDesc}>{item.desc}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* How It Works */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>How It Works</Text>
            <Text style={styles.sectionSubtitle}>
              Three simple steps to protect your crops
            </Text>
          </View>

          <View style={styles.stepsContainer}>
            {HOW_IT_WORKS.map((step, index) => (
              <View key={index} style={styles.stepCard}>
                <View style={styles.stepBadge}>
                  <Text style={styles.stepBadgeText}>{step.step}</Text>
                </View>
                <Text style={styles.stepTitle}>{step.title}</Text>
                <Text style={styles.stepDesc}>{step.desc}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Diseases Detected */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Diseases We Detect</Text>
            <Text style={styles.sectionSubtitle}>
              Trained on PlantVillage dataset — 9 classes across 3 crops with high accuracy CNN model
            </Text>
          </View>

          <View style={styles.diseasePillsWrap}>
            {DISEASES.map((disease) => (
              <View key={disease} style={styles.diseasePill}>
                <Ionicons name="checkmark-circle" size={16} color={colors.accent.primary} />
                <Text style={styles.diseaseText}>{disease}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Bottom CTA Card */}
        <View style={styles.ctaCard}>
          <View style={styles.ctaIconBox}>
            <Ionicons name="leaf" size={32} color={colors.accent.primary} />
          </View>
          <Text style={styles.ctaCardTitle}>Ready to Protect Your Crops?</Text>
          <Text style={styles.ctaCardSubtitle}>
            Join farmers across India using AgroIntel to detect crop diseases early and save their harvest.
          </Text>

          <TouchableOpacity
            style={styles.ctaCardBtn}
            onPress={() => navigation.navigate('Signup')}
            activeOpacity={0.85}
          >
            <Text style={styles.ctaCardBtnText}>Create Free Account</Text>
            <Ionicons name="arrow-forward" size={18} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>AgroIntel • AI for Indian Agriculture</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg.primary,
  },
  navBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.default,
    backgroundColor: colors.bg.primary,
  },
  navBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoBadge: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: colors.accent.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.5,
  },
  brandAccent: {
    color: colors.accent.bright,
  },
  navLoginBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.bg.card,
  },
  navLoginText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  hero: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 36,
    paddingBottom: 36,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
    marginBottom: 20,
  },
  badgeText: {
    color: colors.accent.bright,
    fontSize: 12,
    fontWeight: '600',
  },
  heroTitle: {
    fontSize: 30,
    fontWeight: '900',
    color: '#fff',
    textAlign: 'center',
    lineHeight: 38,
    marginBottom: 14,
  },
  heroTitleHighlight: {
    color: colors.accent.bright,
  },
  heroSubtitle: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 26,
    paddingHorizontal: 10,
  },
  ctaGroup: {
    width: '100%',
    gap: 12,
    marginBottom: 32,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.accent.primary,
    paddingVertical: 15,
    borderRadius: 14,
    shadowColor: colors.accent.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.bg.card,
  },
  secondaryBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  supportingBox: {
    alignItems: 'center',
    width: '100%',
  },
  supportingLabel: {
    fontSize: 11,
    letterSpacing: 1.5,
    color: colors.text.muted,
    fontWeight: '700',
    marginBottom: 12,
  },
  cropsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  cropPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.bg.card,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  cropText: {
    color: colors.text.secondary,
    fontSize: 13,
    fontWeight: '600',
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 32,
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
  },
  sectionHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 19,
    paddingHorizontal: 12,
  },
  featureGrid: {
    gap: 16,
  },
  featureCard: {
    backgroundColor: colors.bg.card,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  featureIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 6,
  },
  featureDesc: {
    fontSize: 13,
    color: colors.text.secondary,
    lineHeight: 19,
  },
  stepsContainer: {
    gap: 16,
  },
  stepCard: {
    backgroundColor: colors.bg.card,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border.default,
    alignItems: 'center',
  },
  stepBadge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.accent.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  stepBadgeText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#fff',
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 6,
  },
  stepDesc: {
    fontSize: 13,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 19,
  },
  diseasePillsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
  },
  diseasePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: colors.bg.card,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  diseaseText: {
    color: colors.accent.bright,
    fontSize: 13,
    fontWeight: '600',
  },
  ctaCard: {
    marginHorizontal: 20,
    marginTop: 20,
    backgroundColor: colors.bg.card,
    borderRadius: 20,
    padding: 26,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  ctaIconBox: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  ctaCardTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  ctaCardSubtitle: {
    fontSize: 13,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  ctaCardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.accent.primary,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    width: '100%',
  },
  ctaCardBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  footerText: {
    color: colors.text.muted,
    fontSize: 12,
  },
});
