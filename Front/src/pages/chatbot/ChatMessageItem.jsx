import React, { useState } from "react";
import { RotateCw, Pencil, Copy, Check, Volume2, VolumeX, Loader2, X, Send } from "lucide-react";
import FormattedMessage from "./FormattedMessage";

export default function ChatMessageItem({
  msg,
  index,
  copiedIndex,
  onCopy,
  onRetry,
  onEdit,
  onSaveEdit,
  onSpeak,
  isPlaying,
  isLoadingAudio,
}) {
  const isUser = msg.role === "user";
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(msg.content);

  const handleSave = () => {
    if (!editText.trim()) return;
    setIsEditing(false);
    if (onSaveEdit) {
      onSaveEdit(index, editText);
    } else if (onEdit) {
      onEdit(editText);
    }
  };

  return (
    <div className="group animate-slide-up space-y-1">
      {isUser ? (
        /* USER MESSAGE: Rectangular Box with Inline Editing and Hover Action Bar */
        <div className="flex flex-col items-end gap-1 w-full">
          {isEditing ? (
            <div className="w-full max-w-[85%] bg-[#121c16] border border-emerald-500/40 rounded-2xl p-3 shadow-xl">
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                rows={2}
                className="w-full bg-transparent text-white text-xs sm:text-sm focus:outline-none resize-none"
              />
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#1b2b22] mt-2">
                <button
                  onClick={() => setIsEditing(false)}
                  className="flex items-center gap-1 px-3 py-1 text-xs text-gray-400 hover:text-white rounded-lg transition-colors"
                >
                  <X className="w-3.5 h-3.5" /> Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="flex items-center gap-1 px-3 py-1 bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-semibold rounded-lg shadow-md transition-all"
                >
                  <Send className="w-3.5 h-3.5" /> Save & Resend
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-[#1c241e] text-white border border-[#28382d] px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-medium shadow-md max-w-[85%] leading-relaxed">
              <p className="whitespace-pre-wrap">{msg.content}</p>
            </div>
          )}

          {/* Sub-row under User prompt ONLY SHOWN ON HOVER when not editing */}
          {!isEditing && (
            <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center gap-2.5 text-xs text-gray-500 pr-1">
              <span>just now</span>
              <button
                onClick={() => onRetry(msg.content)}
                className="hover:text-gray-300 transition-colors p-0.5"
                title="Retry query"
              >
                <RotateCw className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setIsEditing(true)}
                className="hover:text-emerald-400 transition-colors p-0.5"
                title="Edit message inline"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onCopy(msg.content, `u-${index}`)}
                className="hover:text-gray-300 transition-colors p-0.5"
                title="Copy prompt"
              >
                {copiedIndex === `u-${index}` ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          )}
        </div>
      ) : (
        /* AI ASSISTANT RESPONSE: Matched 1-to-1 with reference image with Hover Action Bar */
        <div className="flex flex-col gap-1 pt-0.5">
          <div className="text-gray-200 text-xs sm:text-sm leading-relaxed max-w-none">
            <FormattedMessage text={msg.content} />
          </div>

          {/* Sub-row under AI response ONLY SHOWN ON HOVER unless active */}
          <div className={`transition-opacity duration-200 flex items-center gap-2.5 pt-1 text-xs text-gray-500 ${isPlaying || isLoadingAudio ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}>
            <button
              onClick={() => {
                const cleanText = msg.content.replace(/<think>[\s\S]*?<\/think>/gi, "").trim() || msg.content;
                onCopy(cleanText, `a-${index}`);
              }}
              className="hover:text-gray-300 transition-colors p-0.5"
              title="Copy response"
            >
              {copiedIndex === `a-${index}` ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>

            <button
              onClick={() => onSpeak(msg.content, index)}
              className={`transition-colors p-0.5 ${isPlaying || isLoadingAudio ? "text-emerald-400 font-bold" : "hover:text-emerald-400 text-gray-500"}`}
              title={isPlaying ? "Stop audio" : isLoadingAudio ? "Loading audio from Sarvam..." : "Listen audio"}
            >
              {isLoadingAudio ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
              ) : isPlaying ? (
                <VolumeX className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              ) : (
                <Volume2 className="w-3.5 h-3.5" />
              )}
            </button>

            <button
              onClick={() => onRetry("Regenerate response")}
              className="hover:text-gray-300 transition-colors p-0.5"
              title="Regenerate response"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>

            <span className="text-xs text-gray-500 ml-1">just now</span>
          </div>
        </div>
      )}
    </div>
  );
}
