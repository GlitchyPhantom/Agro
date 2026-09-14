import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import {
  MapPin,
  Plus,
  Trash2,
  Edit3,
  Calendar,
  Layers,
  Sprout,
  ScanLine,
  Search,
  Filter,
  X,
  AlertCircle,
  Copy,
  Check,
  CheckCircle2,
  ArrowRight,
  TrendingUp,
} from "lucide-react";
import toast from "react-hot-toast";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

const COMMON_CROPS = [
  { name: "Tomato", icon: "🍅" },
  { name: "Potato", icon: "🥔" },
  { name: "Rice (Paddy)", icon: "🌾" },
  { name: "Wheat", icon: "🌾" },
  { name: "Corn (Maize)", icon: "🌽" },
  { name: "Cotton", icon: "🌿" },
  { name: "Chili", icon: "🌶️" },
  { name: "Sugarcane", icon: "🎋" },
  { name: "Onion", icon: "🧅" },
  { name: "Apple", icon: "🍎" },
  { name: "Grape", icon: "🍇" },
];

const SOIL_TYPES = [
  "Alluvial Soil",
  "Black Cotton Soil",
  "Red & Yellow Soil",
  "Loamy Soil",
  "Sandy Soil",
  "Clayey Soil",
  "Laterite Soil",
];

const AREA_UNITS = ["Acres", "Hectares", "Bigha", "Guntha"];

