import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import {
  Package,
  Plus,
  Trash2,
  Edit3,
  Search,
  Filter,
  FlaskConical,
  Beaker,
  Sprout,
  AlertTriangle,
  Calendar,
  Check,
  Copy,
  Minus,
  AlertCircle,
  Clock,
  ShieldCheck,
  ChevronRight,
  X,
} from "lucide-react";
import toast from "react-hot-toast";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

const CATEGORIES = [
  "Fungicide",
  "Pesticide",
  "Fertilizer",
  "Insecticide",
  "Herbicide",
  "Bio-Control / Organic",
  "Seeds",
  "Other",
];

const COMMON_AGRI_CHEMICALS = [
  { name: "Mancozeb 75% WP", category: "Fungicide", unit: "g", defaultQty: 500, active: "Mancozeb 75%" },
  { name: "Copper Oxychloride 50% WP", category: "Fungicide", unit: "g", defaultQty: 500, active: "Copper Oxychloride" },
  { name: "Neem Oil 10000 PPM", category: "Bio-Control / Organic", unit: "ml", defaultQty: 1000, active: "Azadirachtin 1%" },
  { name: "Trichoderma Viride", category: "Bio-Control / Organic", unit: "kg", defaultQty: 2, active: "Trichoderma 1% WP" },
  { name: "Chlorpyrifos 20% EC", category: "Insecticide", unit: "ml", defaultQty: 500, active: "Chlorpyrifos 20%" },
  { name: "Imidacloprid 17.8% SL", category: "Insecticide", unit: "ml", defaultQty: 250, active: "Imidacloprid" },
  { name: "Urea 46% N", category: "Fertilizer", unit: "kg", defaultQty: 50, active: "Nitrogen 46%" },
  { name: "DAP (18-46-0)", category: "Fertilizer", unit: "kg", defaultQty: 50, active: "NPK 18:46:0" },
  { name: "NPK 19-19-19 Water Soluble", category: "Fertilizer", unit: "kg", defaultQty: 5, active: "Balanced NPK" },
  { name: "Carbendazim 50% WP", category: "Fungicide", unit: "g", defaultQty: 250, active: "Carbendazim" },
];

const UNITS = ["ml", "L", "g", "kg", "packets", "bottles", "bags"];

