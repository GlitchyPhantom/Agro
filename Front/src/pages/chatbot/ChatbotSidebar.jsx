import React from "react";
import { Search, PanelLeft, Plus, ChevronDown, MessageSquare, Trash2 } from "lucide-react";

export default function ChatbotSidebar({
  showChatSidebar,
  setShowChatSidebar,
  searchOpen,
  setSearchOpen,
  searchQuery,
  setSearchQuery,
  handleNewChat,
  chatsOpen,
  setChatsOpen,
  filteredChats,
  activeChatId,
  loadChatThread,
  deleteChatThread,
}) {
  if (!showChatSidebar) return null;

  return (
    <aside className="w-52 bg-[#090d0b] border-r border-[#1a2620] flex flex-col justify-between flex-shrink-0 transition-all duration-300">
      <div className="p-3">
        {/* Header: AgroIntel Title + Search & Panel Left Icons */}
        <div className="flex items-center justify-between mb-3.5 px-1">
          <span className="font-[Outfit] font-bold text-base text-white tracking-wide">
            Agro<span className="text-emerald-400">Intel</span>
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setSearchOpen(!searchOpen)}
              className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
              title="Search"
            >
              <Search className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setShowChatSidebar(false)}
              className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
              title="Hide sidebar"
            >
              <PanelLeft className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Search Input if toggled */}
        {searchOpen && (
          <div className="mb-3">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search chats..."
              className="w-full bg-[#0e1713] border border-[#1a2620] text-white text-xs px-2.5 py-1.5 rounded-xl focus:outline-none focus:border-emerald-500/40"
              autoFocus
            />
          </div>
        )}

        {/* Full-width + New Button without border */}
        <button
          onClick={handleNewChat}
          className="w-full flex items-center gap-2.5 py-2 px-3 rounded-xl bg-[#0f1713] hover:bg-[#15231c] text-gray-300 hover:text-white text-xs font-semibold transition-all mb-3.5"
        >
          <div className="w-4.5 h-4.5 rounded-full bg-emerald-500/20 flex items-center justify-center">
            <Plus className="w-3 h-3 text-emerald-400" />
          </div>
          <span>New</span>
        </button>

        {/* Functional Collapsible Chats Section */}
        <div>
          <button
            onClick={() => setChatsOpen(!chatsOpen)}
            className="w-full flex items-center justify-between px-1 text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-2 hover:text-gray-300 transition-colors"
          >
            <span>Chats ({filteredChats.length})</span>
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform duration-200 ${
                chatsOpen ? "rotate-0" : "-rotate-90"
              }`}
            />
          </button>

          {chatsOpen && (
            <div className="space-y-1 animate-fade-in">
              {filteredChats.length === 0 ? (
                <p className="px-2 py-1 text-[11px] text-gray-600 italic">No chats found</p>
              ) : (
                filteredChats.map((chat) => (
                  <div
                    key={chat.id}
                    onClick={() => loadChatThread(chat)}
                    className={`group w-full flex items-center justify-between px-2 py-1.5 rounded-xl text-xs font-medium cursor-pointer transition-all ${
                      activeChatId === chat.id
                        ? "bg-white/10 text-white font-semibold"
                        : "text-gray-400 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <MessageSquare className="w-3.5 h-3.5 flex-shrink-0 text-gray-400" />
                      <span className="truncate">{chat.title}</span>
                    </div>
                    <button
                      onClick={(e) => deleteChatThread(e, chat.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-gray-500 hover:text-red-400 transition-opacity"
                      title="Delete thread"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
