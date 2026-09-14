import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  Leaf,
  LayoutDashboard,
  ScanLine,
  Clock,
  MessageCircle,
  LogOut,
  X,
  User,
  MapPin,
  Package,
} from "lucide-react";

export default function Sidebar({ mobileOpen, setMobileOpen }) {
  const { signOut, user } = useAuth();
  const location = useLocation();
  const [isHovered, setIsHovered] = useState(false);

  const links = [
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/farm", label: "Farm Plots", icon: MapPin },
    { to: "/inventory", label: "Shed Inventory", icon: Package },
    { to: "/scan", label: "Scan Plant", icon: ScanLine },
    { to: "/history", label: "Scan History", icon: Clock },
    { to: "/chat", label: "AI Advisor", icon: MessageCircle },
  ];


  const isActive = (path) => location.pathname === path;
  const getCleanName = () => {
    const raw = user?.user_metadata?.full_name || user?.user_metadata?.name;
    if (raw && typeof raw === "string" && raw.toLowerCase() !== "null" && raw.trim() !== "") {
      return raw.trim();
    }
    if (user?.email && typeof user.email === "string" && user.email.toLowerCase() !== "null") {
      const namePart = user.email.split("@")[0];
      if (namePart && namePart.toLowerCase() !== "null") {
        return namePart;
      }
    }
    return "User";
  };
  const userName = getCleanName();

  return (
    <>
      {/* Desktop Sidebar - Sleek 64px compact icon rail expanding to 208px (w-52) on hover */}
      <aside
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`hidden md:flex flex-col justify-between fixed top-0 left-0 bottom-0 z-40 bg-[#080c0a] border-r border-[#1a2620] transition-all duration-300 ease-in-out ${
          isHovered ? "w-52 shadow-2xl shadow-black/90 border-[#23352c]" : "w-16"
        }`}
      >
        {/* Top Header & Brand */}
        <div>
          <div className="h-16 flex items-center px-3.5">
            <Link to="/dashboard" className="flex items-center gap-3 overflow-hidden">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-emerald-500/20 border border-emerald-400/30">
                <Leaf className="w-4.5 h-4.5 text-white" strokeWidth={2} />
              </div>
              {isHovered && (
                <span className="font-[Outfit] font-bold text-lg text-white tracking-wide animate-fade-in whitespace-nowrap">
                  Agro<span className="text-emerald-400">Intel</span>
                </span>
              )}
            </Link>
          </div>

          {/* Navigation Links */}
          <nav className="p-2 space-y-1.5 mt-1">
            {links.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  title={!isHovered ? item.label : undefined}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                    active
                      ? "bg-white/10 text-white font-semibold shadow-sm"
                      : "text-gray-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <Icon
                    className={`w-4.5 h-4.5 flex-shrink-0 ${
                      active ? "text-emerald-400" : "text-gray-400"
                    }`}
                    strokeWidth={active ? 2 : 1.75}
                  />
                  {isHovered && (
                    <span className="truncate animate-fade-in tracking-wide">
                      {item.label}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom User Profile */}
        <div className="p-2.5 border-t border-[#1a2620]">
          {isHovered ? (
            <div className="flex items-center justify-between p-2 rounded-xl bg-[#0f1713] border border-[#1a2620] animate-fade-in">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-emerald-400" strokeWidth={1.75} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-white truncate">{userName}</p>
                  <p className="text-[10px] text-gray-500 truncate">{user?.email}</p>
                </div>
              </div>
              <button
                onClick={signOut}
                className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" strokeWidth={1.75} />
              </button>
            </div>
          ) : (
            <div className="flex justify-center">
              <div
                className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center cursor-pointer hover:border-emerald-400/50 transition-colors"
                title={user?.email}
              >
                <User className="w-4 h-4 text-emerald-400" strokeWidth={1.75} />
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm md:hidden transition-opacity"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile Drawer */}
      <aside
        className={`fixed top-0 left-0 bottom-0 z-50 w-72 bg-[#080c0a] border-r border-[#1a2620] flex flex-col justify-between md:hidden transform transition-transform duration-300 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div>
          <div className="h-16 flex items-center justify-between px-5 border-b border-[#1a2620]">
            <Link to="/dashboard" onClick={() => setMobileOpen(false)} className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <Leaf className="w-5 h-5 text-white" />
              </div>
              <span className="font-[Outfit] font-bold text-lg text-white">
                Agro<span className="text-emerald-400">Intel</span>
              </span>
            </Link>
            <button
              onClick={() => setMobileOpen(false)}
              className="p-2 text-gray-400 hover:text-white"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <nav className="p-4 space-y-2">
            {links.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-4 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                    active
                      ? "bg-white/10 text-white font-semibold"
                      : "text-gray-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <Icon className="w-5 h-5 text-emerald-400" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="p-4 border-t border-[#1a2620]">
          <div className="flex items-center justify-between p-3 rounded-xl bg-[#0f1713] border border-[#1a2620] mb-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                <User className="w-5 h-5 text-emerald-400" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white truncate">{userName}</p>
                <p className="text-xs text-gray-500 truncate">{user?.email}</p>
              </div>
            </div>
          </div>
          <button
            onClick={() => {
              signOut();
              setMobileOpen(false);
            }}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 font-medium transition-all"
          >
            <LogOut className="w-5 h-5" /> Sign Out
          </button>
        </div>
      </aside>
    </>
  );
}
