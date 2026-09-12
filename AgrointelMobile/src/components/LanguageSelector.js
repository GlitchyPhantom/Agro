import React from 'react';
import {
  Text,
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../theme/colors';

const LANGUAGES = {
  en: 'English',
  hi: 'हिंदी',
  od: 'ଓଡ଼ିଆ',
  bn: 'বাংলা',
  ta: 'தமிழ்',
  te: 'తెలుగు',
  mr: 'मराठी',
  gu: 'ગુજરાતી',
  kn: 'ಕನ್ನಡ',
  ml: 'മലയാളം',
  pa: 'ਪੰਜਾਬੀ',
};

export default function LanguageSelector({ currentLang, onChangeLang, style }) {
  const [visible, setVisible] = React.useState(false);

  const langEntries = Object.entries(LANGUAGES);

  return (
    <View style={style}>
      <TouchableOpacity
        style={styles.trigger}
        onPress={() => setVisible(true)}
        activeOpacity={0.7}
      >
        <Ionicons name="globe-outline" size={14} color={colors.accent.primary} />
        <Text style={styles.triggerText}>
          {LANGUAGES[currentLang] || 'English'}
        </Text>
        <Ionicons name="chevron-down" size={12} color={colors.text.muted} />
      </TouchableOpacity>

      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={() => setVisible(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setVisible(false)}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Select Language</Text>
            <FlatList
              data={langEntries}
              keyExtractor={([code]) => code}
              renderItem={({ item: [code, name] }) => (
                <TouchableOpacity
                  style={[
                    styles.langItem,
                    currentLang === code && styles.langItemActive,
                  ]}
                  onPress={() => {
                    onChangeLang(code);
                    setVisible(false);
                  }}
                >
                  <Text
                    style={[
                      styles.langName,
                      currentLang === code && styles.langNameActive,
                    ]}
                  >
                    {name}
                  </Text>
                  <Text style={styles.langCode}>{code.toUpperCase()}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.bg.card,
    borderColor: colors.border.default,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  triggerText: {
    color: colors.accent.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    backgroundColor: colors.bg.card,
    borderRadius: 20,
    width: '80%',
    maxHeight: 400,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  modalTitle: {
    color: colors.text.primary,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
    paddingHorizontal: 16,
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
  langName: {
    color: colors.text.secondary,
    fontSize: 14,
  },
  langNameActive: {
    color: colors.accent.primary,
    fontWeight: '700',
  },
  langCode: {
    color: colors.text.muted,
    fontSize: 10,
    fontWeight: '600',
  },
});