export default function FarmProfile() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [plots, setPlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCropFilter, setSelectedCropFilter] = useState("All");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlot, setEditingPlot] = useState(null);
  const [saving, setSaving] = useState(false);
  const [sqlCopied, setSqlCopied] = useState(false);
  const [needsSqlSetup, setNeedsSqlSetup] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    plot_name: "",
    area: "",
    area_unit: "Acres",
    crop: "Tomato",
    sowing_date: new Date().toISOString().split("T")[0],
    soil_type: "Loamy Soil",
    notes: "",
  });

  const fetchPlots = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      // 1. Try Supabase JS client directly
      const { data, error } = await supabase
        .from("farm_plots")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (!error && data) {
        setPlots(data);
        setNeedsSqlSetup(false);
        setLoading(false);
        return;
      }

      if (error && (error.code === "PGRST205" || error.message?.includes("not find the table"))) {
        setNeedsSqlSetup(true);
      }

      // 2. Try FastAPI Backend
      try {
        const res = await fetch(`${API}/api/plots`, {
          headers: { "X-User-Id": user.id },
        });
        if (res.ok) {
          const resData = await res.json();
          setPlots(resData.plots || []);
          setLoading(false);
          return;
        }
      } catch (err) {
        console.warn("Backend /api/plots fetch failed:", err);
      }

      // 3. Graceful fallback: localStorage cache for demo/offline
      const local = localStorage.getItem(`agrointel_plots_${user.id}`);
      if (local) {
        setPlots(JSON.parse(local));
      } else {
        // Starter default plot for first time users
        const defaultStarter = [
          {
            id: "starter-1",
            plot_name: "North Orchard Block",
            area: 2.5,
            area_unit: "Acres",
            crop: "Tomato",
            sowing_date: new Date(Date.now() - 35 * 86400000).toISOString().split("T")[0],
            soil_type: "Loamy Soil",
            notes: "Main greenhouse section with drip irrigation.",
            created_at: new Date().toISOString(),
          },
        ];
        setPlots(defaultStarter);
        localStorage.setItem(`agrointel_plots_${user.id}`, JSON.stringify(defaultStarter));
      }
    } catch (e) {
      console.error("Error loading plots:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlots();
  }, [user?.id]);

  const openAddModal = () => {
    setEditingPlot(null);
    setFormData({
      plot_name: "",
      area: "2.0",
      area_unit: "Acres",
      crop: "Tomato",
      sowing_date: new Date().toISOString().split("T")[0],
      soil_type: "Loamy Soil",
      notes: "",
    });
    setIsModalOpen(true);
  };

  const openEditModal = (plot) => {
    setEditingPlot(plot);
    setFormData({
      plot_name: plot.plot_name,
      area: plot.area,
      area_unit: plot.area_unit || "Acres",
      crop: plot.crop,
      sowing_date: plot.sowing_date || "",
      soil_type: plot.soil_type || "Loamy Soil",
      notes: plot.notes || "",
    });
    setIsModalOpen(true);
  };

  const handleSavePlot = async (e) => {
    e.preventDefault();
    if (!formData.plot_name.trim() || !formData.area || !formData.crop.trim()) {
      toast.error("Please fill in plot name, area, and crop.");
      return;
    }

    setSaving(true);
    const plotPayload = {
      user_id: user.id,
      plot_name: formData.plot_name.trim(),
      area: parseFloat(formData.area),
      area_unit: formData.area_unit,
      crop: formData.crop.trim(),
      sowing_date: formData.sowing_date || null,
      soil_type: formData.soil_type || null,
      notes: formData.notes?.trim() || null,
    };

    try {
      if (editingPlot) {
        // UPDATE
        let updatedItem = { ...editingPlot, ...plotPayload, updated_at: new Date().toISOString() };
        // Try Supabase direct
        const { data, error } = await supabase
          .from("farm_plots")
          .update(plotPayload)
          .eq("id", editingPlot.id)
          .select();

        if (error) {
          // Try backend
          await fetch(`${API}/api/plots/${editingPlot.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json", "X-User-Id": user.id },
            body: JSON.stringify(plotPayload),
          });
        } else if (data && data[0]) {
          updatedItem = data[0];
        }

        const nextPlots = plots.map((p) => (p.id === editingPlot.id ? updatedItem : p));
        setPlots(nextPlots);
        localStorage.setItem(`agrointel_plots_${user.id}`, JSON.stringify(nextPlots));
        toast.success("Plot updated successfully!");
      } else {
        // CREATE
        let newRecord = {
          id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `plot-${Date.now()}`,
          ...plotPayload,
          created_at: new Date().toISOString(),
        };

        const { data, error } = await supabase
          .from("farm_plots")
          .insert([plotPayload])
          .select();

        if (error) {
          // Try backend
          try {
            const res = await fetch(`${API}/api/plots`, {
              method: "POST",
              headers: { "Content-Type": "application/json", "X-User-Id": user.id },
              body: JSON.stringify(plotPayload),
            });
            if (res.ok) {
              const resData = await res.json();
              if (resData.plot) newRecord = resData.plot;
            }
          } catch (err) {
            console.warn("Backend add plot failed, using client record:", err);
          }
        } else if (data && data[0]) {
          newRecord = data[0];
        }

        const nextPlots = [newRecord, ...plots];
        setPlots(nextPlots);
        localStorage.setItem(`agrointel_plots_${user.id}`, JSON.stringify(nextPlots));
        toast.success("New plot added to farm profile!");
      }

      setIsModalOpen(false);
    } catch (err) {
      console.error("Save plot error:", err);
      toast.error("Failed to save plot. Stored locally.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePlot = async (plotId) => {
    if (!window.confirm("Are you sure you want to delete this plot from your farm?")) return;

    try {
      await supabase.from("farm_plots").delete().eq("id", plotId);
      try {
        await fetch(`${API}/api/plots/${plotId}`, {
          method: "DELETE",
          headers: { "X-User-Id": user.id },
        });
      } catch {}

      const nextPlots = plots.filter((p) => p.id !== plotId);
      setPlots(nextPlots);
      localStorage.setItem(`agrointel_plots_${user.id}`, JSON.stringify(nextPlots));
      toast.success("Plot removed.");
    } catch (err) {
      toast.error("Could not delete plot.");
    }
  };

  const copySqlToClipboard = () => {
    const sqlCode = `-- Run this in Supabase SQL Editor:
CREATE TABLE IF NOT EXISTS "farm_plots" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" UUID REFERENCES "profiles"("id") ON DELETE CASCADE,
  "plot_name" TEXT NOT NULL,
  "area" NUMERIC(10, 2) NOT NULL,
  "area_unit" TEXT NOT NULL DEFAULT 'Acres',
  "crop" TEXT NOT NULL,
  "sowing_date" DATE,
  "soil_type" TEXT,
  "notes" TEXT,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);
ALTER TABLE "farm_plots" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own plots" ON "farm_plots" FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own plots" ON "farm_plots" FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own plots" ON "farm_plots" FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own plots" ON "farm_plots" FOR DELETE USING (auth.uid() = user_id);`;

    navigator.clipboard.writeText(sqlCode);
    setSqlCopied(true);
    toast.success("SQL copied! Paste it in your Supabase SQL Editor.");
    setTimeout(() => setSqlCopied(false), 3500);
  };

  const getCropEmoji = (cropName) => {
    const matched = COMMON_CROPS.find((c) =>
      cropName?.toLowerCase().includes(c.name.toLowerCase().split(" ")[0])
    );
    return matched ? matched.icon : "🌱";
  };

  const calculateDaysSinceSowing = (sowingDate) => {
    if (!sowingDate) return null;
    const diffTime = Math.abs(new Date() - new Date(sowingDate));
    const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return days;
  };

  // Stats
  const totalPlots = plots.length;
  const totalArea = plots.reduce((acc, p) => acc + (parseFloat(p.area) || 0), 0);
  const uniqueCrops = Array.from(new Set(plots.map((p) => p.crop))).length;

  const filteredPlots = plots.filter((plot) => {
    const matchesSearch =
      plot.plot_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      plot.crop.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (plot.soil_type && plot.soil_type.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCrop =
      selectedCropFilter === "All" || plot.crop.toLowerCase() === selectedCropFilter.toLowerCase();

    return matchesSearch && matchesCrop;
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
                  Data is currently saved in local cache. To sync directly to your Supabase cloud DB, run the SQL script in your Supabase SQL Editor.
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
              <MapPin className="w-4 h-4" />
              <span>Farm Land & Resource Profile</span>
            </div>
            <h1 className="font-[Outfit] text-3xl sm:text-4xl font-bold text-white tracking-tight">
              My Farm <span className="gradient-text">Plots</span>
            </h1>
            <p className="text-gray-400 text-sm mt-1">
              Manage your agricultural land, crop cycles, and connect them with AI disease diagnostics.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={openAddModal} className="btn-primary py-2.5 px-6 shadow-lg shadow-green-500/20">
              <Plus className="w-5 h-5" />
              Add New Plot
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div className="glass-card p-5 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider text-gray-400 font-medium">Total Plots</p>
                <h3 className="text-3xl font-[Outfit] font-bold text-white mt-1">{totalPlots}</h3>
                <p className="text-xs text-emerald-400 mt-1 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Registered fields
                </p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Layers className="w-6 h-6" />
              </div>
            </div>
          </div>

          <div className="glass-card p-5 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider text-gray-400 font-medium">Cultivated Area</p>
                <h3 className="text-3xl font-[Outfit] font-bold text-white mt-1">
                  {totalArea.toFixed(1)}{" "}
                  <span className="text-lg font-normal text-gray-400">Acres</span>
                </h3>
                <p className="text-xs text-emerald-400 mt-1 flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5" /> Active farm coverage
                </p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
                <MapPin className="w-6 h-6" />
              </div>
            </div>
          </div>

          <div className="glass-card p-5 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider text-gray-400 font-medium">Active Crops</p>
                <h3 className="text-3xl font-[Outfit] font-bold text-white mt-1">{uniqueCrops}</h3>
                <p className="text-xs text-emerald-400 mt-1 flex items-center gap-1">
                  <Sprout className="w-3.5 h-3.5" /> Crop varieties planted
                </p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-center text-green-400">
                <Sprout className="w-6 h-6" />
              </div>
            </div>
          </div>
        </div>

        {/* Filters & Search */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search plot name, crop, soil..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field pl-10 py-2.5 text-sm"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => setSelectedCropFilter("All")}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                selectedCropFilter === "All"
                  ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20"
                  : "bg-[#141e19] text-gray-400 hover:text-white border border-[#2a3a34]"
              }`}
            >
              All Crops
            </button>
            {COMMON_CROPS.slice(0, 5).map((c) => (
              <button
                key={c.name}
                onClick={() => setSelectedCropFilter(c.name)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all whitespace-nowrap ${
                  selectedCropFilter === c.name
                    ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20"
                    : "bg-[#141e19] text-gray-400 hover:text-white border border-[#2a3a34]"
                }`}
              >
                <span>{c.icon}</span>
                <span>{c.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Plot Cards Grid */}
        {loading ? (
          <div className="text-center py-20">
            <div className="loading-dots">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        ) : filteredPlots.length === 0 ? (
          <div className="text-center py-16 glass-card border-dashed">
            <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-4 border border-emerald-500/20 text-emerald-400">
              <MapPin className="w-8 h-8" />
            </div>
            <h3 className="font-[Outfit] text-xl font-semibold text-white mb-2">No Plots Found</h3>
            <p className="text-gray-400 text-sm max-w-md mx-auto mb-6">
              {searchQuery
                ? "No farm plots match your current search or crop filter."
                : "Add your agricultural land plots to enable smart, land-area-tailored disease treatment recommendations."}
            </p>
            <button onClick={openAddModal} className="btn-primary py-2.5 px-6">
              <Plus className="w-4 h-4" /> Add Your First Plot
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPlots.map((plot) => {
              const daysOld = calculateDaysSinceSowing(plot.sowing_date);
              return (
                <div
                  key={plot.id}
                  className="glass-card p-6 flex flex-col justify-between group hover:border-emerald-500/50 transition-all duration-300"
                >
                  <div>
                    {/* Card Header */}
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 flex items-center justify-center text-2xl shadow-md">
                          {getCropEmoji(plot.crop)}
                        </div>
                        <div>
                          <h3 className="font-[Outfit] font-bold text-lg text-white group-hover:text-emerald-300 transition-colors">
                            {plot.plot_name}
                          </h3>
                          <span className="inline-block text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 mt-0.5">
                            {plot.crop}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => openEditModal(plot)}
                          className="p-1.5 text-gray-400 hover:text-emerald-400 hover:bg-white/5 rounded-lg transition-colors"
                          title="Edit plot details"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeletePlot(plot.id)}
                          className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                          title="Delete plot"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Area & Details */}
                    <div className="grid grid-cols-2 gap-2.5 p-3 rounded-xl bg-[#0e1612] border border-[#1f2d26] mb-4">
                      <div>
                        <p className="text-[11px] text-gray-400 uppercase tracking-wider">Plot Size</p>
                        <p className="font-semibold text-white text-sm mt-0.5">
                          {plot.area} <span className="text-emerald-400 text-xs">{plot.area_unit || "Acres"}</span>
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] text-gray-400 uppercase tracking-wider">Soil Type</p>
                        <p className="font-semibold text-gray-200 text-sm mt-0.5 truncate">
                          {plot.soil_type || "Loamy Soil"}
                        </p>
                      </div>
                    </div>

                    {/* Growth Timeline */}
                    {plot.sowing_date && (
                      <div className="flex items-center justify-between text-xs text-gray-400 mb-3 px-1">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                          Sown: {new Date(plot.sowing_date).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}
                        </span>
                        {daysOld !== null && (
                          <span className="font-medium text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                            Day {daysOld}
                          </span>
                        )}
                      </div>
                    )}

                    {plot.notes && (
                      <p className="text-xs text-gray-400 italic line-clamp-2 px-1 mb-4 bg-black/20 p-2 rounded-lg border border-white/5">
                        "{plot.notes}"
                      </p>
                    )}
                  </div>

                  {/* Card Bottom CTA */}
                  <div className="pt-4 border-t border-[#1f2d26]/80 flex items-center justify-between gap-3">
                    <button
                      onClick={() => navigate(`/scan?plotId=${plot.id}`)}
                      className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 text-xs font-semibold transition-all group/btn"
                    >
                      <ScanLine className="w-3.5 h-3.5" />
                      <span>Diagnose Disease on Plot</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover/btn:translate-x-0.5 transition-transform" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add / Edit Plot Modal */}
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
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-[Outfit] text-2xl font-bold text-white">
                  {editingPlot ? "Edit Farm Plot" : "Add New Farm Plot"}
                </h2>
                <p className="text-xs text-gray-400">Configure land details for personalized recommendations</p>
              </div>
            </div>

            <form onSubmit={handleSavePlot} className="space-y-4">
              {/* Plot Name */}
              <div>
                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                  Plot / Field Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. North Acre, Green Valley Block B"
                  value={formData.plot_name}
                  onChange={(e) => setFormData({ ...formData, plot_name: e.target.value })}
                  className="input-field text-sm"
                />
              </div>

              {/* Area & Unit */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                    Land Area *
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0.01"
                    required
                    placeholder="e.g. 2.5"
                    value={formData.area}
                    onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                    className="input-field text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                    Unit
                  </label>
                  <select
                    value={formData.area_unit}
                    onChange={(e) => setFormData({ ...formData, area_unit: e.target.value })}
                    className="input-field text-sm bg-[#111916]"
                  >
                    {AREA_UNITS.map((u) => (
                      <option key={u} value={u} className="bg-[#0a0f0d]">
                        {u}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Crop Selector with quick chips */}
              <div>
                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                  Growing Crop *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Tomato, Rice, Wheat..."
                  value={formData.crop}
                  onChange={(e) => setFormData({ ...formData, crop: e.target.value })}
                  className="input-field text-sm mb-2"
                />
                <div className="flex flex-wrap gap-1.5">
                  {COMMON_CROPS.map((c) => (
                    <button
                      type="button"
                      key={c.name}
                      onClick={() => setFormData({ ...formData, crop: c.name.split(" ")[0] })}
                      className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${
                        formData.crop.toLowerCase() === c.name.toLowerCase().split(" ")[0]
                          ? "bg-emerald-500/20 border-emerald-500 text-emerald-300"
                          : "bg-black/30 border-[#2a3a34] text-gray-400 hover:border-gray-500"
                      }`}
                    >
                      {c.icon} {c.name.split(" ")[0]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sowing Date & Soil Type */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                    Sowing Date
                  </label>
                  <input
                    type="date"
                    value={formData.sowing_date}
                    onChange={(e) => setFormData({ ...formData, sowing_date: e.target.value })}
                    className="input-field text-sm bg-[#111916]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                    Soil Type
                  </label>
                  <select
                    value={formData.soil_type}
                    onChange={(e) => setFormData({ ...formData, soil_type: e.target.value })}
                    className="input-field text-sm bg-[#111916]"
                  >
                    {SOIL_TYPES.map((s) => (
                      <option key={s} value={s} className="bg-[#0a0f0d]">
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                  Field Notes (Optional)
                </label>
                <textarea
                  rows="2"
                  placeholder="Irrigation schedule, previous crops, or special conditions..."
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
                  {saving ? "Saving..." : editingPlot ? "Update Plot" : "Create Plot"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
