import React from "react";
import { Sparkles, PanelLeft, Zap } from "lucide-react";

export default function ChatbotHeader({ showChatSidebar, setShowChatSidebar }) {
  return (
    <div className="h-12 border-b border-[#1a2620]/60 bg-[#070b09]/80 backdrop-blur-xl px-4 flex items-center justify-between">
      <div className="flex items-center gap-2">
        {!showChatSidebar && (
          <button
            onClick={() => setShowChatSidebar(true)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors mr-1"
            title="Show chats sidebar"
          >
            <PanelLeft className="w-4 h-4" />
          </button>
        )}
        <span className="text-xs font-medium text-gray-400 flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
          AgroIntel Intelligence
        </span>
      </div>

      <div className="flex items-center gap-2">
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-400 font-medium">
          <Zap className="w-3 h-3" />
          <span>Groq Llama 3.3 70B</span>
        </div>
      </div>
    </div>
  );
}
