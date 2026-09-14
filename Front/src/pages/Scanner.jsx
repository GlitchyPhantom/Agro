import { useState, useCallback, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { useDropzone } from "react-dropzone";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import LanguageSelector from "../components/LanguageSelector";
import {
  Upload,
  Camera,
  Leaf,
  AlertTriangle,
  CheckCircle,
  Loader2,
  Sparkles,
  Shield,
  Beaker,
  Sprout,
  Volume2,
  BarChart3,
  MapPin,
  Package,
  ShoppingCart,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import toast from "react-hot-toast";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

export default function Scanner() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [lang, setLang] = useState("en");
  const [translatedAdvisory, setTranslatedAdvisory] = useState(null);

  // Farm Plots state
  const [plots, setPlots] = useState([]);
  const [selectedPlotId, setSelectedPlotId] = useState(searchParams.get("plotId") || "");

  useEffect(() => {
    async function loadPlots() {
      if (!user?.id) return;
      try {
        const { data, error } = await supabase
          .from("farm_plots")
          .select("*")
          .eq("user_id", user.id);
        if (!error && data && data.length > 0) {
          setPlots(data);
          const fromParam = searchParams.get("plotId");
          if (fromParam) {
            setSelectedPlotId(fromParam);
          } else if (!selectedPlotId) {
            setSelectedPlotId(data[0].id);
          }
        } else {
          // Fallback to local storage
          const local = localStorage.getItem(`agrointel_plots_${user.id}`);
          if (local) {
            const parsed = JSON.parse(local);
            setPlots(parsed);
            const fromParam = searchParams.get("plotId");
            if (fromParam) setSelectedPlotId(fromParam);
            else if (!selectedPlotId && parsed.length > 0) setSelectedPlotId(parsed[0].id);
          }
        }
      } catch (err) {
        console.warn("Could not load plots in scanner:", err);
      }
    }
    loadPlots();
  }, [user?.id, searchParams]);


  const onDrop = useCallback((accepted) => {
    if (accepted.length > 0) {
      const f = accepted[0];
      setFile(f);
      setPreview(URL.createObjectURL(f));
      setResult(null);
      setTranslatedAdvisory(null);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [".jpg", ".jpeg", ".png", ".webp"] },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024,
  });

  const handleScan = async () => {
    if (!file) return;

    setLoading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const headers = {};
      if (user?.id) headers["X-User-Id"] = user.id;
      if (selectedPlotId) {
        formData.append("plot_id", selectedPlotId);
        headers["X-Plot-Id"] = selectedPlotId;
      }

      // Try API URL first, fallback to relative path
      let res;
      try {
        res = await fetch(`${API}/api/predict`, {
          method: "POST",
          headers,
          body: formData,
        });
      } catch (err) {
        console.warn("Direct API fetch failed, trying proxy /api/predict...", err);
        res = await fetch("/api/predict", {
          method: "POST",
          headers,
          body: formData,
        });
      }

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || "Prediction failed");
      }

      const data = await res.json();
      setResult(data);
      toast.success("Scan complete!");
    } catch (e) {
      console.error("Scan error:", e);
      toast.error(e.message || "Failed to analyze image. Please ensure backend is running.");
    } finally {
      setLoading(false);
    }
  };

  const handleTranslate = async (text) => {
    if (lang === "en" || !text) return;
    try {
      const res = await fetch(`${API}/api/translate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, source_lang: "en", target_lang: lang }),
      });
      if (res.ok) {
        const data = await res.json();
        setTranslatedAdvisory(data.translated_text);
      }
    } catch (e) {
      console.error("Translation error:", e);
    }
  };

  const handleSpeak = async (text) => {
    try {
      const res = await fetch(`${API}/api/tts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: translatedAdvisory || text, language: lang }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.audio) {
          const audio = new Audio(`data:audio/wav;base64,${data.audio}`);
          audio.play();
        }
      }
    } catch (e) {
      console.error("TTS error:", e);
    }
  };

  const handleLangChange = (newLang) => {
    setLang(newLang);
    if (result?.advisory && newLang !== "en") {
      handleTranslate(result.advisory);
    } else {
      setTranslatedAdvisory(null);
    }
  };

  const parseAdvisory = (text) => {
    if (!text) return null;
    try {
      // Try parsing as JSON first
      const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      return JSON.parse(cleaned);
    } catch {
      return null;
    }
  };

  const resetScan = () => {
    setFile(null);
    setPreview(null);
    setResult(null);
    setTranslatedAdvisory(null);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#0a0f0d] px-4 pt-6 pb-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-[Outfit] text-3xl font-bold text-white mb-1">
              🔬 Disease Scanner
            </h1>
            <p className="text-gray-400 text-sm">Upload a leaf image to detect diseases & get personalized prescriptions</p>
          </div>
          <LanguageSelector
            currentLang={lang}
            onChangeLang={handleLangChange}
            onSpeak={result?.advisory ? () => handleSpeak(result.advisory) : null}
            speakText={result?.advisory}
          />
        </div>

        {/* Target Plot Selector */}
        {!result && (
          <div className="glass-card p-4 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-[#23352c] animate-fade-in">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                  Target Farm Plot (Optional)
                </p>
                <p className="text-sm font-medium text-white">
                  Calculate exact spray dosage tailored to your plot area
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={selectedPlotId}
                onChange={(e) => setSelectedPlotId(e.target.value)}
                className="input-field py-2 px-3 text-sm bg-[#0e1612] min-w-[220px]"
              >
                <option value="">General Scan (1 Acre standard)</option>
                {plots.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.plot_name} ({p.area} {p.area_unit || "Acres"} - {p.crop})
                  </option>
                ))}
              </select>
              <Link
                to="/farm"
                className="p-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-emerald-400 text-xs font-medium border border-white/5 whitespace-nowrap transition-colors"
                title="Manage Farm Plots"
              >
                + Plots
              </Link>
            </div>
          </div>
        )}


        {!result ? (
          /* ── Upload Section ────────────────────────────────────────────── */
          <div className="animate-slide-up">
            <div
              {...getRootProps()}
              className={`upload-zone ${isDragActive ? "active" : ""}`}
            >
              <input {...getInputProps()} id="scan-file-input" />

              {preview ? (
                <div className="space-y-4">
                  <img
                    src={preview}
                    alt="Preview"
                    className="max-h-64 mx-auto rounded-2xl shadow-lg shadow-green-500/10 border border-[#2a3a34]"
                  />
                  <p className="text-sm text-gray-400">{file.name}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="w-20 h-20 mx-auto rounded-2xl bg-green-500/10 flex items-center justify-center">
                    <Upload className="w-10 h-10 text-green-400" />
                  </div>
                  <div>
                    <p className="text-lg text-white font-medium mb-1">
                      Drop your leaf image here
                    </p>
                    <p className="text-sm text-gray-400">
                      or click to browse • JPG, PNG, WebP up to 10MB
                    </p>
                  </div>
                </div>
              )}
            </div>

            {preview && (
              <div className="flex gap-3 mt-6 justify-center">
                <button onClick={resetScan} className="btn-secondary py-3 px-6">
                  Change Image
                </button>
                <button
                  onClick={handleScan}
                  disabled={loading}
                  className="btn-primary py-3 px-8 disabled:opacity-50"
                  id="scan-submit"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      Analyze with AI
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        ) : (
          /* ── Results Section ───────────────────────────────────────────── */
          <div className="space-y-6 animate-slide-up">
            {/* Primary Result Card */}
            <div className="glass-card p-8">
              <div className="flex flex-col md:flex-row gap-8">
                {preview && (
                  <img
                    src={preview}
                    alt="Scanned leaf"
                    className="w-full md:w-48 h-48 object-cover rounded-2xl border border-[#2a3a34]"
                  />
                )}
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        {result.is_healthy ? (
                          <CheckCircle className="w-6 h-6 text-green-400" />
                        ) : (
                          <AlertTriangle className="w-6 h-6 text-yellow-400" />
                        )}
                        <h2 className="font-[Outfit] text-2xl font-bold text-white">
                          {result.primary_disease?.replaceAll("_", " ")}
                        </h2>
                      </div>
                      <p className="text-gray-400 text-sm">
                        Confidence: <span className="text-green-400 font-semibold">{result.primary_confidence}%</span>
                      </p>
                    </div>
                    <span className={`px-4 py-1.5 rounded-full text-sm font-semibold severity-${result.severity}`}>
                      {result.is_healthy ? "✅ Healthy" : `⚠️ ${result.severity?.charAt(0).toUpperCase() + result.severity?.slice(1)}`}
                    </span>
                  </div>

                  {/* Top-3 Predictions */}
                  <div className="space-y-2">
                    <p className="text-xs uppercase tracking-widest text-gray-500 mb-3">Top-3 Predictions</p>
                    {result.predictions?.map((pred, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <div className="flex-1">
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-gray-300">{pred.label?.replaceAll("_", " ")}</span>
                            <span className="text-green-400 font-medium">{pred.confidence}%</span>
                          </div>
                          <div className="w-full h-2 rounded-full bg-[#1a2420]">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-green-500 to-emerald-400 transition-all duration-700"
                              style={{ width: `${Math.min(pred.confidence, 100)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Advisory Card */}
            {result.advisory && !result.is_healthy && (() => {
              const advisory = parseAdvisory(result.advisory);
              const displayText = translatedAdvisory || result.advisory;

              if (advisory) {
                const pres = advisory.personalized_prescription;
                const targetPlot = plots.find((p) => p.id === selectedPlotId) || result.plot_info;

                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {/* Personalized Farm Prescription Card */}
                    {pres && (
                      <div
                        className={`col-span-1 md:col-span-2 glass-card p-6 border transition-all ${
                          pres.has_in_stock_remedy
                            ? "border-emerald-500/50 bg-gradient-to-br from-emerald-950/30 via-[#111916] to-[#111916] shadow-lg shadow-emerald-500/10"
                            : "border-amber-500/40 bg-gradient-to-br from-amber-950/25 via-[#111916] to-[#111916]"
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-11 h-11 rounded-2xl border flex items-center justify-center ${
                                pres.has_in_stock_remedy
                                  ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-400"
                                  : "bg-amber-500/20 border-amber-500/30 text-amber-400"
                              }`}
                            >
                              {pres.has_in_stock_remedy ? (
                                <ShieldCheck className="w-6 h-6" />
                              ) : (
                                <ShoppingCart className="w-6 h-6" />
                              )}
                            </div>
                            <div>
                              <span
                                className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                                  pres.has_in_stock_remedy
                                    ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                                    : "bg-amber-500/20 text-amber-300 border-amber-500/30"
                                }`}
                              >
                                {pres.has_in_stock_remedy
                                  ? "🟢 In-Stock Medicine Match • Money Saved"
                                  : "🛒 Local Market Purchase Needed"}
                              </span>
                              <h3 className="font-[Outfit] text-xl font-bold text-white mt-1">
                                {pres.has_in_stock_remedy
                                  ? "Personalized Plot Treatment Plan"
                                  : "Recommended Commercial Remedy"}
                              </h3>
                            </div>
                          </div>

                          {targetPlot && (
                            <div className="text-right text-xs bg-black/30 px-3 py-1.5 rounded-xl border border-white/5">
                              <p className="text-gray-400">Prescribed For:</p>
                              <p className="text-emerald-300 font-semibold">
                                {targetPlot.plot_name} ({targetPlot.area} {targetPlot.area_unit || "Acres"})
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Matched Items Pills */}
                        {pres.has_in_stock_remedy && pres.matched_items?.length > 0 && (
                          <div className="flex items-center gap-2 flex-wrap mb-3">
                            <span className="text-xs text-gray-400 font-semibold">Use Stored Resource:</span>
                            {pres.matched_items.map((item, idx) => (
                              <span
                                key={idx}
                                className="text-xs font-bold px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                {item}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Prescribed Instructions */}
                        <div className="p-4 rounded-xl bg-[#080d0a] border border-[#1f2d26] text-sm text-gray-200 leading-relaxed whitespace-pre-wrap">
                          {pres.has_in_stock_remedy
                            ? pres.in_stock_instructions
                            : pres.market_recommendation}
                        </div>

                        <div className="mt-3 flex items-center justify-between text-xs text-gray-400">
                          <span className="flex items-center gap-1">
                            <Package className="w-3.5 h-3.5 text-emerald-400" />
                            Connected with your shed inventory
                          </span>
                          <Link to="/inventory" className="text-emerald-400 hover:text-emerald-300 font-medium underline">
                            Manage Inventory
                          </Link>
                        </div>
                      </div>
                    )}

                    {/* Cause & Symptoms */}
                    <div className="glass-card p-6">
                      <div className="flex items-center gap-2 mb-4">
                        <AlertTriangle className="w-5 h-5 text-yellow-400" />
                        <h3 className="font-[Outfit] font-semibold text-white">Cause & Symptoms</h3>
                      </div>
                      <p className="text-sm text-gray-300 mb-3">{advisory.cause}</p>
                      <ul className="space-y-1">
                        {advisory.symptoms?.map((s, i) => (
                          <li key={i} className="text-sm text-gray-400 flex items-start gap-2">
                            <span className="text-green-400 mt-0.5">•</span> {s}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Organic Treatment */}
                    <div className="glass-card p-6">
                      <div className="flex items-center gap-2 mb-4">
                        <Sprout className="w-5 h-5 text-green-400" />
                        <h3 className="font-[Outfit] font-semibold text-white">Organic Treatment</h3>
                      </div>
                      <ul className="space-y-2">
                        {advisory.organic_treatment?.map((t, i) => (
                          <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
                            <span className="text-green-400 mt-0.5">🌿</span> {t}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Chemical Treatment */}
                    <div className="glass-card p-6">
                      <div className="flex items-center gap-2 mb-4">
                        <Beaker className="w-5 h-5 text-blue-400" />
                        <h3 className="font-[Outfit] font-semibold text-white">Chemical Treatment</h3>
                      </div>
                      <ul className="space-y-2">
                        {advisory.chemical_treatment?.map((t, i) => (
                          <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
                            <span className="text-blue-400 mt-0.5">💊</span> {t}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Prevention */}
                    <div className="glass-card p-6">
                      <div className="flex items-center gap-2 mb-4">
                        <Shield className="w-5 h-5 text-emerald-400" />
                        <h3 className="font-[Outfit] font-semibold text-white">Prevention</h3>
                      </div>
                      <ul className="space-y-2">
                        {advisory.prevention?.map((p, i) => (
                          <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
                            <span className="text-emerald-400 mt-0.5">🛡️</span> {p}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                );
              } else {
                // Raw text advisory fallback
                return (
                  <div className="glass-card p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Sparkles className="w-5 h-5 text-green-400" />
                      <h3 className="font-[Outfit] font-semibold text-white">AI Advisory</h3>
                      {translatedAdvisory && (
                        <button onClick={() => handleSpeak(displayText)} className="ml-auto p-1 text-green-400 hover:text-green-300">
                          <Volume2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <p className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">
                      {displayText}
                    </p>
                  </div>
                );
              }
            })()}

            {/* Scan Again */}
            <div className="text-center">
              <button onClick={resetScan} className="btn-secondary py-3 px-8">
                🔄 Scan Another Image
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
