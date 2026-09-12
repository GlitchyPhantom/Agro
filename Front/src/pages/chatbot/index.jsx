import { useState, useRef, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { Loader2 } from "lucide-react";
import ChatbotSidebar from "./ChatbotSidebar";
import ChatbotHeader from "./ChatbotHeader";
import FeatureCards from "./FeatureCards";
import ChatMessageItem from "./ChatMessageItem";
import ChatbotInput from "./ChatbotInput";

const API = import.meta.env.VITE_API_URL || "";

export default function Chatbot() {
  const { user } = useAuth();
  const userId = user?.id || user?.email || "guest";
  const userName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Farmer";

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [lang, setLang] = useState("en");
  const [recording, setRecording] = useState(false);
  const [activeChatId, setActiveChatId] = useState(null);
  const [chatHistory, setChatHistory] = useState([]);
  const [selectedMode, setSelectedMode] = useState("General");
  const [showChatSidebar, setShowChatSidebar] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [chatsOpen, setChatsOpen] = useState(true);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [playingIndex, setPlayingIndex] = useState(null);
  const [audioLoadingIndex, setAudioLoadingIndex] = useState(null);

  const messagesEnd = useRef(null);
  const mediaRecorderRef = useRef(null);
  const activeAudioRef = useRef(null);

  const stopAudio = () => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
      activeAudioRef.current.currentTime = 0;
      activeAudioRef.current = null;
    }
    setPlayingIndex(null);
    setAudioLoadingIndex(null);
  };

  // Fetch stored user chats from Database on mount and group by session_id
  useEffect(() => {
    const fetchStoredHistory = async () => {
      if (!userId || userId === "guest") return;
      try {
        const res = await fetch(`${API}/api/chat/history`, {
          headers: {
            "Content-Type": "application/json",
            "X-User-Id": userId,
          },
        });
        if (res.ok) {
          const data = await res.json();
          if (data.chats && data.chats.length > 0) {
            const threadsMap = {};

            data.chats.forEach((c, i) => {
              const sid = c.session_id || `chat_${c.id || i}`;
              const cleanMsg = (c.message || "").replace(/^\[Mode:\s*[^\]]+\]\s*/i, "").trim();

              if (!threadsMap[sid]) {
                threadsMap[sid] = {
                  id: sid,
                  title: cleanMsg ? cleanMsg.slice(0, 24) + (cleanMsg.length > 24 ? "..." : "") : `Chat ${i + 1}`,
                  messages: [],
                  date: c.created_at ? new Date(c.created_at).toLocaleDateString() : "Recent",
                };
              }

              const role = c.sender === "user" ? "user" : "assistant";
              const content = cleanMsg || c.message;
              const prevMessages = threadsMap[sid].messages;
              const isDuplicate = prevMessages.some(
                (m) => m.role === role && m.content === content
              );

              if (!isDuplicate) {
                threadsMap[sid].messages.push({
                  role,
                  content,
                });
              }
            });

            const threadList = Object.values(threadsMap);
            setChatHistory(threadList);
          } else {
            setChatHistory([]);
          }
        }
      } catch (err) {
        console.log("[DB Info] Loaded local chat state:", err);
      }
    };

    fetchStoredHistory();
  }, [userId]);

  const scrollToBottom = () => {
    messagesEnd.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleNewChat = () => {
    stopAudio();
    setMessages([]);
    setActiveChatId(null);
    setInput("");
  };

  const loadChatThread = (chat) => {
    stopAudio();
    setActiveChatId(chat.id);
    if (chat.messages && chat.messages.length > 0) {
      setMessages(chat.messages);
    } else if (chat.query) {
      const cleanQ = (chat.query || "").replace(/^\[Mode:\s*[^\]]+\]\s*/i, "");
      setMessages([
        { role: "user", content: cleanQ },
        { role: "assistant", content: chat.response || "No response recorded." },
      ]);
    }
  };

  const deleteChatThread = async (e, chatId) => {
    e.stopPropagation();
    setChatHistory((prev) => prev.filter((c) => c.id !== chatId));
    if (activeChatId === chatId) {
      handleNewChat();
    }
    try {
      await fetch(`${API}/api/chat/thread/${chatId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "X-User-Id": userId,
        },
      });
    } catch (err) {
      console.error("Delete thread DB error:", err);
    }
  };

  const handleSaveEdit = (idx, newText) => {
    const updatedMessages = messages.slice(0, idx);
    setMessages(updatedMessages);
    sendMessage(newText);
  };

  const copyToClipboard = (text, idx) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const sendMessage = async (textToSubmit) => {
    const text = textToSubmit || input;
    if (!text.trim()) return;

    // A new thread starts if messages is empty or activeChatId is null
    const isNewThread = messages.length === 0 || !activeChatId;
    const currentSessionId = isNewThread ? `session_${Date.now()}` : activeChatId;

    if (isNewThread) {
      setActiveChatId(currentSessionId);
    }

    const userMsg = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      // Direct post to AI endpoint with native language parameter and automatic Supabase storage
      const res = await fetch(`${API}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-User-Id": userId,
        },
        body: JSON.stringify({
          message: text,
          history: messages.slice(-6).map((m) => ({ role: m.role, content: m.content })),
          user_id: userId,
          mode: selectedMode,
          language: lang,
          session_id: String(currentSessionId),
        }),
      });

      if (!res.ok) throw new Error("Chat failed");
      const data = await res.json();
      const reply = data.reply;

      const assistantMsg = { role: "assistant", content: reply };
      setMessages((prev) => [...prev, assistantMsg]);

      // Update sidebar threads state with complete messages list
      setChatHistory((prev) => {
        const existingIdx = prev.findIndex((c) => c.id === currentSessionId);
        const cleanDisplayTitle = text.slice(0, 24) + (text.length > 24 ? "..." : "");

        if (existingIdx >= 0) {
          const updated = [...prev];
          updated[existingIdx] = {
            ...updated[existingIdx],
            messages: [...(updated[existingIdx].messages || []), userMsg, assistantMsg],
          };
          return updated;
        } else {
          return [
            {
              id: currentSessionId,
              title: cleanDisplayTitle,
              messages: [userMsg, assistantMsg],
              date: "Just now",
            },
            ...prev,
          ];
        }
      });
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, I couldn't process your request. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const speakText = async (text, idx) => {
    if (!text) return;

    // Toggle stop if already playing or loading audio for this message
    if (playingIndex === idx || audioLoadingIndex === idx) {
      stopAudio();
      return;
    }

    // Stop any active audio playback before starting new speech
    stopAudio();

    // Clean Markdown formatting & think tags before audio playback
    let cleanText = text
      .replace(/<think>[\s\S]*?<\/think>/gi, "")
      .replace(/```[\s\S]*?```/g, "")
      .replace(/[*#`_~>-]/g, " ")
      .replace(/https?:\/\/\S+/g, "")
      .replace(/\s+/g, " ")
      .trim();

    if (!cleanText) return;

    // Smart language detection to conserve Sarvam API credits
    const containsHindi = /[\u0900-\u097F]/.test(cleanText);
    const containsOdia = /[\u0B00-\u0B7F]/.test(cleanText);

    let targetLang = lang;
    if (containsHindi) targetLang = "hi";
    else if (containsOdia) targetLang = "od";

    // 1. ENGLISH: Use Chrome / Browser built-in SpeechSynthesis TTS (saves Sarvam credits!)
    if (targetLang === "en" && !containsHindi && !containsOdia) {
      try {
        if ("speechSynthesis" in window) {
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(cleanText.slice(0, 500));
          utterance.lang = "en-US";
          utterance.rate = 1.0;
          utterance.pitch = 1.0;
          utterance.onstart = () => setPlayingIndex(idx);
          utterance.onend = () => setPlayingIndex(null);
          utterance.onerror = () => setPlayingIndex(null);
          window.speechSynthesis.speak(utterance);
          return;
        }
      } catch (err) {
        console.error("Browser SpeechSynthesis error:", err);
      }
    }

    // 2. INDIC LANGUAGES (Hindi, Odia, etc.): Use Sarvam AI TTS API
    try {
      setAudioLoadingIndex(idx);
      // Limit to max 400 characters per request to save Sarvam API 100 credits!
      const textToSpeak = cleanText.slice(0, 400);

      const res = await fetch(`${API}/api/tts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: textToSpeak, language: targetLang }),
      });

      setAudioLoadingIndex(null);

      if (res.ok) {
        const data = await res.json();
        if (data.audio) {
          const audio = new Audio(`data:audio/wav;base64,${data.audio}`);
          activeAudioRef.current = audio;
          setPlayingIndex(idx);

          audio.onended = () => {
            setPlayingIndex(null);
            activeAudioRef.current = null;
          };
          audio.onerror = (e) => {
            console.error("Audio playback error:", e);
            setPlayingIndex(null);
            activeAudioRef.current = null;
          };

          await audio.play();
        }
      } else {
        console.error("Sarvam TTS request error:", await res.text());
      }
    } catch (e) {
      setAudioLoadingIndex(null);
      setPlayingIndex(null);
      console.error("Sarvam TTS error:", e);
    }
  };

  const toggleRecording = async () => {
    if (recording) {
      mediaRecorderRef.current?.stop();
      setRecording(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      const chunks = [];

      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunks, { type: "audio/webm" });

        const reader = new FileReader();
        reader.onload = async () => {
          const base64 = reader.result.split(",")[1];
          try {
            const res = await fetch(`${API}/api/stt`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ audio: base64, language: lang }),
            });
            if (res.ok) {
              const data = await res.json();
              if (data.transcript) {
                setInput(data.transcript);
              }
            }
          } catch (e) {
            console.error("STT error:", e);
          }
        };
        reader.readAsDataURL(blob);
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setRecording(true);

      setTimeout(() => {
        if (mediaRecorder.state === "recording") {
          mediaRecorder.stop();
          setRecording(false);
        }
      }, 10000);
    } catch (e) {
      console.error("Microphone error:", e);
    }
  };

  const filteredChats = chatHistory.filter((c) =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-screen bg-[#070b09] flex overflow-hidden font-sans text-gray-100">
      {/* Compact Secondary AI Sidebar */}
      <ChatbotSidebar
        showChatSidebar={showChatSidebar}
        setShowChatSidebar={setShowChatSidebar}
        searchOpen={searchOpen}
        setSearchOpen={setSearchOpen}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        handleNewChat={handleNewChat}
        chatsOpen={chatsOpen}
        setChatsOpen={setChatsOpen}
        filteredChats={filteredChats}
        activeChatId={activeChatId}
        loadChatThread={loadChatThread}
        deleteChatThread={deleteChatThread}
      />

      {/* Main Chat Workspace */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#070b09] relative">
        {/* Top Floating AI Engine Header */}
        <ChatbotHeader
          showChatSidebar={showChatSidebar}
          setShowChatSidebar={setShowChatSidebar}
        />

        {/* Workspace Content / Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
          <div className="max-w-3xl mx-auto space-y-4">
            {messages.length === 0 ? (
              <FeatureCards userName={userName} onSelectPrompt={sendMessage} />
            ) : (
              messages.map((msg, i) => (
                <ChatMessageItem
                  key={i}
                  msg={msg}
                  index={i}
                  copiedIndex={copiedIndex}
                  onCopy={copyToClipboard}
                  onRetry={sendMessage}
                  onEdit={setInput}
                  onSaveEdit={handleSaveEdit}
                  onSpeak={speakText}
                  isPlaying={playingIndex === i}
                  isLoadingAudio={audioLoadingIndex === i}
                />
              ))
            )}

            {loading && (
              <div className="flex justify-start animate-fade-in py-2">
                <div className="flex items-center gap-2 text-gray-400 text-xs">
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                  <span>Thinking...</span>
                </div>
              </div>
            )}

            <div ref={messagesEnd} />
          </div>
        </div>

        {/* Elevated Prompt Box Component */}
        <ChatbotInput
          input={input}
          setInput={setInput}
          handleKeyDown={handleKeyDown}
          sendMessage={sendMessage}
          selectedMode={selectedMode}
          setSelectedMode={setSelectedMode}
          lang={lang}
          setLang={setLang}
          recording={recording}
          toggleRecording={toggleRecording}
          loading={loading}
        />
      </div>
    </div>
  );
}
