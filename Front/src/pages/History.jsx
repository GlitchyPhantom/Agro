import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
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
  Package,
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
    if (!user?.id) {
      setScans([]);
      setLoading(false);
      return;
    }

    try {
      // 1. Try FastAPI backend strictly with user's ID and Bearer token
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const headers = { "X-User-Id": user.id };
        if (sessionData?.session?.access_token) {
          headers["Authorization"] = `Bearer ${sessionData.session.access_token}`;
        }

        const res = await fetch(`${API}/api/history`, { headers });
        if (res.ok) {
          const data = await res.json();
          // Strictly isolate to this user's scans (even if empty [] for new accounts)
          setScans(data.scans || []);
          setLoading(false);
          return;
        }
      } catch (backendErr) {
        console.warn("Backend /api/history fetch failed, falling back to direct Supabase:", backendErr);
      }

      // 2. Direct Supabase query ONLY if backend is unavailable, STRICTLY isolated to this user
      const { data: dbScans, error } = await supabase
        .from("detections")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (!error && dbScans) {
        const formatted = dbScans.map((s) => ({
          id: s.id,
          image_url: s.image_url,
          disease: s.disease_name,
          confidence: s.confidence,
          severity: typeof s.advisory === "object" ? s.advisory?.severity || "moderate" : "moderate",
          is_healthy: (s.disease_name || "").toLowerCase().includes("healthy"),
          advisory: typeof s.advisory === "object" ? s.advisory?.text || JSON.stringify(s.advisory) : s.advisory,
          predictions: s.top_predictions,
          location: s.location,
          scanned_at: s.created_at,
        }));
        setScans(formatted);
      } else {
        setScans([]);
      }
    } catch (e) {
      console.error("fetchHistory error:", e);
      setScans([]);
    } finally {
      setLoading(false);
    }
  };


  const handleDelete = async (scanId) => {
    if (!confirm("Are you sure you want to permanently delete this scan record from the database?")) return;
    try {
      let deletedFromDb = false;

      // 1. Direct Supabase deletion (uses the browser's active Supabase session with RLS auth.uid())
      try {
        const { data: sbData, error: sbError } = await supabase
          .from("detections")
          .delete()
          .eq("id", scanId)
          .select();

        if (!sbError && sbData && sbData.length > 0) {
          deletedFromDb = true;
          console.log("[Supabase] Deleted detection successfully:", sbData);
        } else if (sbError) {
          console.warn("[Supabase Direct Delete Error]:", sbError);
        }
      } catch (sbEx) {
        console.warn("[Supabase Delete Exception]:", sbEx);
      }

      // 2. Also invoke backend API with Bearer token & User ID for synced cleanup
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const headers = { "X-User-Id": user?.id || "" };
        if (sessionData?.session?.access_token) {
          headers["Authorization"] = `Bearer ${sessionData.session.access_token}`;
        }

        const res = await fetch(`${API}/api/history/${scanId}`, {
          method: "DELETE",
          headers,
        });
        if (res.ok) {
          const resJson = await res.json().catch(() => ({}));
          if (resJson.deleted) {
            deletedFromDb = true;
          }
        }
      } catch (backendEx) {
        console.warn("[Backend Delete Sync Exception]:", backendEx);
      }

      // 3. Update UI state
      setScans((prev) => prev.filter((s) => s.id !== scanId));
      toast.success("Scan permanently deleted from database");
    } catch (e) {
      console.error("Delete failed:", e);
      toast.error("Failed to delete scan from database");
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
                    {scan.advisory && (() => {
                      let parsed = null;
                      if (typeof scan.advisory === "object") parsed = scan.advisory;
                      else if (typeof scan.advisory === "string") {
                        try {
                          const cleaned = scan.advisory.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
                          parsed = JSON.parse(cleaned);
                        } catch {}
                      }

                      const pres = parsed?.personalized_prescription;

                      return (
                        <div className="mt-4 space-y-3">
                          {pres && (
                            <div className={`p-4 rounded-xl border ${
                              pres.has_in_stock_remedy
                                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-200"
                                : "bg-amber-500/10 border-amber-500/30 text-amber-200"
                            }`}>
                              <div className="flex items-center justify-between mb-1.5 font-semibold text-xs uppercase tracking-wider">
                                <span>{pres.has_in_stock_remedy ? "🟢 Farm Shed In-Stock Prescription" : "🛒 Market Purchase Recommendation"}</span>
                                {pres.matched_items?.length > 0 && (
                                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                                    {pres.matched_items.join(", ")}
                                  </span>
                                )}
                              </div>
                              <p className="text-sm leading-relaxed text-gray-200 whitespace-pre-wrap">
                                {pres.has_in_stock_remedy ? pres.in_stock_instructions : pres.market_recommendation}
                              </p>
                            </div>
                          )}

                          <div className="p-4 rounded-xl bg-[#0a0f0d]/60 border border-[#2a3a34]/60">
                            <h4 className="text-sm font-semibold text-green-400 mb-2">Advisory Details</h4>
                            {parsed && parsed.cause ? (
                              <div className="space-y-2 text-sm text-gray-300">
                                <p><strong className="text-gray-200">Cause:</strong> {parsed.cause}</p>
                                {parsed.chemical_treatment && (
                                  <div>
                                    <strong className="text-gray-200">Chemical Treatment:</strong>
                                    <ul className="list-disc list-inside mt-1 space-y-1 text-gray-400">
                                      {Array.isArray(parsed.chemical_treatment)
                                        ? parsed.chemical_treatment.map((t, idx) => <li key={idx}>{t}</li>)
                                        : <li>{parsed.chemical_treatment}</li>}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <p className="text-sm text-gray-300 whitespace-pre-wrap">
                                {typeof scan.advisory === "string" ? scan.advisory : JSON.stringify(scan.advisory, null, 2)}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })()}


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
