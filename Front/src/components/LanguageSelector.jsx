import { useState, useRef, useEffect } from "react";
import { Globe, Volume2, ChevronUp, ChevronDown } from "lucide-react";

const LANGUAGES = {
  en: "English",
  hi: "हिंदी",
  od: "ଓଡ଼ିଆ",
  bn: "বাংলা",
  ta: "தமிழ்",
  te: "తెలుగు",
  mr: "मराठी",
  gu: "ગુજરાતી",
  kn: "ಕನ್ನಡ",
  ml: "മലയാളം",
  pa: "ਪੰਜਾਬੀ",
};

export default function LanguageSelector({
  currentLang,
  onChangeLang,
  onSpeak,
  speakText,
  dropUp = true,
}) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#14211a] border border-[#1e3127] text-xs font-medium text-emerald-400 hover:border-emerald-500/50 transition-all shadow-sm"
        >
          <Globe className="w-3.5 h-3.5 text-emerald-400" />
          <span>{LANGUAGES[currentLang] || "English"}</span>
          {open ? (
            <ChevronUp className="w-3 h-3 text-gray-400" />
          ) : (
            <ChevronDown className="w-3 h-3 text-gray-400" />
          )}
        </button>
        {speakText && (
          <button
            type="button"
            onClick={onSpeak}
            className="p-1.5 rounded-lg bg-[#14211a] border border-[#1e3127] text-emerald-400 hover:border-emerald-500/50 hover:bg-emerald-500/10 transition-all"
            title="Listen in selected language"
          >
            <Volume2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {open && (
        <div
          className={`absolute left-0 ${
            dropUp ? "bottom-full mb-2" : "top-full mt-2"
          } z-50 w-44 py-1.5 rounded-xl bg-[#0f1712] border border-[#233529] shadow-2xl shadow-black animate-slide-up max-h-56 overflow-y-auto`}
        >
          {Object.entries(LANGUAGES).map(([code, name]) => (
            <button
              key={code}
              type="button"
              onClick={() => {
                onChangeLang(code);
                setOpen(false);
              }}
              className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between transition-all ${
                currentLang === code
                  ? "bg-emerald-500/20 text-emerald-400 font-semibold"
                  : "text-gray-300 hover:text-white hover:bg-emerald-500/10"
              }`}
            >
              <span>{name}</span>
              <span className="text-[10px] uppercase text-gray-500">{code}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
