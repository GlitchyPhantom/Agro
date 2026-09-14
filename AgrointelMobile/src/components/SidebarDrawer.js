import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  TouchableWithoutFeedback,
  BackHandler,
  Modal,
  ScrollView,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useDrawer } from '../context/DrawerContext';
import { useAuth } from '../context/AuthContext';
import colors from '../theme/colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DRAWER_WIDTH = Math.min(SCREEN_WIDTH * 0.84, 320);

export default function SidebarDrawer() {
  const { isOpen, closeDrawer } = useDrawer();
  const { user, signOut } = useAuth();
  const navigation = useNavigation();

  // Animations
  const animX = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const animOpacity = useRef(new Animated.Value(0)).current;

  // Popover menu state & animation
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const popoverAnim = useRef(new Animated.Value(0)).current;

  // Modals state: 'profile' | 'settings' | null
  const [activeModal, setActiveModal] = useState(null);

  // Settings switches state
  const [pushNotifications, setPushNotifications] = useState(true);
  const [audioSpeech, setAudioSpeech] = useState(true);
  const [offlineCache, setOfflineCache] = useState(true);

  useEffect(() => {
    if (isOpen) {
      Animated.parallel([
        Animated.timing(animX, {
          toValue: 0,
          duration: 260,
          useNativeDriver: true,
        }),
        Animated.timing(animOpacity, {
          toValue: 1,
          duration: 260,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      setIsMenuOpen(false);
      Animated.parallel([
        Animated.timing(animX, {
          toValue: -DRAWER_WIDTH,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(animOpacity, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isOpen]);

  useEffect(() => {
    if (isMenuOpen) {
      Animated.spring(popoverAnim, {
        toValue: 1,
        tension: 90,
        friction: 8,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(popoverAnim, {
        toValue: 0,
        duration: 140,
        useNativeDriver: true,
      }).start();
    }
  }, [isMenuOpen]);

  // Handle Android back button
  useEffect(() => {
    const backAction = () => {
      if (activeModal) {
        setActiveModal(null);
        return true;
      }
      if (isMenuOpen) {
        setIsMenuOpen(false);
        return true;
      }
      if (isOpen) {
        closeDrawer();
        return true;
      }
      return false;
    };
    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [isOpen, isMenuOpen, activeModal]);

  if (!isOpen && !activeModal) return null;

  const navigateTo = (action) => {
    setIsMenuOpen(false);
    closeDrawer();
    setTimeout(() => {
      action();
    }, 150);
  };

  const menuItems = [
    {
      id: 'farm_plots',
      label: 'Farm Plots',
      icon: 'location-outline',
      action: () => navigation.navigate('FarmPlots'),
    },
    {
      id: 'inventory',
      label: 'Shed Inventory',
      icon: 'cube-outline',
      action: () => navigation.navigate('Inventory'),
    },
    {
      id: 'voice_reader',
      label: 'Free Voice Reader',
      icon: 'volume-high-outline',
      action: () => navigation.navigate('VoiceReader'),
    },
  ];

  // User display name & subtitle (explicitly write "null" not email as requested)
  const getCleanName = () => {
    const raw = user?.user_metadata?.full_name || user?.user_metadata?.name;
    if (raw && typeof raw === 'string' && raw.toLowerCase() !== 'null' && raw.trim() !== '') {
      return raw.trim();
    }
    return 'User';
  };

  const userName = getCleanName();
  const userInitial = userName.length >= 2
    ? userName.slice(0, 2).toUpperCase()
    : (userName.charAt(0) || 'U').toUpperCase();

  // User requested: write null not email
  const userSubtitle = 'null';

  return (
    <>
      <View style={StyleSheet.absoluteFillObject} pointerEvents="box-none">
        {/* Dimmed Backdrop behind drawer */}
        <TouchableWithoutFeedback
          onPress={() => {
            if (isMenuOpen) {
              setIsMenuOpen(false);
            } else {
              closeDrawer();
            }
          }}
        >
          <Animated.View
            style={[
              styles.backdrop,
              {
                opacity: animOpacity.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 0.75],
                }),
              },
            ]}
          />
        </TouchableWithoutFeedback>

        {/* Slide-out Drawer */}
        <Animated.View
          style={[
            styles.drawerContainer,
            {
              width: DRAWER_WIDTH,
              transform: [{ translateX: animX }],
            },
          ]}
        >
          <SafeAreaView style={styles.safeArea} edges={['top', 'bottom', 'left']}>
            {/* Drawer Header with Brand */}
            <View style={styles.header}>
              <View style={styles.brandRow}>
                <View style={styles.logoBox}>
                  <Ionicons name="leaf" size={20} color="#fff" />
                </View>
                <Text style={styles.brandText}>
                  Agro<Text style={styles.brandAccent}>Intel</Text>
                </Text>
              </View>
              <TouchableOpacity
                onPress={closeDrawer}
                style={styles.closeBtn}
                activeOpacity={0.7}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={22} color={colors.text.secondary} />
              </TouchableOpacity>
            </View>

            {/* Navigation Items (No NAVIGATION header, No Badges) */}
            <View style={styles.navSection}>
              {menuItems.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.menuItem}
                  activeOpacity={0.75}
                  onPress={() => navigateTo(item.action)}
                >
                  <View style={styles.menuIconWrap}>
                    <Ionicons name={item.icon} size={20} color={colors.accent.bright} />
                  </View>
                  <Text style={styles.menuLabel}>{item.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Transparent backdrop to dismiss popover when tapping outside inside drawer */}
            {isMenuOpen && (
              <TouchableWithoutFeedback onPress={() => setIsMenuOpen(false)}>
                <View style={styles.popoverBackdrop} />
              </TouchableWithoutFeedback>
            )}

            {/* Popover Card Menu (Opens when tapping the bottom pill) */}
            {isMenuOpen && (
              <Animated.View
                style={[
                  styles.popoverCard,
                  {
                    opacity: popoverAnim,
                    transform: [
                      {
                        scale: popoverAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.93, 1],
                        }),
                      },
                      {
                        translateY: popoverAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [12, 0],
                        }),
                      },
                    ],
                  },
                ]}
              >
                {/* Header Row: User Info + Arrow */}
                <TouchableOpacity
                  style={styles.popoverHeaderRow}
                  activeOpacity={0.7}
                  onPress={() => {
                    setIsMenuOpen(false);
                    setActiveModal('profile');
                  }}
                >
                  <View style={styles.avatarCirclePink}>
                    <Text style={styles.avatarTextWhite}>{userInitial}</Text>
                  </View>
                  <View style={styles.popoverUserInfo}>
                    <Text style={styles.popoverUserName} numberOfLines={1}>
                      {userName}
                    </Text>
                    <Text style={styles.popoverUserSub} numberOfLines={1}>
                      {userSubtitle}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
                </TouchableOpacity>

                <View style={styles.popoverDivider} />

                {/* Profile */}
                <TouchableOpacity
                  style={styles.popoverItem}
                  activeOpacity={0.7}
                  onPress={() => {
                    setIsMenuOpen(false);
                    setActiveModal('profile');
                  }}
                >
                  <Ionicons
                    name="person-circle-outline"
                    size={18}
                    color="#E5E7EB"
                    style={styles.popoverIcon}
                  />
                  <Text style={styles.popoverItemText}>Profile</Text>
                </TouchableOpacity>

                {/* Settings */}
                <TouchableOpacity
                  style={styles.popoverItem}
                  activeOpacity={0.7}
                  onPress={() => {
                    setIsMenuOpen(false);
                    setActiveModal('settings');
                  }}
                >
                  <Ionicons
                    name="settings-outline"
                    size={18}
                    color="#E5E7EB"
                    style={styles.popoverIcon}
                  />
                  <Text style={styles.popoverItemText}>Settings</Text>
                </TouchableOpacity>

                <View style={styles.popoverDivider} />

                {/* Log out */}
                <TouchableOpacity
                  style={styles.popoverItem}
                  activeOpacity={0.7}
                  onPress={() => {
                    setIsMenuOpen(false);
                    closeDrawer();
                    signOut();
                  }}
                >
                  <Ionicons
                    name="log-out-outline"
                    size={18}
                    color="#EF4444"
                    style={styles.popoverIcon}
                  />
                  <Text style={[styles.popoverItemText, { color: '#EF4444' }]}>Log out</Text>
                </TouchableOpacity>
              </Animated.View>
            )}

            {/* Bottom User Pill */}
            <View style={styles.footer}>
              <TouchableOpacity
                style={styles.userPill}
                activeOpacity={0.8}
                onPress={() => setIsMenuOpen((prev) => !prev)}
              >
                <View style={styles.avatarCirclePink}>
                  <Text style={styles.avatarTextWhite}>{userInitial}</Text>
                </View>
                <View style={styles.userInfo}>
                  <Text style={styles.userName} numberOfLines={1}>
                    {userName}
                  </Text>
                  <Text style={styles.userEmail} numberOfLines={1}>
                    {userSubtitle}
                  </Text>
                </View>
                <Ionicons name="storefront-outline" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </Animated.View>
      </View>

      {/* Profile Modal */}
      <Modal
        visible={activeModal === 'profile'}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setActiveModal(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Farmer Profile</Text>
              <TouchableOpacity
                onPress={() => setActiveModal(null)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.profileHero}>
                <View style={styles.profileHeroAvatar}>
                  <Text style={styles.profileHeroAvatarText}>{userInitial}</Text>
                </View>
                <Text style={styles.profileHeroName}>{userName}</Text>
                <Text style={styles.profileHeroEmail}>{userSubtitle}</Text>
                <View style={styles.profileRoleBadge}>
                  <Ionicons name="shield-checkmark" size={14} color="#10B981" />
                  <Text style={styles.profileRoleText}>Verified AgroIntel Member</Text>
                </View>
              </View>

              <View style={styles.infoSection}>
                <View style={styles.infoRow}>
                  <View style={styles.infoIconBox}>
                    <Ionicons name="person-outline" size={18} color="#10B981" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.infoLabel}>Account User</Text>
                    <Text style={styles.infoVal}>{userName}</Text>
                  </View>
                </View>

                <View style={styles.infoRow}>
                  <View style={styles.infoIconBox}>
                    <Ionicons name="location-outline" size={18} color="#10B981" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.infoLabel}>Farm Plots</Text>
                    <Text style={styles.infoVal}>Registered & Synced</Text>
                  </View>
                </View>

                <View style={styles.infoRow}>
                  <View style={styles.infoIconBox}>
                    <Ionicons name="cube-outline" size={18} color="#10B981" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.infoLabel}>Shed Inventory</Text>
                    <Text style={styles.infoVal}>Active Tracking</Text>
                  </View>
                </View>
              </View>

              <TouchableOpacity
                style={styles.primaryActionBtn}
                onPress={() => setActiveModal(null)}
              >
                <Text style={styles.primaryActionBtnText}>Done</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Settings Modal */}
      <Modal
        visible={activeModal === 'settings'}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setActiveModal(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>App Settings</Text>
              <TouchableOpacity
                onPress={() => setActiveModal(null)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.settingCategory}>PREFERENCES</Text>

              <View style={styles.switchRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.switchTitle}>Disease Alerts</Text>
                  <Text style={styles.switchDesc}>Push notifications for epidemic warnings</Text>
                </View>
                <Switch
                  value={pushNotifications}
                  onValueChange={setPushNotifications}
                  trackColor={{ false: '#374151', true: '#10B981' }}
                  thumbColor="#FFFFFF"
                />
              </View>

              <View style={styles.switchRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.switchTitle}>Audio Speech Advisory</Text>
                  <Text style={styles.switchDesc}>Read treatment prescriptions aloud</Text>
                </View>
                <Switch
                  value={audioSpeech}
                  onValueChange={setAudioSpeech}
                  trackColor={{ false: '#374151', true: '#10B981' }}
                  thumbColor="#FFFFFF"
                />
              </View>

              <View style={styles.switchRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.switchTitle}>Offline Field Cache</Text>
                  <Text style={styles.switchDesc}>Cache remedies for low connectivity</Text>
                </View>
                <Switch
                  value={offlineCache}
                  onValueChange={setOfflineCache}
                  trackColor={{ false: '#374151', true: '#10B981' }}
                  thumbColor="#FFFFFF"
                />
              </View>

              <Text style={[styles.settingCategory, { marginTop: 20 }]}>APPLICATION</Text>
              <View style={styles.appMetaRow}>
                <Text style={styles.appMetaLabel}>Version</Text>
                <Text style={styles.appMetaVal}>AgroIntel v1.2.0 (Mobile)</Text>
              </View>
              <View style={styles.appMetaRow}>
                <Text style={styles.appMetaLabel}>Theme</Text>
                <Text style={styles.appMetaVal}>Deep Forest Emerald</Text>
              </View>
              <View style={styles.appMetaRow}>
                <Text style={styles.appMetaLabel}>AI Engine</Text>
                <Text style={styles.appMetaVal}>Groq LLaMA 3.3 + Supabase</Text>
              </View>

              <TouchableOpacity
                style={[styles.primaryActionBtn, { marginTop: 24 }]}
                onPress={() => setActiveModal(null)}
              >
                <Text style={styles.primaryActionBtnText}>Save Preferences</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000',
  },
  drawerContainer: {
    height: '100%',
    backgroundColor: '#080C0A',
    borderRightWidth: 1,
    borderRightColor: '#1A2620',
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 25,
  },
  safeArea: {
    flex: 1,
    justifyContent: 'space-between',
    position: 'relative',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#1A2620',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  brandText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  brandAccent: {
    color: '#34D399',
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#141E19',
    justifyContent: 'center',
    alignItems: 'center',
  },
  navSection: {
    flex: 1,
    paddingHorizontal: 14,
    paddingTop: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 6,
    backgroundColor: 'transparent',
  },
  menuIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 9,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  menuLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#F3F4F6',
    letterSpacing: 0.2,
  },
  footer: {
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#1A2620',
    backgroundColor: '#0A0F0D',
  },
  userPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#151F19',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#223329',
  },
  avatarCirclePink: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#DB2777',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  avatarTextWhite: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  userInfo: {
    flex: 1,
    marginRight: 8,
  },
  userName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  userEmail: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 1,
  },

  // Popover styles
  popoverBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 90,
  },
  popoverCard: {
    position: 'absolute',
    bottom: 74,
    left: 10,
    right: 10,
    backgroundColor: '#141E19',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#26382E',
    paddingVertical: 8,
    paddingHorizontal: 6,
    zIndex: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.5,
    shadowRadius: 18,
    elevation: 35,
  },
  popoverHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
  },
  popoverUserInfo: {
    flex: 1,
    marginRight: 8,
  },
  popoverUserName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  popoverUserSub: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 1,
  },
  popoverDivider: {
    height: 1,
    backgroundColor: '#1E2E25',
    marginVertical: 6,
    marginHorizontal: 8,
  },
  popoverItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  popoverIcon: {
    marginRight: 12,
  },
  popoverItemText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#E5E7EB',
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#0F1713',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#1E2C24',
    padding: 22,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1A2620',
    paddingBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1A2620',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileHero: {
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 14,
  },
  profileHeroAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#DB2777',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  profileHeroAvatarText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  profileHeroName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  profileHeroEmail: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  profileRoleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
    gap: 6,
  },
  profileRoleText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#34D399',
  },
  infoSection: {
    backgroundColor: '#15201A',
    borderRadius: 16,
    padding: 12,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#203027',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1E2C24',
  },
  infoIconBox: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  infoLabel: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  infoVal: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 1,
  },
  primaryActionBtn: {
    backgroundColor: '#10B981',
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 10,
  },
  primaryActionBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  settingCategory: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
    letterSpacing: 1,
    marginBottom: 10,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1A2620',
  },
  switchTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  switchDesc: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },
  appMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1A2620',
  },
  appMetaLabel: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  appMetaVal: {
    fontSize: 13,
    fontWeight: '600',
    color: '#F3F4F6',
  },
});
