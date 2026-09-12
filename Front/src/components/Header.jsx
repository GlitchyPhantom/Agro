import { useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Menu, Sparkles } from "lucide-react";

export default function Header({ setMobileOpen }) {
  const location = useLocation();
  const { user } = useAuth();

  // Hide header completely on AI Assistant page for full-screen ChatGPT style view
  if (location.pathname === "/chat") return null;

  const getPageTitle = () => {
    switch (location.pathname) {
      case "/dashboard":
        return "Dashboard";
      case "/scan":
        return "Disease Scanner";
      case "/history":
        return "Scan History";
      default:
        return "Overview";
    }
  };

  const userName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Farmer";

  return (
    <header className="sticky top-0 z-30 h-16 border-b border-[#2a3a34] bg-[#0a0f0d]/80 backdrop-blur-xl px-4 md:px-6 flex items-center justify-between">
      <div className="flex items-center gap-3">
        {/* Mobile menu trigger */}
        <button
          onClick={() => setMobileOpen(true)}
          className="md:hidden p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
          aria-label="Open sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Page Title */}
        <h1 className="font-[Outfit] text-lg font-semibold text-white tracking-wide">
          {getPageTitle()}
        </h1>
      </div>

      {/* Right side info */}
      <div className="flex items-center gap-4">
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-medium">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <Sparkles className="w-3.5 h-3.5" />
          <span>AI Ready</span>
        </div>

        <div className="flex items-center gap-2.5 pl-2 border-l border-[#2a3a34]">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white text-xs font-bold shadow-md shadow-green-500/20">
            {userName.charAt(0).toUpperCase()}
          </div>
          <span className="hidden lg:inline text-xs font-medium text-gray-300">
            {userName}
          </span>
        </div>
      </div>
    </header>
  );
}
