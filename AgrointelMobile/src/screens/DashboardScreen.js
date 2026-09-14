import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useDrawer } from '../context/DrawerContext';
import { API_BASE_URL } from '../config';
import colors from '../theme/colors';

export default function DashboardScreen({ navigation }) {
  const { user, signOut } = useAuth();
  const { openDrawer } = useDrawer();
  const [stats, setStats] = useState(null);
  const [recentScans, setRecentScans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const fetchData = useCallback(async () => {
    if (!user?.id) return;
    try {
      const [statsRes, histRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/stats`, {
          headers: { 'X-User-Id': user.id },
        }).catch(() => null),
        fetch(`${API_BASE_URL}/api/history?limit=5`, {
          headers: { 'X-User-Id': user.id },
        }).catch(() => null),
      ]);

      if (statsRes && statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }
      if (histRes && histRes.ok) {
        const histData = await histRes.json();
        setRecentScans(histData.scans || []);
      }
    } catch (err) {
      console.warn('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const userName =
    user?.user_metadata?.full_name ||
    user?.email?.split('@')[0] ||
    'Farmer';

  const statCards = [
    {
      label: 'Total Scans',
      value: stats?.total_scans ?? 0,
      icon: 'pulse-outline',
      color: '#10B981',
      bg: 'rgba(16, 185, 129, 0.12)',
    },
    {
      label: 'Healthy',
      value: stats?.healthy_count ?? 0,
      icon: 'checkmark-circle-outline',
      color: '#14B8A6',
      bg: 'rgba(20, 184, 166, 0.12)',
    },
    {
      label: 'Diseased',
      value: stats?.diseased_count ?? 0,
      icon: 'alert-circle-outline',
      color: '#F59E0B',
      bg: 'rgba(245, 158, 11, 0.12)',
    },
    {
      label: 'Detection Rate',
      value:
        stats?.total_scans > 0
          ? `${Math.round((stats.diseased_count / stats.total_scans) * 100)}%`
          : '—',
      icon: 'trending-up-outline',
      color: '#3B82F6',
      bg: 'rgba(59, 130, 246, 0.12)',
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg.primary} />

      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.headerBrandWrap}>
          <TouchableOpacity
            style={styles.hamburgerBtn}
            onPress={openDrawer}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="menu-outline" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerBrand}>
            <View style={styles.logoIcon}>
              <Ionicons name="leaf" size={18} color="#fff" />
            </View>
            <Text style={styles.headerTitle}>
              Agro<Text style={styles.headerAccent}>Intel</Text>
            </Text>
          </View>
        </View>

        <TouchableOpacity style={styles.signOutBtn} onPress={signOut} activeOpacity={0.7}>
          <Ionicons name="log-out-outline" size={20} color={colors.text.muted} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accent.primary}
          />
        }
      >
        {/* Welcome Section */}
        <View style={styles.welcomeBox}>
          <Text style={styles.greetingText}>{getGreeting()},</Text>
          <Text style={styles.userNameText}>{userName} 👋</Text>
          <Text style={styles.welcomeSub}>Here is your farm crop health overview</Text>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          {statCards.map((item, i) => (
            <View key={i} style={styles.statCard}>
              <View style={[styles.statIconWrap, { backgroundColor: item.bg }]}>
                <Ionicons name={item.icon} size={20} color={item.color} />
              </View>
              <Text style={styles.statValue}>{item.value}</Text>
              <Text style={styles.statLabel}>{item.label}</Text>
            </View>
          ))}
        </View>

        {/* Quick Actions */}
        <Text style={styles.sectionHeading}>Quick Actions</Text>
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('Scanner')}
            activeOpacity={0.8}
          >
            <View style={[styles.actionIconWrap, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
              <Ionicons name="scan" size={24} color={colors.accent.bright} />
            </View>
            <Text style={styles.actionTitle}>New Scan</Text>
            <Text style={styles.actionDesc}>Detect crop leaf disease</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('Chat')}
            activeOpacity={0.8}
          >
            <View style={[styles.actionIconWrap, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]}>
              <Ionicons name="chatbubble-ellipses" size={24} color="#3B82F6" />
            </View>
            <Text style={styles.actionTitle}>Agri Chat</Text>
            <Text style={styles.actionDesc}>Ask AI crop advisor</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.actionRow, { marginTop: -14 }]}>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('FarmPlots')}
            activeOpacity={0.8}
          >
            <View style={[styles.actionIconWrap, { backgroundColor: 'rgba(52, 211, 153, 0.15)' }]}>
              <Ionicons name="location-outline" size={24} color="#34D399" />
            </View>
            <Text style={styles.actionTitle}>Farm Plots</Text>
            <Text style={styles.actionDesc}>Manage land & crop health</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('Inventory')}
            activeOpacity={0.8}
          >
            <View style={[styles.actionIconWrap, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
              <Ionicons name="cube-outline" size={24} color="#F59E0B" />
            </View>
            <Text style={styles.actionTitle}>Shed Stocks</Text>
            <Text style={styles.actionDesc}>Medicines & fertilizers</Text>
          </TouchableOpacity>
        </View>

        {/* Recent Scans */}
        <View style={styles.recentHeader}>
          <Text style={styles.sectionHeading}>Recent Scans</Text>
          <TouchableOpacity onPress={() => navigation.navigate('History')}>
            <Text style={styles.viewAllText}>View all</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator color={colors.accent.primary} style={{ marginTop: 24 }} />
        ) : recentScans.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="leaf-outline" size={40} color={colors.text.muted} />
            <Text style={styles.emptyTitle}>No scans yet</Text>
            <Text style={styles.emptyText}>Upload a leaf photo to diagnose diseases</Text>
            <TouchableOpacity
              style={styles.emptyBtn}
              onPress={() => navigation.navigate('Scanner')}
            >
              <Text style={styles.emptyBtnText}>Scan First Leaf</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.scansList}>
            {recentScans.map((scan) => {
              const isHealthy =
                scan.disease_name?.toLowerCase().includes('healthy') ||
                scan.severity?.toLowerCase() === 'healthy';
              return (
                <View key={scan.id} style={styles.scanItem}>
                  {scan.image_url ? (
                    <Image source={{ uri: scan.image_url }} style={styles.scanThumb} />
                  ) : (
                    <View style={styles.scanThumbPlaceholder}>
                      <Ionicons
                        name="leaf"
                        size={20}
                        color={isHealthy ? colors.accent.primary : colors.severity.moderate}
                      />
                    </View>
                  )}
                  <View style={styles.scanInfo}>
                    <Text style={styles.scanDisease} numberOfLines={1}>
                      {scan.disease_name?.replace(/___/g, ' - ')?.replace(/_/g, ' ') || 'Scan'}
                    </Text>
                    <Text style={styles.scanDate}>
                      {scan.created_at ? new Date(scan.created_at).toLocaleDateString() : 'Recent'}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.severityBadge,
                      {
                        backgroundColor: isHealthy
                          ? colors.severity.healthyBg
                          : colors.severity.moderateBg,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.severityText,
                        {
                          color: isHealthy
                            ? colors.severity.healthy
                            : colors.severity.moderate,
                        },
                      ]}
                    >
                      {Math.round((scan.confidence || 0) * 100)}%
                    </Text>
                  </View>
                </View>
              );
            })}
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
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.default,
  },
  headerBrandWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  hamburgerBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#111A15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#1E2C24',
  },
  headerBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: colors.accent.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
  },
  headerAccent: {
    color: colors.accent.bright,
  },
  signOutBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: colors.bg.card,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  welcomeBox: {
    marginBottom: 24,
  },
  greetingText: {
    fontSize: 14,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  userNameText: {
    fontSize: 26,
    fontWeight: '800',
    color: '#fff',
    marginTop: 2,
  },
  welcomeSub: {
    fontSize: 13,
    color: colors.text.muted,
    marginTop: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 28,
  },
  statCard: {
    width: '48%',
    backgroundColor: colors.bg.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  statIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
  },
  statLabel: {
    fontSize: 12,
    color: colors.text.muted,
    marginTop: 2,
    fontWeight: '500',
  },
  sectionHeading: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 14,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 28,
  },
  actionCard: {
    flex: 1,
    backgroundColor: colors.bg.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  actionIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  actionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  actionDesc: {
    fontSize: 11,
    color: colors.text.secondary,
  },
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  viewAllText: {
    color: colors.accent.bright,
    fontSize: 13,
    fontWeight: '600',
  },
  emptyCard: {
    backgroundColor: colors.bg.card,
    borderRadius: 16,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginTop: 10,
  },
  emptyText: {
    fontSize: 13,
    color: colors.text.muted,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  emptyBtn: {
    backgroundColor: colors.accent.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  emptyBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  scansList: {
    gap: 10,
  },
  scanItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg.card,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  scanThumb: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: colors.bg.primary,
  },
  scanThumbPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: colors.bg.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanInfo: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  scanDisease: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  scanDate: {
    color: colors.text.muted,
    fontSize: 11,
    marginTop: 2,
  },
  severityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  severityText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
