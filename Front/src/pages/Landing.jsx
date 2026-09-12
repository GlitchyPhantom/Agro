import { Link } from "react-router-dom";
import {
  Leaf,
  ScanLine,
  Shield,
  Globe,
  MessageCircle,
  Clock,
  Zap,
  ArrowRight,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import Footer from "../components/Footer";

const features = [
  {
    icon: ScanLine,
    title: "AI Disease Detection",
    desc: "Upload or capture a leaf photo — our CNN model identifies diseases with top-3 predictions and confidence scores in seconds.",
    color: "from-green-500 to-emerald-600",
  },
  {
    icon: Shield,
    title: "Expert Advisory",
    desc: "Get cause analysis, organic & chemical treatments with dosage, severity assessment, and preventive measures for every detection.",
    color: "from-emerald-500 to-teal-600",
  },
  {
    icon: Globe,
    title: "Multilingual + Voice",
    desc: "Full support for 11 Indian languages with voice input & output — designed for farmers with low literacy, using Sarvam AI.",
    color: "from-teal-500 to-cyan-600",
  },
  {
    icon: MessageCircle,
    title: "AI Chatbot",
    desc: "Ask follow-up questions about treatments, organic farming, spraying schedules — powered by Groq's blazing-fast LLM.",
    color: "from-cyan-500 to-blue-600",
  },
  {
    icon: Clock,
    title: "Scan History",
    desc: "Track disease recurrence over time, save location-tagged records, and monitor your farm's health trends.",
    color: "from-blue-500 to-indigo-600",
  },
  {
    icon: Zap,
    title: "Instant Results",
    desc: "Edge-fast inference with TensorFlow CNN model — get results in under 2 seconds, even on slow connections.",
    color: "from-yellow-500 to-orange-600",
  },
];

const crops = ["🌽 Corn (Maize)", "🥔 Potato", "🍅 Tomato"];

const diseases = [
  "Common Rust",
  "Northern Blight",
  "Early Blight",
  "Late Blight",
  "Healthy Detection",
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-[#0a0f0d] flex flex-col text-slate-100">
      {/* ── Nav ───────────────────────────────────────────────────────────── */}
      <nav
        className="fixed top-0 left-0 right-0 w-full z-50 border-b border-[#2a3a34]/60 bg-[#0a0f0d]/90 backdrop-blur-xl"
        style={{ height: "64px" }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-full">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-green-500/20">
              <Leaf className="w-5 h-5 text-white" />
            </div>
            <span className="font-[Outfit] font-bold text-lg text-white">
              Agro<span className="text-green-400">Intel</span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login" className="btn-secondary text-sm py-2 px-5">
              Login
            </Link>
            <Link to="/signup" className="btn-primary text-sm py-2 px-5">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Main Content Container ────────────────────────────────────────── */}
      <main className="flex-1 w-full" style={{ paddingTop: "64px" }}>
        {/* ── Hero ──────────────────────────────────────────────────────────── */}
        <section
          className="hero-gradient relative overflow-hidden w-full flex justify-center"
          style={{
            paddingTop: "60px",
            paddingBottom: "80px",
            paddingLeft: "24px",
            paddingRight: "24px",
          }}
        >
          {/* Decorative background gradients */}
          <div className="absolute top-10 left-10 w-72 h-72 bg-green-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

          <div
            className="w-full max-w-4xl text-center relative z-10 flex flex-col items-center justify-center"
            style={{ marginLeft: "auto", marginRight: "auto" }}
          >
            {/* Badge */}
            <div
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-sm font-medium animate-fade-in"
              style={{ marginBottom: "24px" }}
            >
              <Sparkles className="w-4 h-4" />
              AI-Powered Agriculture for Indian Farmers
            </div>

            {/* Main Heading */}
            <h1
              className="font-[Outfit] text-4xl sm:text-6xl lg:text-7xl font-extrabold text-white animate-slide-up"
              style={{ marginBottom: "24px", lineHeight: "1.15" }}
            >
              Detect Plant Diseases
              <br />
              <span className="gradient-text inline-block">Instantly with AI</span>
            </h1>

            {/* Subtitle */}
            <p
              className="text-base sm:text-xl text-gray-400 max-w-2xl animate-slide-up"
              style={{ marginBottom: "36px", lineHeight: "1.6", marginLeft: "auto", marginRight: "auto" }}
            >
              Upload a leaf photo, get accurate disease detection with treatment advisory —
              in your language, with voice support. Built for every farmer in India.
            </p>

            {/* Action Buttons */}
            <div
              className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-up"
              style={{ marginBottom: "48px" }}
            >
              <Link to="/signup" className="btn-primary text-base py-3.5 px-8 shadow-lg shadow-green-500/20">
                Start Scanning Free
                <ArrowRight className="w-5 h-5" />
              </Link>
              <a href="#features" className="btn-secondary text-base py-3.5 px-8">
                See Features
                <ChevronRight className="w-5 h-5" />
              </a>
            </div>

            {/* Supported Crops */}
            <div className="w-full flex flex-col items-center animate-slide-up">
              <p className="text-xs uppercase tracking-widest text-gray-500 mb-3 font-semibold">
                Currently Supporting
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                {crops.map((crop) => (
                  <span
                    key={crop}
                    className="px-4 py-2 rounded-full bg-[#111916] border border-[#2a3a34] text-sm text-gray-300 shadow-sm"
                  >
                    {crop}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── Features ──────────────────────────────────────────────────────── */}
        <section
          id="features"
          className="bg-[#0a0f0d] border-t border-[#1a2420] w-full flex justify-center"
          style={{ paddingTop: "80px", paddingBottom: "80px", paddingLeft: "24px", paddingRight: "24px" }}
        >
          <div className="w-full max-w-6xl" style={{ marginLeft: "auto", marginRight: "auto" }}>
            <div className="text-center" style={{ marginBottom: "48px" }}>
              <h2 className="font-[Outfit] text-3xl sm:text-4xl font-bold text-white" style={{ marginBottom: "12px" }}>
                Everything Your Farm Needs
              </h2>
              <p className="text-gray-400 max-w-xl text-base" style={{ marginLeft: "auto", marginRight: "auto" }}>
                From AI-powered diagnostics to multilingual voice support — AgroIntel is the
                complete digital assistant for modern farming.
              </p>
            </div>

            <div
              className="w-full"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                gap: "24px",
              }}
            >
              {features.map((f, i) => {
                const Icon = f.icon;
                return (
                  <div key={i} className="glass-card p-7 group flex flex-col items-start">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${f.color} flex items-center justify-center mb-5 shadow-lg group-hover:scale-105 transition-transform`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="font-[Outfit] text-lg font-semibold text-white mb-2">
                      {f.title}
                    </h3>
                    <p className="text-sm text-gray-400 leading-relaxed">{f.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── How It Works ─────────────────────────────────────────────────── */}
        <section
          className="bg-[#080c0a] border-t border-[#1a2420] w-full flex justify-center"
          style={{ paddingTop: "80px", paddingBottom: "80px", paddingLeft: "24px", paddingRight: "24px" }}
        >
          <div className="w-full max-w-5xl" style={{ marginLeft: "auto", marginRight: "auto" }}>
            <div className="text-center" style={{ marginBottom: "48px" }}>
              <h2 className="font-[Outfit] text-3xl sm:text-4xl font-bold text-white" style={{ marginBottom: "12px" }}>
                How It Works
              </h2>
              <p className="text-gray-400 text-base">Three simple steps to protect your crops</p>
            </div>

            <div
              className="w-full"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                gap: "32px",
              }}
            >
              {[
                {
                  step: "01",
                  title: "Upload Leaf Photo",
                  desc: "Take a picture of the affected leaf or upload from gallery. Our AI accepts any plant image.",
                  gradient: "from-green-500 to-emerald-500",
                },
                {
                  step: "02",
                  title: "AI Analyzes Disease",
                  desc: "Our trained CNN model processes the image, identifies the disease with top-3 predictions and confidence scores.",
                  gradient: "from-emerald-500 to-teal-500",
                },
                {
                  step: "03",
                  title: "Get Treatment Plan",
                  desc: "Receive detailed advisory with organic & chemical treatments, dosage guidance, and prevention tips — in your language.",
                  gradient: "from-teal-500 to-cyan-500",
                },
              ].map((item, i) => (
                <div key={i} className="text-center group flex flex-col items-center">
                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${item.gradient} flex items-center justify-center mb-5 text-xl font-bold text-white shadow-lg group-hover:scale-105 transition-transform`}>
                    {item.step}
                  </div>
                  <h3 className="font-[Outfit] text-lg font-semibold text-white mb-2">
                    {item.title}
                  </h3>
                  <p className="text-sm text-gray-400 leading-relaxed max-w-xs">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Diseases Detected ────────────────────────────────────────────── */}
        <section
          className="bg-[#0a0f0d] border-t border-[#1a2420] w-full flex justify-center"
          style={{ paddingTop: "80px", paddingBottom: "80px", paddingLeft: "24px", paddingRight: "24px" }}
        >
          <div className="w-full max-w-4xl text-center flex flex-col items-center" style={{ marginLeft: "auto", marginRight: "auto" }}>
            <h2 className="font-[Outfit] text-3xl sm:text-4xl font-bold text-white" style={{ marginBottom: "12px" }}>
              Diseases We Detect
            </h2>
            <p className="text-gray-400 max-w-xl text-base" style={{ marginBottom: "36px", marginLeft: "auto", marginRight: "auto" }}>
              Trained on PlantVillage dataset — 9 classes across 3 crops with high accuracy CNN model
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 w-full">
              {diseases.map((d) => (
                <span key={d} className="px-5 py-2.5 rounded-full glass-card text-sm text-green-300 font-medium">
                  {d}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA ──────────────────────────────────────────────────────────── */}
        <section
          className="hero-gradient border-t border-[#1a2420] w-full flex justify-center"
          style={{ paddingTop: "80px", paddingBottom: "80px", paddingLeft: "24px", paddingRight: "24px" }}
        >
          <div className="w-full max-w-3xl text-center flex flex-col items-center" style={{ marginLeft: "auto", marginRight: "auto" }}>
            <h2 className="font-[Outfit] text-3xl sm:text-4xl font-bold text-white" style={{ marginBottom: "16px" }}>
              Ready to Protect Your Crops?
            </h2>
            <p className="text-gray-400 text-base" style={{ marginBottom: "32px" }}>
              Join thousands of farmers using AgroIntel to detect diseases early and save their harvest.
            </p>
            <Link to="/signup" className="btn-primary text-base py-3.5 px-8 shadow-lg shadow-green-500/20">
              Create Free Account
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

