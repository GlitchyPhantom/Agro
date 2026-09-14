import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  ScanLine,
  MessageCircle,
  Clock,
  Leaf,
  Activity,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  ArrowRight,
  MapPin,
  Package,
} from "lucide-react";

const API = import.meta.env.VITE_API_URL || "";

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [recentScans, setRecentScans] = useState([]);
  const [loading, setLoading] = useState(true);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good Morning";
    if (h < 17) return "Good Afternoon";
    return "Good Evening";
  };

  useEffect(() => {
    async function fetchData() {
      if (!user?.id) {
        setStats(null);
        setRecentScans([]);
        setLoading(false);
        return;
      }
      try {
        const [statsRes, histRes] = await Promise.all([
          fetch(`${API}/api/stats`, {
            headers: { "X-User-Id": user.id },
          }),
          fetch(`${API}/api/history?limit=5`, {
            headers: { "X-User-Id": user.id },
          }),
        ]);
        if (statsRes.ok) setStats(await statsRes.json());
        if (histRes.ok) {
          const data = await histRes.json();
          setRecentScans(data.scans || []);
        }
      } catch (e) {
        console.error("Dashboard fetch error:", e);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [user]);

  const userName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Farmer";

  const statCards = [
    {
      label: "Total Scans",
      value: stats?.total_scans ?? 0,
      icon: Activity,
      color: "from-green-500 to-emerald-600",
      bg: "bg-green-500/10",
    },
    {
      label: "Healthy",
      value: stats?.healthy_count ?? 0,
      icon: CheckCircle,
      color: "from-emerald-500 to-teal-600",
      bg: "bg-emerald-500/10",
    },
    {
      label: "Diseased",
      value: stats?.diseased_count ?? 0,
      icon: AlertTriangle,
      color: "from-orange-500 to-red-600",
      bg: "bg-orange-500/10",
    },
    {
      label: "Detection Rate",
      value: stats?.total_scans > 0 ? `${Math.round((stats.diseased_count / stats.total_scans) * 100)}%` : "—",
      icon: TrendingUp,
      color: "from-blue-500 to-indigo-600",
      bg: "bg-blue-500/10",
    },
  ];

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#0a0f0d] px-4 pt-6 pb-8">
      <div className="max-w-7xl mx-auto">
        {/* Greeting */}
        <div className="mb-10">
          <h1 className="font-[Outfit] text-3xl sm:text-4xl font-bold text-white mb-2">
            {greeting()}, <span className="gradient-text">{userName}</span> 👋
          </h1>
          <p className="text-gray-400">Here's your farm health overview</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
          {statCards.map((card, i) => {
            const Icon = card.icon;
            return (
              <div key={i} className="glass-card p-6 animate-slide-up" style={{ animationDelay: `${i * 0.1}s` }}>
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-10 h-10 rounded-xl ${card.bg} flex items-center justify-center`}>
                    <Icon className="w-5 h-5 text-green-400" />
                  </div>
                </div>
                <p className="text-sm text-gray-400 mb-1">{card.label}</p>
                <p className="font-[Outfit] text-3xl font-bold text-white">{loading ? "..." : card.value}</p>
              </div>
            );
          })}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
          <Link
            to="/scan"
            className="glass-card p-6 flex items-center gap-4 group animate-slide-up hover:border-emerald-500/40 transition-all"
            style={{ animationDelay: "0.1s" }}
          >
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-green-500/20 group-hover:scale-105 transition-transform flex-shrink-0">
              <ScanLine className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-[Outfit] font-semibold text-white text-base truncate">Scan Plant</h3>
              <p className="text-xs text-gray-400 truncate">Detect diseases & dose</p>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-500 group-hover:text-green-400 transition-colors flex-shrink-0" />
          </Link>

          <Link
            to="/farm"
            className="glass-card p-6 flex items-center gap-4 group animate-slide-up hover:border-teal-500/40 transition-all"
            style={{ animationDelay: "0.15s" }}
          >
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-700 flex items-center justify-center shadow-lg shadow-teal-500/20 group-hover:scale-105 transition-transform flex-shrink-0">
              <MapPin className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-[Outfit] font-semibold text-white text-base truncate">Farm Plots</h3>
              <p className="text-xs text-gray-400 truncate">Manage land & crops</p>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-500 group-hover:text-teal-400 transition-colors flex-shrink-0" />
          </Link>

          <Link
            to="/inventory"
            className="glass-card p-6 flex items-center gap-4 group animate-slide-up hover:border-amber-500/40 transition-all"
            style={{ animationDelay: "0.2s" }}
          >
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20 group-hover:scale-105 transition-transform flex-shrink-0">
              <Package className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-[Outfit] font-semibold text-white text-base truncate">Shed Inventory</h3>
              <p className="text-xs text-gray-400 truncate">Medicines & fertilizers</p>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-500 group-hover:text-amber-400 transition-colors flex-shrink-0" />
          </Link>

          <Link
            to="/chat"
            className="glass-card p-6 flex items-center gap-4 group animate-slide-up hover:border-cyan-500/40 transition-all"
            style={{ animationDelay: "0.25s" }}
          >
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 group-hover:scale-105 transition-transform flex-shrink-0">
              <MessageCircle className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-[Outfit] font-semibold text-white text-base truncate">AI Chat</h3>
              <p className="text-xs text-gray-400 truncate">Ask farming questions</p>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-500 group-hover:text-cyan-400 transition-colors flex-shrink-0" />
          </Link>
        </div>

        {/* Recent Scans */}
        <div className="glass-card p-6 animate-slide-up" style={{ animationDelay: "0.4s" }}>
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-[Outfit] text-xl font-semibold text-white">Recent Scans</h2>
            <Link to="/history" className="text-sm text-green-400 hover:text-green-300 flex items-center gap-1">
              View All <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <div className="loading-dots"><span></span><span></span><span></span></div>
            </div>
          ) : recentScans.length === 0 ? (
            <div className="text-center py-12">
              <Leaf className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400 mb-4">No scans yet. Start by scanning your first plant!</p>
              <Link to="/scan" className="btn-primary py-2 px-6 text-sm">
                Scan Now <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {recentScans.map((scan, i) => (
                <div key={i} className="flex items-center gap-4 p-4 rounded-xl bg-[#0a0f0d]/50 border border-[#2a3a34]/50">
                  {scan.image_url && (
                    <img src={scan.image_url} alt="" className="w-12 h-12 rounded-lg object-cover" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {scan.disease?.replaceAll("_", " ")}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(scan.scanned_at).toLocaleDateString()} • {scan.confidence}%
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium severity-${scan.severity || "none"}`}>
                    {scan.is_healthy ? "Healthy" : scan.severity}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
