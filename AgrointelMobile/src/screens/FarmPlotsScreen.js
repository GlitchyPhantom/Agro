import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useDrawer } from '../context/DrawerContext';
import { supabase } from '../lib/supabase';
import { API_BASE_URL } from '../config';
import colors from '../theme/colors';

const COMMON_CROPS = [
  { name: 'Tomato', icon: '🍅' },
  { name: 'Potato', icon: '🥔' },
  { name: 'Rice', icon: '🌾' },
  { name: 'Wheat', icon: '🌾' },
  { name: 'Corn', icon: '🌽' },
  { name: 'Cotton', icon: '🌿' },
  { name: 'Chili', icon: '🌶️' },
  { name: 'Sugarcane', icon: '🎋' },
  { name: 'Onion', icon: '🧅' },
  { name: 'Apple', icon: '🍎' },
  { name: 'Grape', icon: '🍇' },
  { name: 'Other', icon: '🌱' },
];

const SOIL_TYPES = [
  'Loamy Soil',
  'Alluvial Soil',
  'Black Cotton Soil',
  'Red & Yellow Soil',
  'Sandy Soil',
  'Clayey Soil',
  'Laterite Soil',
];

const AREA_UNITS = ['Acres', 'Hectares', 'Bigha', 'Guntha'];

