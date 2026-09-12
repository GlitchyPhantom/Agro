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
                <div className="text-2xl font-bold text-white mb-1">
                  {loading ? "..." : card.value}
                </div>
                <div className="text-sm text-gray-400">{card.label}</div>
              </div>
            );
          })}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
          <Link
            to="/scan"
            className="glass-card p-6 flex items-center gap-4 group animate-slide-up"
            style={{ animationDelay: "0.1s" }}
          >
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-green-500/20 group-hover:scale-110 transition-transform">
              <ScanLine className="w-7 h-7 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-[Outfit] font-semibold text-white text-lg">Scan Plant</h3>
              <p className="text-sm text-gray-400">Upload a leaf image to detect diseases</p>
            </div>
            <ArrowRight className="w-5 h-5 text-gray-500 group-hover:text-green-400 transition-colors" />
          </Link>

          <Link
            to="/chat"
            className="glass-card p-6 flex items-center gap-4 group animate-slide-up"
            style={{ animationDelay: "0.2s" }}
          >
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 group-hover:scale-110 transition-transform">
              <MessageCircle className="w-7 h-7 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-[Outfit] font-semibold text-white text-lg">AI Chat</h3>
              <p className="text-sm text-gray-400">Ask farming questions to AI assistant</p>
            </div>
            <ArrowRight className="w-5 h-5 text-gray-500 group-hover:text-cyan-400 transition-colors" />
          </Link>

          <Link
            to="/history"
            className="glass-card p-6 flex items-center gap-4 group animate-slide-up"
            style={{ animationDelay: "0.3s" }}
          >
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/20 group-hover:scale-110 transition-transform">
              <Clock className="w-7 h-7 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-[Outfit] font-semibold text-white text-lg">History</h3>
              <p className="text-sm text-gray-400">View past scans and track trends</p>
            </div>
            <ArrowRight className="w-5 h-5 text-gray-500 group-hover:text-purple-400 transition-colors" />
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
