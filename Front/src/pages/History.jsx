import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { Link } from "react-router-dom";
import {
  Clock,
  Trash2,
  Leaf,
  AlertTriangle,
  CheckCircle,
  MapPin,
  ScanLine,
  ArrowRight,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import toast from "react-hot-toast";

const API = import.meta.env.VITE_API_URL || "";

export default function History() {
  const { user } = useAuth();
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    fetchHistory();
  }, [user]);

  const fetchHistory = async () => {
    try {
      const res = await fetch(`${API}/api/history`, {
        headers: { "X-User-Id": user.id },
      });
      if (res.ok) {
        const data = await res.json();
        setScans(data.scans || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (scanId) => {
    if (!confirm("Delete this scan record?")) return;
    try {
      const res = await fetch(`${API}/api/history/${scanId}`, {
        method: "DELETE",
        headers: { "X-User-Id": user.id },
      });
      if (res.ok) {
        setScans((prev) => prev.filter((s) => s.id !== scanId));
        toast.success("Scan deleted");
      }
    } catch (e) {
      toast.error("Failed to delete");
    }
  };

  const formatDate = (iso) => {
    const d = new Date(iso);
    return d.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#0a0f0d] px-4 pt-6 pb-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-[Outfit] text-3xl font-bold text-white mb-1">
              📋 Scan History
            </h1>
            <p className="text-gray-400 text-sm">
              {scans.length} scan{scans.length !== 1 ? "s" : ""} recorded
            </p>
          </div>
          <Link to="/scan" className="btn-primary py-2 px-5 text-sm">
            <ScanLine className="w-4 h-4" /> New Scan
          </Link>
        </div>

        {loading ? (
          <div className="text-center py-20">
            <div className="loading-dots"><span></span><span></span><span></span></div>
          </div>
        ) : scans.length === 0 ? (
          <div className="text-center py-20 glass-card">
            <Leaf className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="font-[Outfit] text-xl font-semibold text-white mb-2">No Scans Yet</h3>
            <p className="text-gray-400 mb-6">Start scanning plants to build your farm health history</p>
            <Link to="/scan" className="btn-primary py-2.5 px-6">
              Scan Your First Plant <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {scans.map((scan, i) => (
              <div
                key={scan.id || i}
                className="glass-card overflow-hidden animate-slide-up"
                style={{ animationDelay: `${i * 0.05}s` }}
              >
                <div
                  className="flex items-center gap-4 p-5 cursor-pointer"
                  onClick={() => setExpandedId(expandedId === scan.id ? null : scan.id)}
                >
                  {scan.image_url ? (
                    <img src={scan.image_url} alt="" className="w-14 h-14 rounded-xl object-cover border border-[#2a3a34]" />
                  ) : (
                    <div className="w-14 h-14 rounded-xl bg-[#1a2420] flex items-center justify-center">
                      <Leaf className="w-7 h-7 text-green-500/30" />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {scan.is_healthy ? (
                        <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                      )}
                      <h3 className="font-medium text-white truncate">
                        {scan.disease?.replaceAll("_", " ")}
                      </h3>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {formatDate(scan.scanned_at)}
                      </span>
                      {scan.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> {scan.location}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-sm text-green-400 font-semibold">{scan.confidence}%</span>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium severity-${scan.severity || "none"}`}>
                      {scan.is_healthy ? "Healthy" : scan.severity}
                    </span>
                    {expandedId === scan.id ? (
                      <ChevronUp className="w-4 h-4 text-gray-500" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-500" />
                    )}
                  </div>
                </div>

                {/* Expanded Detail */}
                {expandedId === scan.id && (
                  <div className="px-5 pb-5 pt-0 border-t border-[#2a3a34] animate-fade-in">
                    {scan.advisory && (
                      <div className="mt-4 p-4 rounded-xl bg-[#0a0f0d]/50">
                        <h4 className="text-sm font-semibold text-green-400 mb-2">Advisory</h4>
                        <p className="text-sm text-gray-300 whitespace-pre-wrap">{scan.advisory}</p>
                      </div>
                    )}

                    {scan.predictions && (
                      <div className="mt-4">
                        <h4 className="text-sm font-semibold text-gray-400 mb-2">All Predictions</h4>
                        <div className="space-y-2">
                          {scan.predictions.map((p, j) => (
                            <div key={j} className="flex justify-between text-sm">
                              <span className="text-gray-300">{p.label?.replaceAll("_", " ")}</span>
                              <span className="text-green-400">{p.confidence}%</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="mt-4 flex justify-end">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(scan.id); }}
                        className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 px-3 py-1.5 rounded-lg hover:bg-red-500/10 transition-all"
                      >
                        <Trash2 className="w-3 h-3" /> Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
