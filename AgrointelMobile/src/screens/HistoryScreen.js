import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useDrawer } from '../context/DrawerContext';
import { API_BASE_URL } from '../config';
import colors from '../theme/colors';

export default function HistoryScreen({ navigation }) {
  const { user } = useAuth();
  const { openDrawer } = useDrawer();
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedId, setExpandedId] = useState(null);

  const fetchHistory = useCallback(async () => {
    if (!user?.id) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/history`, {
        headers: { 'X-User-Id': user.id },
      });
      if (res.ok) {
        const data = await res.json();
        setScans(data.scans || []);
      }
    } catch (err) {
      console.warn('Fetch history error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchHistory();
  };

  const handleDelete = (scanId) => {
    Alert.alert('Delete Scan', 'Are you sure you want to delete this scan record?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const res = await fetch(`${API_BASE_URL}/api/history/${scanId}`, {
              method: 'DELETE',
              headers: { 'X-User-Id': user.id },
            });
            if (res.ok) {
              setScans((prev) => prev.filter((s) => s.id !== scanId));
            }
          } catch (err) {
            Alert.alert('Error', 'Failed to delete record');
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg.primary} />

      {/* Header */}
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
            <Ionicons name="time" size={20} color={colors.accent.bright} />
            <Text style={styles.headerTitle}>History</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.newScanBtn}
          onPress={() => navigation.navigate('Scanner')}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={18} color="#fff" />
          <Text style={styles.newScanText}>New Scan</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.accent.primary} style={{ marginTop: 40 }} />
      ) : scans.length === 0 ? (
        <View style={styles.emptyWrap}>
          <View style={styles.emptyIconBox}>
            <Ionicons name="document-text-outline" size={40} color={colors.text.muted} />
          </View>
          <Text style={styles.emptyTitle}>No Scan History</Text>
          <Text style={styles.emptySub}>
            Diagnose plant diseases and your previous scan records will be saved here.
          </Text>
          <TouchableOpacity
            style={styles.emptyScanBtn}
            onPress={() => navigation.navigate('Scanner')}
          >
            <Text style={styles.emptyScanBtnText}>Scan a Leaf Now</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={scans}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.accent.primary}
            />
          }
          renderItem={({ item }) => {
            const isExpanded = expandedId === item.id;
            const isHealthy =
              item.disease_name?.toLowerCase().includes('healthy') ||
              item.severity?.toLowerCase() === 'healthy';

            return (
              <View style={styles.card}>
                <TouchableOpacity
                  style={styles.cardHeader}
                  onPress={() => setExpandedId(isExpanded ? null : item.id)}
                  activeOpacity={0.7}
                >
                  {item.image_url ? (
                    <Image source={{ uri: item.image_url }} style={styles.thumb} />
                  ) : (
                    <View style={styles.thumbPlaceholder}>
                      <Ionicons
                        name="leaf"
                        size={22}
                        color={isHealthy ? colors.accent.primary : colors.severity.moderate}
                      />
                    </View>
                  )}

                  <View style={styles.cardInfo}>
                    <Text style={styles.diseaseName} numberOfLines={1}>
                      {item.disease_name?.replace(/___/g, ' - ')?.replace(/_/g, ' ') || 'Scan'}
                    </Text>
                    <Text style={styles.dateText}>
                      {item.created_at
                        ? new Date(item.created_at).toLocaleString([], {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : 'Recent'}
                    </Text>
                  </View>

                  <View style={styles.headerRight}>
                    <View
                      style={[
                        styles.badge,
                        {
                          backgroundColor: isHealthy
                            ? colors.severity.healthyBg
                            : colors.severity.moderateBg,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.badgeText,
                          {
                            color: isHealthy
                              ? colors.severity.healthy
                              : colors.severity.moderate,
                          },
                        ]}
                      >
                        {Math.round((item.confidence || 0) * 100)}%
                      </Text>
                    </View>
                    <Ionicons
                      name={isExpanded ? 'chevron-up' : 'chevron-down'}
                      size={18}
                      color={colors.text.muted}
                    />
                  </View>
                </TouchableOpacity>

                {/* Expanded Details */}
                {isExpanded && (
                  <View style={styles.expandedContent}>
                    {item.advisory ? (
                      <View style={styles.advisoryBox}>
                        <Text style={styles.advisoryTitle}>Advisory & Details</Text>
                        <Text style={styles.advisoryBody}>{item.advisory}</Text>
                      </View>
                    ) : null}

                    <View style={styles.cardActions}>
                      <TouchableOpacity
                        style={styles.deleteBtn}
                        onPress={() => handleDelete(item.id)}
                      >
                        <Ionicons name="trash-outline" size={16} color={colors.text.danger} />
                        <Text style={styles.deleteBtnText}>Delete Record</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            );
          }}
        />
      )}
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
  headerLeftWrap: {
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
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
  },
  newScanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.accent.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  newScanText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  card: {
    backgroundColor: colors.bg.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border.default,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  thumb: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: colors.bg.primary,
  },
  thumbPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: colors.bg.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardInfo: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  diseaseName: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  dateText: {
    color: colors.text.muted,
    fontSize: 12,
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  expandedContent: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
    paddingTop: 12,
  },
  advisoryBox: {
    backgroundColor: colors.bg.primary,
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
  },
  advisoryTitle: {
    color: colors.accent.bright,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
  },
  advisoryBody: {
    color: colors.text.secondary,
    fontSize: 12,
    lineHeight: 18,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  deleteBtnText: {
    color: colors.text.danger,
    fontSize: 12,
    fontWeight: '600',
  },
  emptyWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyIconBox: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: colors.bg.card,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  emptySub: {
    color: colors.text.muted,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 20,
    maxWidth: 260,
  },
  emptyScanBtn: {
    backgroundColor: colors.accent.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyScanBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
});