export default function FarmPlotsScreen({ navigation }) {
  const { user } = useAuth();
  const { openDrawer } = useDrawer();

  const [plots, setPlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCropFilter, setSelectedCropFilter] = useState('All');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlot, setEditingPlot] = useState(null);
  const [saving, setSaving] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    plot_name: '',
    area: '',
    area_unit: 'Acres',
    crop: 'Tomato',
    sowing_date: new Date().toISOString().split('T')[0],
    soil_type: 'Loamy Soil',
    notes: '',
  });

  const fetchPlots = useCallback(async () => {
    if (!user?.id) return;
    try {
      // 1. Try Supabase direct query
      const { data, error } = await supabase
        .from('farm_plots')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setPlots(data);
        return;
      }

      // 2. Fallback to backend API
      const res = await fetch(`${API_BASE_URL}/api/plots`, {
        headers: { 'X-User-Id': user.id },
      });
      if (res.ok) {
        const resData = await res.json();
        setPlots(resData.plots || []);
        return;
      }
    } catch (err) {
      console.warn('Error fetching farm plots:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    fetchPlots();
  }, [fetchPlots]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchPlots();
  };

  const openAddModal = () => {
    setEditingPlot(null);
    setFormData({
      plot_name: '',
      area: '',
      area_unit: 'Acres',
      crop: 'Tomato',
      sowing_date: new Date().toISOString().split('T')[0],
      soil_type: 'Loamy Soil',
      notes: '',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (plot) => {
    setEditingPlot(plot);
    setFormData({
      plot_name: plot.plot_name,
      area: String(plot.area),
      area_unit: plot.area_unit || 'Acres',
      crop: plot.crop,
      sowing_date: plot.sowing_date || new Date().toISOString().split('T')[0],
      soil_type: plot.soil_type || 'Loamy Soil',
      notes: plot.notes || '',
    });
    setIsModalOpen(true);
  };

  const handleSavePlot = async () => {
    if (!formData.plot_name.trim()) {
      Alert.alert('Validation Error', 'Please enter a name for this plot.');
      return;
    }
    if (!formData.area || isNaN(formData.area) || Number(formData.area) <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid area size.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        plot_name: formData.plot_name.trim(),
        area: parseFloat(formData.area),
        area_unit: formData.area_unit,
        crop: formData.crop,
        sowing_date: formData.sowing_date,
        soil_type: formData.soil_type,
        notes: formData.notes.trim(),
        user_id: user.id,
      };

      if (editingPlot) {
        // Update
        const { error } = await supabase
          .from('farm_plots')
          .update(payload)
          .eq('id', editingPlot.id);

        if (error) {
          // Try backend endpoint
          await fetch(`${API_BASE_URL}/api/plots/${editingPlot.id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'X-User-Id': user.id,
            },
            body: JSON.stringify(payload),
          });
        }
      } else {
        // Insert
        const { error } = await supabase.from('farm_plots').insert([payload]);
        if (error) {
          // Try backend endpoint
          await fetch(`${API_BASE_URL}/api/plots`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-User-Id': user.id,
            },
            body: JSON.stringify(payload),
          });
        }
      }

      setIsModalOpen(false);
      fetchPlots();
    } catch (err) {
      console.error('Save plot error:', err);
      Alert.alert('Error', 'Failed to save farm plot. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePlot = (plot) => {
    Alert.alert(
      'Delete Plot',
      `Are you sure you want to delete "${plot.plot_name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('farm_plots')
                .delete()
                .eq('id', plot.id);

              if (error) {
                await fetch(`${API_BASE_URL}/api/plots/${plot.id}`, {
                  method: 'DELETE',
                  headers: { 'X-User-Id': user.id },
                });
              }
              setPlots((prev) => prev.filter((p) => p.id !== plot.id));
            } catch (err) {
              Alert.alert('Error', 'Could not delete plot.');
            }
          },
        },
      ]
    );
  };

  const getCropIcon = (cropName) => {
    const found = COMMON_CROPS.find(
      (c) => c.name.toLowerCase() === (cropName || '').toLowerCase()
    );
    return found ? found.icon : '🌱';
  };

  const filteredPlots = plots.filter((plot) => {
    const matchesSearch =
      plot.plot_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      plot.crop?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      plot.notes?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCrop =
      selectedCropFilter === 'All' ||
      plot.crop?.toLowerCase() === selectedCropFilter.toLowerCase();
    return matchesSearch && matchesCrop;
  });

  const totalAcres = plots.reduce((acc, p) => acc + (parseFloat(p.area) || 0), 0);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor="#080C0A" />

      {/* Header Bar */}
      <View style={styles.topBar}>
        <View style={styles.barLeft}>
          <TouchableOpacity
            style={styles.menuBtn}
            onPress={openDrawer}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="menu-outline" size={26} color="#FFFFFF" />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>Farm Plots</Text>
            <Text style={styles.headerSub}>Manage your land & crops</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.addBtn}
          onPress={openAddModal}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={20} color="#FFFFFF" />
          <Text style={styles.addBtnText}>Add Plot</Text>
        </TouchableOpacity>
      </View>

      {/* Quick Stats Summary */}
      <View style={styles.summaryBar}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryVal}>{plots.length}</Text>
          <Text style={styles.summaryLbl}>Registered Plots</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryVal}>{totalAcres.toFixed(1)}</Text>
          <Text style={styles.summaryLbl}>Total Land Area</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryVal}>
            {new Set(plots.map((p) => p.crop)).size}
          </Text>
          <Text style={styles.summaryLbl}>Crop Varieties</Text>
        </View>
      </View>

      {/* Search and Filters */}
      <View style={styles.searchSection}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={18} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search plots by name or notes..."
            placeholderTextColor="#6B7280"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color="#9CA3AF" />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Filter Pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterPills}
        >
          {['All', 'Tomato', 'Potato', 'Rice', 'Wheat', 'Corn', 'Chili'].map((c) => (
            <TouchableOpacity
              key={c}
              style={[
                styles.pill,
                selectedCropFilter === c && styles.pillActive,
              ]}
              onPress={() => setSelectedCropFilter(c)}
            >
              <Text
                style={[
                  styles.pillText,
                  selectedCropFilter === c && styles.pillTextActive,
                ]}
              >
                {c !== 'All' ? `${getCropIcon(c)} ` : ''}{c}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Plots List */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.accent.primary} />
          <Text style={styles.loadingText}>Syncing plots with Supabase...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredPlots}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.accent.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="leaf-outline" size={38} color="#10B981" />
              </View>
              <Text style={styles.emptyTitle}>No Farm Plots Found</Text>
              <Text style={styles.emptyDesc}>
                {searchQuery
                  ? 'No plots match your search criteria.'
                  : 'Start tracking your field blocks, soil types, and sowing schedules.'}
              </Text>
              {!searchQuery && (
                <TouchableOpacity
                  style={styles.emptyBtn}
                  onPress={openAddModal}
                  activeOpacity={0.8}
                >
                  <Ionicons name="add" size={18} color="#FFFFFF" />
                  <Text style={styles.emptyBtnText}>Create First Plot</Text>
                </TouchableOpacity>
              )}
            </View>
          }
          renderItem={({ item }) => {
            const cropIcon = getCropIcon(item.crop);
            return (
              <View style={styles.plotCard}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardHeaderLeft}>
                    <View style={styles.cropIconBadge}>
                      <Text style={{ fontSize: 24 }}>{cropIcon}</Text>
                    </View>
                    <View>
                      <Text style={styles.plotName}>{item.plot_name}</Text>
                      <Text style={styles.cropSubtitle}>{item.crop}</Text>
                    </View>
                  </View>

                  <View style={styles.areaBadge}>
                    <Ionicons name="resize-outline" size={13} color="#34D399" />
                    <Text style={styles.areaText}>
                      {item.area} {item.area_unit || 'Acres'}
                    </Text>
                  </View>
                </View>

                {/* Plot Meta Pills */}
                <View style={styles.metaRow}>
                  {item.soil_type && (
                    <View style={styles.metaChip}>
                      <Ionicons name="earth-outline" size={12} color="#9CA3AF" />
                      <Text style={styles.metaText}>{item.soil_type}</Text>
                    </View>
                  )}
                  {item.sowing_date && (
                    <View style={styles.metaChip}>
                      <Ionicons name="calendar-outline" size={12} color="#9CA3AF" />
                      <Text style={styles.metaText}>Sown: {item.sowing_date}</Text>
                    </View>
                  )}
                </View>

                {item.notes ? (
                  <Text style={styles.plotNotes} numberOfLines={2}>
                    {item.notes}
                  </Text>
                ) : null}

                {/* Card Actions */}
                <View style={styles.cardFooter}>
                  <TouchableOpacity
                    style={styles.scanActionBtn}
                    onPress={() => navigation.navigate('MainTabs', { screen: 'Scanner' })}
                  >
                    <Ionicons name="scan-outline" size={15} color="#34D399" />
                    <Text style={styles.scanActionText}>Scan Leaf</Text>
                  </TouchableOpacity>

                  <View style={styles.footerRight}>
                    <TouchableOpacity
                      style={styles.actionIconBtn}
                      onPress={() => openEditModal(item)}
                    >
                      <Ionicons name="create-outline" size={18} color="#9CA3AF" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionIconBtn, { marginLeft: 8 }]}
                      onPress={() => handleDeletePlot(item)}
                    >
                      <Ionicons name="trash-outline" size={18} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          }}
        />
      )}

      {/* Add / Edit Plot Modal */}
      <Modal
        visible={isModalOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsModalOpen(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>
                  {editingPlot ? 'Edit Farm Plot' : 'Add New Farm Plot'}
                </Text>
                <Text style={styles.modalSub}>
                  Syncs directly to your Supabase account
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsModalOpen(false)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={22} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              {/* Plot Name */}
              <Text style={styles.inputLabel}>Plot Name *</Text>
              <TextInput
                style={styles.formInput}
                placeholder="e.g. North Orchard Block A"
                placeholderTextColor="#6B7280"
                value={formData.plot_name}
                onChangeText={(val) => setFormData((p) => ({ ...p, plot_name: val }))}
              />

              {/* Crop Type Selector */}
              <Text style={styles.inputLabel}>Crop Cultivated *</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8, paddingBottom: 6 }}
              >
                {COMMON_CROPS.map((c) => (
                  <TouchableOpacity
                    key={c.name}
                    style={[
                      styles.cropSelectChip,
                      formData.crop === c.name && styles.cropSelectChipActive,
                    ]}
                    onPress={() => setFormData((p) => ({ ...p, crop: c.name }))}
                  >
                    <Text style={{ fontSize: 18 }}>{c.icon}</Text>
                    <Text
                      style={[
                        styles.cropSelectText,
                        formData.crop === c.name && styles.cropSelectTextActive,
                      ]}
                    >
                      {c.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Area & Unit */}
              <View style={styles.rowInputs}>
                <View style={{ flex: 1, marginRight: 10 }}>
                  <Text style={styles.inputLabel}>Area Size *</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="e.g. 2.5"
                    placeholderTextColor="#6B7280"
                    keyboardType="numeric"
                    value={formData.area}
                    onChangeText={(val) => setFormData((p) => ({ ...p, area: val }))}
                  />
                </View>
                <View style={{ width: 110 }}>
                  <Text style={styles.inputLabel}>Unit</Text>
                  <View style={styles.unitSelector}>
                    {AREA_UNITS.slice(0, 2).map((u) => (
                      <TouchableOpacity
                        key={u}
                        style={[
                          styles.unitBtn,
                          formData.area_unit === u && styles.unitBtnActive,
                        ]}
                        onPress={() => setFormData((p) => ({ ...p, area_unit: u }))}
                      >
                        <Text
                          style={[
                            styles.unitBtnText,
                            formData.area_unit === u && styles.unitBtnTextActive,
                          ]}
                        >
                          {u}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>

              {/* Sowing Date */}
              <Text style={styles.inputLabel}>Sowing / Planting Date (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.formInput}
                placeholder="2026-10-15"
                placeholderTextColor="#6B7280"
                value={formData.sowing_date}
                onChangeText={(val) => setFormData((p) => ({ ...p, sowing_date: val }))}
              />

              {/* Soil Type */}
              <Text style={styles.inputLabel}>Soil Type</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8, paddingBottom: 6 }}
              >
                {SOIL_TYPES.map((s) => (
                  <TouchableOpacity
                    key={s}
                    style={[
                      styles.soilChip,
                      formData.soil_type === s && styles.soilChipActive,
                    ]}
                    onPress={() => setFormData((p) => ({ ...p, soil_type: s }))}
                  >
                    <Text
                      style={[
                        styles.soilText,
                        formData.soil_type === s && styles.soilTextActive,
                      ]}
                    >
                      {s}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Notes */}
              <Text style={styles.inputLabel}>Field Notes / Irrigation Details</Text>
              <TextInput
                style={[styles.formInput, { height: 80, textAlignVertical: 'top' }]}
                placeholder="e.g. Drip irrigated, scheduled for weeding next Monday..."
                placeholderTextColor="#6B7280"
                multiline
                numberOfLines={3}
                value={formData.notes}
                onChangeText={(val) => setFormData((p) => ({ ...p, notes: val }))}
              />

              <View style={{ height: 20 }} />
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setIsModalOpen(false)}
                disabled={saving}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleSavePlot}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                    <Text style={styles.saveBtnText}>
                      {editingPlot ? 'Update Plot' : 'Save Plot'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#080C0A',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1A2620',
  },
  barLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#111A15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#1E2C24',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  headerSub: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  addBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 4,
  },
  summaryBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0E1612',
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#1A2620',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryVal: {
    fontSize: 17,
    fontWeight: '800',
    color: '#34D399',
  },
  summaryLbl: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 2,
    fontWeight: '500',
  },
  summaryDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#1A2620',
  },
  searchSection: {
    paddingHorizontal: 16,
    marginTop: 14,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111A15',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#1E2C24',
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 13,
    marginLeft: 8,
    paddingVertical: 0,
  },
  filterPills: {
    flexDirection: 'row',
    paddingVertical: 10,
    gap: 8,
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#111A15',
    borderWidth: 1,
    borderColor: '#1A2620',
  },
  pillActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderColor: '#10B981',
  },
  pillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  pillTextActive: {
    color: '#34D399',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 30,
    paddingTop: 6,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
  },
  loadingText: {
    color: '#9CA3AF',
    fontSize: 13,
    marginTop: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 50,
    paddingHorizontal: 20,
  },
  emptyIconCircle: {
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  emptyDesc: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 18,
  },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
  },
  emptyBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 6,
  },
  plotCard: {
    backgroundColor: '#0F1713',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1A2620',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cropIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#16231D',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#23362C',
  },
  plotName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  cropSubtitle: {
    fontSize: 12,
    color: '#34D399',
    marginTop: 1,
    fontWeight: '600',
  },
  areaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  areaText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#34D399',
    marginLeft: 4,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#16231D',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  metaText: {
    fontSize: 11,
    color: '#9CA3AF',
    marginLeft: 4,
  },
  plotNotes: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 10,
    lineHeight: 16,
    fontStyle: 'italic',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#1A2620',
  },
  scanActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  scanActionText: {
    fontSize: 12,
    color: '#34D399',
    fontWeight: '600',
    marginLeft: 4,
  },
  footerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#16231D',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#0F1713',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '90%',
    borderWidth: 1,
    borderColor: '#1A2620',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1A2620',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  modalSub: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#16231D',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalScroll: {
    maxHeight: 420,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#D1D5DB',
    marginBottom: 6,
    marginTop: 10,
  },
  formInput: {
    backgroundColor: '#16231D',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#23362C',
    color: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
  },
  rowInputs: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  unitSelector: {
    flexDirection: 'row',
    backgroundColor: '#16231D',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#23362C',
    overflow: 'hidden',
    height: 42,
  },
  unitBtn: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unitBtnActive: {
    backgroundColor: '#10B981',
  },
  unitBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  unitBtnTextActive: {
    color: '#FFFFFF',
  },
  cropSelectChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#16231D',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#23362C',
  },
  cropSelectChipActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderColor: '#10B981',
  },
  cropSelectText: {
    fontSize: 12,
    color: '#D1D5DB',
    marginLeft: 6,
    fontWeight: '500',
  },
  cropSelectTextActive: {
    color: '#34D399',
    fontWeight: '700',
  },
  soilChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#16231D',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#23362C',
  },
  soilChipActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderColor: '#10B981',
  },
  soilText: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  soilTextActive: {
    color: '#34D399',
    fontWeight: '700',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#1A2620',
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#16231D',
  },
  cancelBtnText: {
    color: '#9CA3AF',
    fontSize: 13,
    fontWeight: '600',
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#10B981',
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 4,
  },
});