export default function Inventory() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [saving, setSaving] = useState(false);
  const [sqlCopied, setSqlCopied] = useState(false);
  const [needsSqlSetup, setNeedsSqlSetup] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    item_name: "",
    category: "Fungicide",
    quantity: "500",
    unit: "g",
    active_ingredient: "",
    expiry_date: "",
    notes: "",
  });

  const fetchInventory = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      // 1. Try Supabase direct query
      const { data, error } = await supabase
        .from("farm_inventory")
        .select("*")
        .eq("user_id", user.id)
        .order("category");

      if (!error && data) {
        setItems(data);
        setNeedsSqlSetup(false);
        setLoading(false);
        return;
      }

      if (error && (error.code === "PGRST205" || error.message?.includes("not find the table"))) {
        setNeedsSqlSetup(true);
      }

      // 2. Try FastAPI Backend
      try {
        const res = await fetch(`${API}/api/inventory`, {
          headers: { "X-User-Id": user.id },
        });
        if (res.ok) {
          const resData = await res.json();
          setItems(resData.inventory || []);
          setLoading(false);
          return;
        }
      } catch (err) {
        console.warn("Backend /api/inventory fetch failed:", err);
      }

      // 3. Fallback: local storage cache for demo/offline
      const local = localStorage.getItem(`agrointel_inventory_${user.id}`);
      if (local) {
        setItems(JSON.parse(local));
      } else {
        // Initial default resources for testing
        const defaultStarter = [
          {
            id: "inv-1",
            item_name: "Mancozeb 75% WP",
            category: "Fungicide",
            quantity: 800,
            unit: "g",
            active_ingredient: "Mancozeb 75%",
            expiry_date: "2027-08-30",
            notes: "Used for early/late blight spray.",
            created_at: new Date().toISOString(),
          },
          {
            id: "inv-2",
            item_name: "Neem Oil Extract 10000 PPM",
            category: "Bio-Control / Organic",
            quantity: 1500,
            unit: "ml",
            active_ingredient: "Azadirachtin 1%",
            expiry_date: "2026-12-15",
            notes: "Organic preventative foliar spray.",
            created_at: new Date().toISOString(),
          },
          {
            id: "inv-3",
            item_name: "NPK 19-19-19 Foliar Grade",
            category: "Fertilizer",
            quantity: 4.5,
            unit: "kg",
            active_ingredient: "Water Soluble NPK",
            expiry_date: "2028-01-01",
            notes: "Foliar nutrition boost for flowering stage.",
            created_at: new Date().toISOString(),
          },
        ];
        setItems(defaultStarter);
        localStorage.setItem(`agrointel_inventory_${user.id}`, JSON.stringify(defaultStarter));
      }
    } catch (e) {
      console.error("Error loading inventory:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, [user?.id]);

  const openAddModal = () => {
    setEditingItem(null);
    setFormData({
      item_name: "",
      category: "Fungicide",
      quantity: "500",
      unit: "g",
      active_ingredient: "",
      expiry_date: "",
      notes: "",
    });
    setIsModalOpen(true);
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setFormData({
      item_name: item.item_name,
      category: item.category || "Fungicide",
      quantity: item.quantity,
      unit: item.unit || "g",
      active_ingredient: item.active_ingredient || "",
      expiry_date: item.expiry_date || "",
      notes: item.notes || "",
    });
    setIsModalOpen(true);
  };

  const handleSelectPreset = (preset) => {
    setFormData({
      ...formData,
      item_name: preset.name,
      category: preset.category,
      unit: preset.unit,
      quantity: preset.defaultQty.toString(),
      active_ingredient: preset.active,
    });
  };

  const handleSaveItem = async (e) => {
    e.preventDefault();
    if (!formData.item_name.trim() || !formData.category) {
      toast.error("Please specify item name and category.");
      return;
    }

    setSaving(true);
    const itemPayload = {
      user_id: user.id,
      item_name: formData.item_name.trim(),
      category: formData.category,
      quantity: parseFloat(formData.quantity) || 0,
      unit: formData.unit,
      active_ingredient: formData.active_ingredient?.trim() || null,
      expiry_date: formData.expiry_date || null,
      notes: formData.notes?.trim() || null,
    };

    try {
      if (editingItem) {
        // UPDATE
        let updated = { ...editingItem, ...itemPayload, updated_at: new Date().toISOString() };
        const { data, error } = await supabase
          .from("farm_inventory")
          .update(itemPayload)
          .eq("id", editingItem.id)
          .select();

        if (error) {
          await fetch(`${API}/api/inventory/${editingItem.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json", "X-User-Id": user.id },
            body: JSON.stringify(itemPayload),
          });
        } else if (data && data[0]) {
          updated = data[0];
        }

        const next = items.map((i) => (i.id === editingItem.id ? updated : i));
        setItems(next);
        localStorage.setItem(`agrointel_inventory_${user.id}`, JSON.stringify(next));
        toast.success("Inventory item updated!");
      } else {
        // CREATE
        let newRecord = {
          id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `inv-${Date.now()}`,
          ...itemPayload,
          created_at: new Date().toISOString(),
        };

        const { data, error } = await supabase
          .from("farm_inventory")
          .insert([itemPayload])
          .select();

        if (error) {
          try {
            const res = await fetch(`${API}/api/inventory`, {
              method: "POST",
              headers: { "Content-Type": "application/json", "X-User-Id": user.id },
              body: JSON.stringify(itemPayload),
            });
            if (res.ok) {
              const resData = await res.json();
              if (resData.item) newRecord = resData.item;
            }
          } catch (err) {
            console.warn("Backend add inventory failed:", err);
          }
        } else if (data && data[0]) {
          newRecord = data[0];
        }

        const next = [newRecord, ...items];
        setItems(next);
        localStorage.setItem(`agrointel_inventory_${user.id}`, JSON.stringify(next));
        toast.success("Item added to farm shed!");
      }

      setIsModalOpen(false);
    } catch (err) {
      console.error("Save inventory error:", err);
      toast.error("Failed to save. Saved in local cache.");
    } finally {
      setSaving(false);
    }
  };

  // Quick Stock Adjuster (+ / - stepper for in-field updates)
  const adjustStock = async (item, delta) => {
    const currentQty = parseFloat(item.quantity) || 0;
    const step = item.unit === "kg" || item.unit === "L" ? 0.5 : 50;
    const newQty = Math.max(0, Math.round((currentQty + delta * step) * 10) / 10);

    const updated = { ...item, quantity: newQty, updated_at: new Date().toISOString() };
    const next = items.map((i) => (i.id === item.id ? updated : i));
    setItems(next);
    localStorage.setItem(`agrointel_inventory_${user.id}`, JSON.stringify(next));

    try {
      await supabase.from("farm_inventory").update({ quantity: newQty }).eq("id", item.id);
      try {
        await fetch(`${API}/api/inventory/${item.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", "X-User-Id": user.id },
          body: JSON.stringify({ quantity: newQty }),
        });
      } catch {}
    } catch (e) {
      console.warn("Could not sync stock change:", e);
    }
  };

  const handleDeleteItem = async (itemId) => {
    if (!window.confirm("Remove this item from your farm inventory?")) return;

    try {
      await supabase.from("farm_inventory").delete().eq("id", itemId);
      try {
        await fetch(`${API}/api/inventory/${itemId}`, {
          method: "DELETE",
          headers: { "X-User-Id": user.id },
        });
      } catch {}

      const next = items.filter((i) => i.id !== itemId);
      setItems(next);
      localStorage.setItem(`agrointel_inventory_${user.id}`, JSON.stringify(next));
      toast.success("Item removed from shed.");
    } catch (err) {
      toast.error("Could not delete item.");
    }
  };

  const copySqlToClipboard = () => {
    const sqlCode = `-- Run this in Supabase SQL Editor:
CREATE TABLE IF NOT EXISTS "farm_inventory" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" UUID REFERENCES "profiles"("id") ON DELETE CASCADE,
  "item_name" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "quantity" NUMERIC(10, 2) NOT NULL DEFAULT 0,
  "unit" TEXT NOT NULL DEFAULT 'ml',
  "active_ingredient" TEXT,
  "expiry_date" DATE,
  "notes" TEXT,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);
ALTER TABLE "farm_inventory" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own inventory" ON "farm_inventory" FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own inventory" ON "farm_inventory" FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own inventory" ON "farm_inventory" FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own inventory" ON "farm_inventory" FOR DELETE USING (auth.uid() = user_id);`;

    navigator.clipboard.writeText(sqlCode);
    setSqlCopied(true);
    toast.success("SQL copied! Paste it in your Supabase SQL Editor.");
    setTimeout(() => setSqlCopied(false), 3500);
  };

  const getCategoryColor = (cat) => {
    switch (cat) {
      case "Fungicide":
        return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
      case "Pesticide":
      case "Insecticide":
        return "bg-amber-500/15 text-amber-400 border-amber-500/30";
      case "Fertilizer":
        return "bg-blue-500/15 text-blue-400 border-blue-500/30";
      case "Bio-Control / Organic":
        return "bg-teal-500/15 text-teal-400 border-teal-500/30";
      default:
        return "bg-purple-500/15 text-purple-400 border-purple-500/30";
    }
  };

  // Stats calculation
  const totalItems = items.length;
  const fungicidesAndPesticides = items.filter((i) =>
    ["Fungicide", "Pesticide", "Insecticide"].includes(i.category)
  ).length;
  const fertilizers = items.filter((i) => i.category === "Fertilizer").length;
  const lowStockItems = items.filter((i) => parseFloat(i.quantity) <= 0.5).length;

  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.item_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.active_ingredient && item.active_ingredient.toLowerCase().includes(searchQuery.toLowerCase())) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      selectedCategory === "All" || item.category.toLowerCase() === selectedCategory.toLowerCase();

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#0a0f0d] px-4 pt-6 pb-12">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Supabase Notice Banner if SQL Table hasn't been created yet */}
        {needsSqlSetup && (
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-fade-in">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-6 h-6 text-amber-400 flex-shrink-0" />
              <div>
                <p className="font-semibold text-sm">Supabase Sync Notice</p>
                <p className="text-xs text-amber-300/80">
                  Inventory is currently stored in local cache. To sync across devices, run the SQL script in your Supabase SQL Editor.
                </p>
              </div>
            </div>
            <button
              onClick={copySqlToClipboard}
              className="px-4 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-semibold flex items-center gap-2 border border-amber-500/40 transition-all flex-shrink-0"
            >
              {sqlCopied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
              {sqlCopied ? "SQL Copied!" : "Copy Supabase SQL"}
            </button>
          </div>
        )}

        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold tracking-wider uppercase mb-1">
              <Package className="w-4 h-4" />
              <span>Shed Resources & Medicine Cabinet</span>
            </div>
            <h1 className="font-[Outfit] text-3xl sm:text-4xl font-bold text-white tracking-tight">
              Farm <span className="gradient-text">Inventory</span>
            </h1>
            <p className="text-gray-400 text-sm mt-1">
              Log pesticides, fungicides, and fertilizers you have in stock so AI can formulate personalized, money-saving treatments.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={openAddModal} className="btn-primary py-2.5 px-6 shadow-lg shadow-green-500/20">
              <Plus className="w-5 h-5" />
              Add Resource
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-5">
          <div className="glass-card p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider text-gray-400 font-medium">In Shed</p>
                <h3 className="text-3xl font-[Outfit] font-bold text-white mt-1">{totalItems}</h3>
                <p className="text-xs text-emerald-400 mt-1">Stored products</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Package className="w-6 h-6" />
              </div>
            </div>
          </div>

          <div className="glass-card p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider text-gray-400 font-medium">Plant Medicines</p>
                <h3 className="text-3xl font-[Outfit] font-bold text-white mt-1">{fungicidesAndPesticides}</h3>
                <p className="text-xs text-amber-400 mt-1">Fungicides & Sprays</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <FlaskConical className="w-6 h-6" />
              </div>
            </div>
          </div>

          <div className="glass-card p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider text-gray-400 font-medium">Fertilizers</p>
                <h3 className="text-3xl font-[Outfit] font-bold text-white mt-1">{fertilizers}</h3>
                <p className="text-xs text-blue-400 mt-1">Soil & foliar nutrients</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                <Sprout className="w-6 h-6" />
              </div>
            </div>
          </div>

          <div className="glass-card p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider text-gray-400 font-medium">Low / Empty Stock</p>
                <h3 className="text-3xl font-[Outfit] font-bold text-white mt-1">{lowStockItems}</h3>
                <p className="text-xs text-red-400 mt-1">Refill needed</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
                <AlertTriangle className="w-6 h-6" />
              </div>
            </div>
          </div>
        </div>

        {/* Filter Pills & Search */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by chemical name, active formula..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field pl-10 py-2.5 text-sm"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => setSelectedCategory("All")}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                selectedCategory === "All"
                  ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20"
                  : "bg-[#141e19] text-gray-400 hover:text-white border border-[#2a3a34]"
              }`}
            >
              All
            </button>
            {["Fungicide", "Pesticide", "Fertilizer", "Bio-Control / Organic"].map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                  selectedCategory === cat
                    ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20"
                    : "bg-[#141e19] text-gray-400 hover:text-white border border-[#2a3a34]"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Inventory Items Grid */}
        {loading ? (
          <div className="text-center py-20">
            <div className="loading-dots">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-16 glass-card border-dashed">
            <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-4 border border-emerald-500/20 text-emerald-400">
              <FlaskConical className="w-8 h-8" />
            </div>
            <h3 className="font-[Outfit] text-xl font-semibold text-white mb-2">No Items in Inventory</h3>
            <p className="text-gray-400 text-sm max-w-md mx-auto mb-6">
              {searchQuery
                ? "No chemical or fertilizer matches your current query."
                : "Add chemicals and fertilizers you have in your shed. When you scan a diseased plant, the AI will prioritize using these existing products to save you money!"}
            </p>
            <button onClick={openAddModal} className="btn-primary py-2.5 px-6">
              <Plus className="w-4 h-4" /> Add First Item
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredItems.map((item) => {
              const isLowStock = parseFloat(item.quantity) <= 0.5;
              return (
                <div
                  key={item.id}
                  className="glass-card p-6 flex flex-col justify-between group hover:border-emerald-500/50 transition-all duration-300"
                >
                  <div>
                    {/* Top Header */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shadow-inner">
                          <FlaskConical className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-[Outfit] font-bold text-base text-white group-hover:text-emerald-300 transition-colors">
                            {item.item_name}
                          </h3>
                          <span
                            className={`inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full border mt-0.5 ${getCategoryColor(
                              item.category
                            )}`}
                          >
                            {item.category}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => openEditModal(item)}
                          className="p-1.5 text-gray-400 hover:text-emerald-400 hover:bg-white/5 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteItem(item.id)}
                          className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Active Ingredient */}
                    {item.active_ingredient && (
                      <div className="mb-3 px-2.5 py-1.5 rounded-lg bg-black/20 border border-white/5 flex items-center gap-2">
                        <span className="text-[10px] uppercase font-bold text-gray-400">Formula:</span>
                        <span className="text-xs text-gray-300 font-medium truncate">
                          {item.active_ingredient}
                        </span>
                      </div>
                    )}

                    {/* Stock Quantity Card with Stepper */}
                    <div className="p-3.5 rounded-xl bg-[#0e1612] border border-[#1f2d26] mb-3 flex items-center justify-between">
                      <div>
                        <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Available Stock</p>
                        <div className="flex items-baseline gap-1 mt-0.5">
                          <span
                            className={`text-2xl font-[Outfit] font-bold ${
                              isLowStock ? "text-amber-400" : "text-white"
                            }`}
                          >
                            {item.quantity}
                          </span>
                          <span className="text-xs font-semibold text-emerald-400">{item.unit}</span>
                          {isLowStock && (
                            <span className="ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30">
                              Low
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Quick Adjuster Stepper */}
                      <div className="flex items-center gap-1.5 bg-[#141e19] p-1 rounded-xl border border-[#2a3a34]">
                        <button
                          onClick={() => adjustStock(item, -1)}
                          className="w-7 h-7 rounded-lg bg-black/30 hover:bg-white/10 text-gray-300 hover:text-white flex items-center justify-center transition-colors"
                          title="Decrease used quantity"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => adjustStock(item, 1)}
                          className="w-7 h-7 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 flex items-center justify-center transition-colors"
                          title="Increase stock"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Expiry Date */}
                    {item.expiry_date && (
                      <div className="flex items-center gap-1.5 text-xs text-gray-400 px-1 mb-2">
                        <Calendar className="w-3.5 h-3.5 text-gray-500" />
                        <span>Valid until: {new Date(item.expiry_date).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}</span>
                      </div>
                    )}

                    {item.notes && (
                      <p className="text-xs text-gray-400 italic line-clamp-2 px-1 mb-2">
                        "{item.notes}"
                      </p>
                    )}
                  </div>

                  {/* Ready Indicator */}
                  <div className="pt-3 border-t border-[#1f2d26]/80 flex items-center justify-between text-xs">
                    <span className="text-gray-400 flex items-center gap-1 text-[11px]">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      Ready for AI Matching
                    </span>
                    <Link
                      to="/scan"
                      className="text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1 text-[11px]"
                    >
                      Use in Scan
                      <ChevronRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add / Edit Inventory Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="glass-card max-w-lg w-full p-6 sm:p-8 relative bg-[#0e1612] border border-[#2a3a34] shadow-2xl max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-5 right-5 text-gray-400 hover:text-white p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <FlaskConical className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-[Outfit] text-2xl font-bold text-white">
                  {editingItem ? "Edit Farm Resource" : "Add Resource to Shed"}
                </h2>
                <p className="text-xs text-gray-400">Log chemicals and fertilizers you currently have in stock</p>
              </div>
            </div>

            {/* Quick Presets Picker */}
            {!editingItem && (
              <div className="mb-4">
                <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                  ⚡ Quick Pick Common Agri-Inputs
                </label>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                  {COMMON_AGRI_CHEMICALS.map((preset) => (
                    <button
                      type="button"
                      key={preset.name}
                      onClick={() => handleSelectPreset(preset)}
                      className="text-xs px-2.5 py-1 rounded-lg bg-[#141e19] hover:bg-emerald-500/20 hover:border-emerald-500/40 border border-[#2a3a34] text-gray-300 transition-colors text-left"
                    >
                      {preset.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <form onSubmit={handleSaveItem} className="space-y-4">
              {/* Item Name */}
              <div>
                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                  Product / Chemical Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mancozeb 75% WP, Neem Oil, Urea"
                  value={formData.item_name}
                  onChange={(e) => setFormData({ ...formData, item_name: e.target.value })}
                  className="input-field text-sm"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                  Category *
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="input-field text-sm bg-[#111916]"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c} className="bg-[#0a0f0d]">
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {/* Quantity & Unit */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                    Quantity In Stock *
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    required
                    placeholder="e.g. 500"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    className="input-field text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                    Unit
                  </label>
                  <select
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="input-field text-sm bg-[#111916]"
                  >
                    {UNITS.map((u) => (
                      <option key={u} value={u} className="bg-[#0a0f0d]">
                        {u}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Active Ingredient */}
              <div>
                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                  Active Ingredient / Formulation (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Mancozeb 75%, Copper Oxychloride, Azadirachtin"
                  value={formData.active_ingredient}
                  onChange={(e) => setFormData({ ...formData, active_ingredient: e.target.value })}
                  className="input-field text-sm"
                />
              </div>

              {/* Expiry Date */}
              <div>
                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                  Expiry Date (Optional)
                </label>
                <input
                  type="date"
                  value={formData.expiry_date}
                  onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                  className="input-field text-sm bg-[#111916]"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                  Notes
                </label>
                <textarea
                  rows="2"
                  placeholder="Storage location in shed, batch, or specific use..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="input-field text-sm resize-none"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="btn-secondary flex-1 justify-center py-2.5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-primary flex-1 justify-center py-2.5 disabled:opacity-50"
                >
                  {saving ? "Saving..." : editingItem ? "Update Resource" : "Add to Shed"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
