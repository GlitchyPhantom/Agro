import React from "react";
import LanguageSelector from "../../components/LanguageSelector";
import { Globe, Stethoscope, FlaskConical, Mic, MicOff, Send, Loader2 } from "lucide-react";

export default function ChatbotInput({
  input,
  setInput,
  handleKeyDown,
  sendMessage,
  selectedMode,
  setSelectedMode,
  lang,
  setLang,
  recording,
  toggleRecording,
  loading,
}) {
  return (
    <div className="p-4 bg-[#070b09]">
      <div className="max-w-3xl mx-auto">
        <div className="bg-[#0e1612] border border-[#1a2620] focus-within:border-emerald-500/40 rounded-2xl p-3 shadow-2xl shadow-black/80 transition-all">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="How can I help you today?"
            rows={2}
            className="w-full bg-transparent text-white text-xs placeholder-gray-500 focus:outline-none resize-none px-1 py-1"
          />

          {/* Mode Pills, Language Selector & Controls Bar inside Prompt Card */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#17241d] mt-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                onClick={() => setSelectedMode("General")}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                  selectedMode === "General"
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                    : "bg-[#14211a] text-gray-400 hover:text-white"
                }`}
              >
                <Globe className="w-3 h-3" /> General Mode
              </button>

              <button
                onClick={() => setSelectedMode("Diagnosis")}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                  selectedMode === "Diagnosis"
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                    : "bg-[#14211a] text-gray-400 hover:text-white"
                }`}
              >
                <Stethoscope className="w-3 h-3" /> Disease Advisory
              </button>

              <button
                onClick={() => setSelectedMode("Treatment")}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                  selectedMode === "Treatment"
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                    : "bg-[#14211a] text-gray-400 hover:text-white"
                }`}
              >
                <FlaskConical className="w-3 h-3" /> Treatment Plan
              </button>

              {/* Language Selector embedded directly inside prompt card */}
              <div className="ml-1">
                <LanguageSelector currentLang={lang} onChangeLang={setLang} />
              </div>
            </div>

            <div className="flex items-center gap-1.5 ml-auto">
              <button
                onClick={toggleRecording}
                className={`p-2 rounded-xl border transition-all ${
                  recording
                    ? "bg-red-500/20 border-red-500/40 text-red-400 animate-pulse"
                    : "bg-[#14211a] border-[#1e3127] text-gray-400 hover:text-white"
                }`}
                title={recording ? "Stop recording" : "Voice input"}
              >
                {recording ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
              </button>

              <button
                onClick={() => sendMessage()}
                disabled={loading || !input.trim()}
                className="p-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-bold disabled:opacity-30 disabled:hover:from-emerald-500 transition-all shadow-md shadow-emerald-500/20"
              >
                {loading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
