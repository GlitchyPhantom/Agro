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

const CATEGORIES = [
  { name: 'Fungicide', color: '#8B5CF6', bg: 'rgba(139, 92, 246, 0.15)', icon: 'shield-checkmark-outline' },
  { name: 'Insecticide', color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.15)', icon: 'bug-outline' },
  { name: 'Fertilizer', color: '#10B981', bg: 'rgba(16, 185, 129, 0.15)', icon: 'leaf-outline' },
  { name: 'Herbicide', color: '#EF4444', bg: 'rgba(239, 68, 68, 0.15)', icon: 'trash-bin-outline' },
  { name: 'Bio-Control / Organic', color: '#06B6D4', bg: 'rgba(6, 182, 212, 0.15)', icon: 'water-outline' },
  { name: 'Equipment / Other', color: '#64748B', bg: 'rgba(100, 116, 139, 0.15)', icon: 'construct-outline' },
];

const UNITS = ['g', 'kg', 'ml', 'L', 'packets', 'bottles'];

export default function InventoryScreen({ navigation }) {
  const { user } = useAuth();
  const { openDrawer } = useDrawer();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [saving, setSaving] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    item_name: '',
    category: 'Fungicide',
    quantity: '500',
    unit: 'g',
    active_ingredient: '',
    expiry_date: '',
    notes: '',
  });

  const fetchInventory = useCallback(async () => {
    if (!user?.id) return;
    try {
      // 1. Try Supabase direct query
      const { data, error } = await supabase
        .from('farm_inventory')
        .select('*')
        .eq('user_id', user.id)
        .order('category');

      if (!error && data) {
        setItems(data);
        return;
      }

      // 2. Fallback to backend API
      const res = await fetch(`${API_BASE_URL}/api/inventory`, {
        headers: { 'X-User-Id': user.id },
      });
      if (res.ok) {
        const resData = await res.json();
        setItems(resData.inventory || []);
        return;
      }
    } catch (err) {
      console.warn('Error fetching inventory:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchInventory();
  };

  const openAddModal = () => {
    setEditingItem(null);
    setFormData({
      item_name: '',
      category: 'Fungicide',
      quantity: '500',
      unit: 'g',
      active_ingredient: '',
      expiry_date: '',
      notes: '',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setFormData({
      item_name: item.item_name,
      category: item.category || 'Fungicide',
      quantity: String(item.quantity),
      unit: item.unit || 'g',
      active_ingredient: item.active_ingredient || '',
      expiry_date: item.expiry_date || '',
      notes: item.notes || '',
    });
    setIsModalOpen(true);
  };

  const handleSaveItem = async () => {
    if (!formData.item_name.trim()) {
      Alert.alert('Validation Error', 'Please enter the medicine or product name.');
      return;
    }
    if (!formData.quantity || isNaN(formData.quantity) || Number(formData.quantity) < 0) {
      Alert.alert('Validation Error', 'Please enter a valid stock quantity.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        item_name: formData.item_name.trim(),
        category: formData.category,
        quantity: parseFloat(formData.quantity),
        unit: formData.unit,
        active_ingredient: formData.active_ingredient.trim() || null,
        expiry_date: formData.expiry_date.trim() || null,
        notes: formData.notes.trim() || null,
        user_id: user.id,
      };

      if (editingItem) {
        const { error } = await supabase
          .from('farm_inventory')
          .update(payload)
          .eq('id', editingItem.id);

        if (error) {
          await fetch(`${API_BASE_URL}/api/inventory/${editingItem.id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'X-User-Id': user.id,
            },
            body: JSON.stringify(payload),
          });
        }
      } else {
        const { error } = await supabase.from('farm_inventory').insert([payload]);
        if (error) {
          await fetch(`${API_BASE_URL}/api/inventory`, {
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
      fetchInventory();
    } catch (err) {
      console.error('Save inventory error:', err);
      Alert.alert('Error', 'Failed to save inventory item.');
    } finally {
      setSaving(false);
    }
  };

  const adjustQuantity = async (item, delta) => {
    const current = parseFloat(item.quantity) || 0;
    const nextVal = Math.max(0, current + delta);
    // Optimistic UI update
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, quantity: nextVal } : i))
    );

    try {
      const { error } = await supabase
        .from('farm_inventory')
        .update({ quantity: nextVal })
        .eq('id', item.id);

      if (error) {
        await fetch(`${API_BASE_URL}/api/inventory/${item.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'X-User-Id': user.id,
          },
          body: JSON.stringify({ quantity: nextVal }),
        });
      }
    } catch (err) {
      console.warn('Adjust quantity failed:', err);
    }
  };

  const handleDeleteItem = (item) => {
    Alert.alert(
      'Delete Item',
      `Remove "${item.item_name}" from your shed inventory?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('farm_inventory')
                .delete()
                .eq('id', item.id);

              if (error) {
                await fetch(`${API_BASE_URL}/api/inventory/${item.id}`, {
                  method: 'DELETE',
                  headers: { 'X-User-Id': user.id },
                });
              }
              setItems((prev) => prev.filter((i) => i.id !== item.id));
            } catch (err) {
              Alert.alert('Error', 'Could not delete item.');
            }
          },
        },
      ]
    );
  };

  const getCategoryMeta = (catName) => {
    const found = CATEGORIES.find(
      (c) => c.name.toLowerCase() === (catName || '').toLowerCase()
    );
    return (
      found || {
        color: '#10B981',
        bg: 'rgba(16, 185, 129, 0.15)',
        icon: 'cube-outline',
      }
    );
  };

  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.item_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.active_ingredient?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.notes?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === 'All' ||
      item.category?.toLowerCase() === selectedCategory.toLowerCase();
    return matchesSearch && matchesCategory;
  });

  const lowStockCount = items.filter((i) => parseFloat(i.quantity) <= 200).length;

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
            <Text style={styles.headerTitle}>Shed Inventory</Text>
            <Text style={styles.headerSub}>Medicines, fertilizers & tools</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.addBtn}
          onPress={openAddModal}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={20} color="#FFFFFF" />
          <Text style={styles.addBtnText}>Add Item</Text>
        </TouchableOpacity>
      </View>

      {/* Quick Summary Bar */}
      <View style={styles.summaryBar}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryVal}>{items.length}</Text>
          <Text style={styles.summaryLbl}>Total In Stock</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryVal, lowStockCount > 0 && { color: '#F59E0B' }]}>
            {lowStockCount}
          </Text>
          <Text style={styles.summaryLbl}>Low Stock Alerts</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryVal}>
            {new Set(items.map((i) => i.category)).size}
          </Text>
          <Text style={styles.summaryLbl}>Categories</Text>
        </View>
      </View>

      {/* Search and Category Filters */}
      <View style={styles.searchSection}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={18} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search medicine, active ingredient, notes..."
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

        {/* Category Filter Pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterPills}
        >
          {['All', 'Fungicide', 'Insecticide', 'Fertilizer', 'Bio-Control / Organic'].map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[
                styles.pill,
                selectedCategory === cat && styles.pillActive,
              ]}
              onPress={() => setSelectedCategory(cat)}
            >
              <Text
                style={[
                  styles.pillText,
                  selectedCategory === cat && styles.pillTextActive,
                ]}
              >
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Inventory List */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.accent.primary} />
          <Text style={styles.loadingText}>Syncing inventory with Supabase...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredItems}
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
                <Ionicons name="cube-outline" size={38} color="#10B981" />
              </View>
              <Text style={styles.emptyTitle}>Shed Inventory Empty</Text>
              <Text style={styles.emptyDesc}>
                {searchQuery
                  ? 'No inventory items match your search.'
                  : 'Track your fertilizers, pesticides, and seeds to get treatment auto-deductions.'}
              </Text>
              {!searchQuery && (
                <TouchableOpacity
                  style={styles.emptyBtn}
                  onPress={openAddModal}
                  activeOpacity={0.8}
                >
                  <Ionicons name="add" size={18} color="#FFFFFF" />
                  <Text style={styles.emptyBtnText}>Add First Item</Text>
                </TouchableOpacity>
              )}
            </View>
          }
          renderItem={({ item }) => {
            const catMeta = getCategoryMeta(item.category);
            const isLow = parseFloat(item.quantity) <= 200;

            return (
              <View style={styles.itemCard}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardHeaderLeft}>
                    <View style={[styles.catBadge, { backgroundColor: catMeta.bg, borderColor: catMeta.color }]}>
                      <Ionicons name={catMeta.icon} size={14} color={catMeta.color} />
                      <Text style={[styles.catText, { color: catMeta.color }]}>
                        {item.category}
                      </Text>
                    </View>
                    <Text style={styles.itemName}>{item.item_name}</Text>
                    {item.active_ingredient ? (
                      <Text style={styles.ingredientText}>
                        Active: {item.active_ingredient}
                      </Text>
                    ) : null}
                  </View>

                  <View style={styles.stockBox}>
                    <Text style={[styles.stockVal, isLow && styles.lowStockVal]}>
                      {item.quantity}
                    </Text>
                    <Text style={styles.stockUnit}>{item.unit || 'g'}</Text>
                  </View>
                </View>

                {/* Expiry & Notes */}
                <View style={styles.metaRow}>
                  {item.expiry_date && (
                    <View style={styles.metaChip}>
                      <Ionicons name="calendar-outline" size={12} color="#9CA3AF" />
                      <Text style={styles.metaText}>Exp: {item.expiry_date}</Text>
                    </View>
                  )}
                  {isLow && (
                    <View style={[styles.metaChip, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
                      <Ionicons name="warning-outline" size={12} color="#F59E0B" />
                      <Text style={[styles.metaText, { color: '#F59E0B' }]}>Low Stock</Text>
                    </View>
                  )}
                </View>

                {item.notes ? (
                  <Text style={styles.itemNotes} numberOfLines={2}>
                    {item.notes}
                  </Text>
                ) : null}

                {/* Card Quick Adjustment & Actions */}
                <View style={styles.cardFooter}>
                  {/* Quick Quantity Counter */}
                  <View style={styles.quickCounter}>
                    <TouchableOpacity
                      style={styles.counterBtn}
                      onPress={() => adjustQuantity(item, -50)}
                    >
                      <Ionicons name="remove" size={15} color="#9CA3AF" />
                    </TouchableOpacity>
                    <Text style={styles.counterLabel}>Adjust Stock</Text>
                    <TouchableOpacity
                      style={styles.counterBtn}
                      onPress={() => adjustQuantity(item, 50)}
                    >
                      <Ionicons name="add" size={15} color="#34D399" />
                    </TouchableOpacity>
                  </View>

                  {/* Edit and Delete */}
                  <View style={styles.footerRight}>
                    <TouchableOpacity
                      style={styles.actionIconBtn}
                      onPress={() => openEditModal(item)}
                    >
                      <Ionicons name="create-outline" size={18} color="#9CA3AF" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionIconBtn, { marginLeft: 8 }]}
                      onPress={() => handleDeleteItem(item)}
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

      {/* Add / Edit Item Modal */}
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
                  {editingItem ? 'Edit Inventory Item' : 'Add Medicine / Supply'}
                </Text>
                <Text style={styles.modalSub}>
                  Keeps track of shed chemical & fertilizer stocks
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
              {/* Item Name */}
              <Text style={styles.inputLabel}>Product / Medicine Name *</Text>
              <TextInput
                style={styles.formInput}
                placeholder="e.g. Mancozeb 75% WP, Urea, Neem Oil..."
                placeholderTextColor="#6B7280"
                value={formData.item_name}
                onChangeText={(val) => setFormData((p) => ({ ...p, item_name: val }))}
              />

              {/* Category Selector */}
              <Text style={styles.inputLabel}>Category *</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8, paddingBottom: 6 }}
              >
                {CATEGORIES.map((c) => (
                  <TouchableOpacity
                    key={c.name}
                    style={[
                      styles.catSelectChip,
                      formData.category === c.name && {
                        backgroundColor: c.bg,
                        borderColor: c.color,
                      },
                    ]}
                    onPress={() => setFormData((p) => ({ ...p, category: c.name }))}
                  >
                    <Ionicons
                      name={c.icon}
                      size={14}
                      color={formData.category === c.name ? c.color : '#9CA3AF'}
                    />
                    <Text
                      style={[
                        styles.catSelectText,
                        formData.category === c.name && { color: c.color, fontWeight: '700' },
                      ]}
                    >
                      {c.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Quantity & Unit */}
              <View style={styles.rowInputs}>
                <View style={{ flex: 1, marginRight: 10 }}>
                  <Text style={styles.inputLabel}>Quantity In Stock *</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="e.g. 500"
                    placeholderTextColor="#6B7280"
                    keyboardType="numeric"
                    value={formData.quantity}
                    onChangeText={(val) => setFormData((p) => ({ ...p, quantity: val }))}
                  />
                </View>
                <View style={{ width: 140 }}>
                  <Text style={styles.inputLabel}>Unit</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ gap: 4 }}
                  >
                    {UNITS.map((u) => (
                      <TouchableOpacity
                        key={u}
                        style={[
                          styles.unitPill,
                          formData.unit === u && styles.unitPillActive,
                        ]}
                        onPress={() => setFormData((p) => ({ ...p, unit: u }))}
                      >
                        <Text
                          style={[
                            styles.unitPillText,
                            formData.unit === u && styles.unitPillTextActive,
                          ]}
                        >
                          {u}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </View>

              {/* Active Ingredient */}
              <Text style={styles.inputLabel}>Active Ingredient (Chemical composition)</Text>
              <TextInput
                style={styles.formInput}
                placeholder="e.g. Mancozeb 75%, Copper Oxychloride, Azadirachtin"
                placeholderTextColor="#6B7280"
                value={formData.active_ingredient}
                onChangeText={(val) => setFormData((p) => ({ ...p, active_ingredient: val }))}
              />

              {/* Expiry Date */}
              <Text style={styles.inputLabel}>Expiry Date (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.formInput}
                placeholder="2027-12-31"
                placeholderTextColor="#6B7280"
                value={formData.expiry_date}
                onChangeText={(val) => setFormData((p) => ({ ...p, expiry_date: val }))}
              />

              {/* Notes */}
              <Text style={styles.inputLabel}>Usage Instructions / Notes</Text>
              <TextInput
                style={[styles.formInput, { height: 75, textAlignVertical: 'top' }]}
                placeholder="e.g. 2g per liter for leaf spot spraying..."
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
                onPress={handleSaveItem}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                    <Text style={styles.saveBtnText}>
                      {editingItem ? 'Update Item' : 'Save Item'}
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
  itemCard: {
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
    flex: 1,
    marginRight: 10,
  },
  catBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    marginBottom: 6,
  },
  catText: {
    fontSize: 10,
    fontWeight: '700',
    marginLeft: 4,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  ingredientText: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  stockBox: {
    alignItems: 'flex-end',
    backgroundColor: '#16231D',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#23362C',
  },
  stockVal: {
    fontSize: 18,
    fontWeight: '800',
    color: '#34D399',
  },
  lowStockVal: {
    color: '#F59E0B',
  },
  stockUnit: {
    fontSize: 10,
    color: '#9CA3AF',
    fontWeight: '600',
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
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
  itemNotes: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 8,
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
  quickCounter: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#16231D',
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: '#23362C',
  },
  counterBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#111A15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  counterLabel: {
    fontSize: 11,
    color: '#D1D5DB',
    paddingHorizontal: 8,
    fontWeight: '600',
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
  catSelectChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#16231D',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#23362C',
  },
  catSelectText: {
    fontSize: 12,
    color: '#D1D5DB',
    marginLeft: 6,
  },
  rowInputs: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  unitPill: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#16231D',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#23362C',
  },
  unitPillActive: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  unitPillText: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '600',
  },
  unitPillTextActive: {
    color: '#FFFFFF',
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
