import React, { useState } from "react";
import { Brain, ChevronDown, ChevronRight, Copy, Check, Sparkles } from "lucide-react";

// Rich Markdown Formatter with Collapsible Thought Process (<think> tag parser)
export default function FormattedMessage({ text }) {
  if (!text) return null;

  const [showThinking, setShowThinking] = useState(false);
  const [copiedThink, setCopiedThink] = useState(false);

  let thinkContent = "";
  let mainText = text;

  // 1. Extract <think>...</think> reasoning block (closed or unclosed)
  const thinkMatch = text.match(/<think>([\s\S]*?)<\/think>/i);
  if (thinkMatch) {
    thinkContent = thinkMatch[1].trim();
    mainText = text.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
  } else if (/<think>/i.test(text)) {
    const thinkIndex = text.search(/<think>/i);
    const afterThink = text.slice(thinkIndex + 7);

    // Look for where the final response starts (markdown header, bolding, draft tag, or native script)
    const draftBoundary = afterThink.search(/(?:\n#{1,3}\s|\n\*\*|Draft:|\n[^\x00-\x7F]{3,})/i);
    if (draftBoundary !== -1 && draftBoundary > 30) {
      thinkContent = afterThink.slice(0, draftBoundary).trim();
      mainText = afterThink.slice(draftBoundary).trim();
    } else {
      thinkContent = afterThink.trim();
      mainText = text.slice(0, thinkIndex).trim();
    }
  }

  // 2. Safety Fallback: If mainText is empty but thinkContent has the drafted response
  if (!mainText.trim() && thinkContent) {
    // Look for Odia/Indian or markdown draft inside the thinking content
    const matchDraft = thinkContent.match(/(?:Draft:|\n#{1,3}\s|\n[^\x00-\x7F]{4,})([\s\S]*)/i);
    if (matchDraft && matchDraft[1] && matchDraft[1].trim().length > 20) {
      mainText = matchDraft[1].trim();
      thinkContent = thinkContent.slice(0, matchDraft.index).trim();
    }
  }

  const handleCopyThinking = (e) => {
    e.stopPropagation();
    if (!thinkContent) return;
    navigator.clipboard.writeText(thinkContent);
    setCopiedThink(true);
    setTimeout(() => setCopiedThink(false), 2000);
  };

  const parseInline = (str) => {
    const parts = str.split(/(\*\*.*?\*\*|\*.*?\*|`.*?`|\(.*?\))/g);
    return parts.map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={i} className="font-semibold text-white">
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith("*") && part.endsWith("*")) {
        return (
          <em key={i} className="text-emerald-300 italic">
            {part.slice(1, -1)}
          </em>
        );
      }
      if (part.startsWith("`") && part.endsWith("`")) {
        return (
          <code
            key={i}
            className="px-1.5 py-0.5 rounded bg-[#2a1a1e] text-red-300 font-mono text-[11px] border border-red-500/20"
          >
            {part.slice(1, -1)}
          </code>
        );
      }
      return part;
    });
  };

  // Helper functions for markdown table detection
  const isTableRow = (str) => {
    const t = str.trim();
    if (!t.includes("|")) return false;
    const cells = t.replace(/^\||\|$/g, "").split("|");
    return cells.length >= 2;
  };

  const isTableDivider = (str) => {
    const t = str.trim();
    if (!t.includes("|") || !t.includes("-")) return false;
    const cells = t.replace(/^\||\|$/g, "").split("|");
    return cells.length >= 2 && cells.every((c) => /^:?-{2,}:?$/.test(c.trim()));
  };

  const parseTableCells = (str) => {
    return str.replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
  };

  const rawLines = mainText.split("\n");
  const elements = [];

  let i = 0;
  while (i < rawLines.length) {
    let trimmed = rawLines[i].trim();

    if (!trimmed) {
      // Collapse consecutive empty lines into a single micro-space (h-1)
      const prev = elements[elements.length - 1];
      if (!prev || (prev.props && prev.props["data-space"])) {
        i++;
        continue;
      }
      elements.push(<div key={`space-${i}`} data-space="true" className="h-1" />);
      i++;
      continue;
    }

    // 1. Table Detection (with support for interleaved blank lines)
    if (isTableRow(trimmed)) {
      let nextIdx = i + 1;
      while (nextIdx < rawLines.length && !rawLines[nextIdx].trim()) {
        nextIdx++;
      }

      if (nextIdx < rawLines.length && isTableDivider(rawLines[nextIdx])) {
        const headerRow = parseTableCells(trimmed);
        const dividerRow = parseTableCells(rawLines[nextIdx]);
        const alignments = dividerRow.map((c) => {
          if (c.startsWith(":") && c.endsWith(":")) return "text-center";
          if (c.endsWith(":")) return "text-right";
          return "text-left";
        });

        const dataRows = [];
        let rowIdx = nextIdx + 1;
        while (rowIdx < rawLines.length) {
          const nextLine = rawLines[rowIdx].trim();
          if (!nextLine) {
            let peekIdx = rowIdx + 1;
            while (peekIdx < rawLines.length && !rawLines[peekIdx].trim()) peekIdx++;
            if (peekIdx < rawLines.length && isTableRow(rawLines[peekIdx])) {
              rowIdx = peekIdx;
              continue;
            } else {
              break;
            }
          }

          if (isTableRow(nextLine)) {
            dataRows.push(parseTableCells(nextLine));
            rowIdx++;
          } else {
            break;
          }
        }

        elements.push(
          <div
            key={`table-${i}`}
            className="my-2 overflow-x-auto rounded-xl border border-[#1e3025] bg-[#0c1610] shadow-sm"
          >
            <table className="w-full border-collapse text-left">
              <thead className="bg-[#122218] border-b border-[#1e3025]">
                <tr>
                  {headerRow.map((h, hIdx) => (
                    <th
                      key={hIdx}
                      className={`px-3.5 py-2 text-xs font-semibold text-emerald-400 uppercase tracking-wider ${
                        alignments[hIdx] || "text-left"
                      }`}
                    >
                      {parseInline(h)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#17281e]">
                {dataRows.map((row, rIdx) => (
                  <tr key={rIdx} className="hover:bg-[#14231a]/60 transition-colors">
                    {row.map((cell, cIdx) => (
                      <td
                        key={cIdx}
                        className={`px-3.5 py-2 text-xs text-gray-200 leading-normal font-sans ${
                          alignments[cIdx] || "text-left"
                        }`}
                      >
                        {parseInline(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

        i = rowIdx;
        continue;
      }
    }

    // 2. Normalize orphaned bullets/numbers on their own lines (e.g. "•\ntext" or "1.\ntext")
    if (/^[-*•]$/.test(trimmed) && i + 1 < rawLines.length && rawLines[i + 1].trim()) {
      trimmed = `• ${rawLines[i + 1].trim()}`;
      i++;
    } else if (/^\d+\.$/.test(trimmed) && i + 1 < rawLines.length && rawLines[i + 1].trim()) {
      trimmed = `${trimmed} ${rawLines[i + 1].trim()}`;
      i++;
    }

    // 3. Horizontal Rule (--- or ***)
    if (/^[-*_]{3,}$/.test(trimmed)) {
      elements.push(<hr key={`hr-${i}`} className="border-t border-[#1e3025] my-2" />);
      i++;
      continue;
    }

    // 4. Headings (### or ## or #)
    if (trimmed.startsWith("### ") || trimmed.startsWith("## ") || trimmed.startsWith("# ")) {
      const cleanHeader = trimmed.replace(/^#+\s+/, "");
      elements.push(
        <h3
          key={`h-${i}`}
          className="text-sm sm:text-base font-bold text-white mt-2.5 mb-1 font-sans tracking-wide"
        >
          {parseInline(cleanHeader)}
        </h3>
      );
      i++;
      continue;
    }

    // 5. Standalone bold headers
    if (trimmed.startsWith("**") && trimmed.endsWith("**") && trimmed.length < 60) {
      elements.push(
        <h3
          key={`hbold-${i}`}
          className="text-sm sm:text-base font-bold text-white mt-2 mb-1 font-sans tracking-wide"
        >
          {trimmed.slice(2, -2)}
        </h3>
      );
      i++;
      continue;
    }

    // 6. Bullet points (- or * or •)
    if (/^[-*•]\s+/.test(trimmed)) {
      const content = trimmed.replace(/^[-*•]\s+/, "");
      elements.push(
        <div key={`bullet-${i}`} className="flex items-start gap-2.5 my-0.5 pl-0.5">
          <span className="text-emerald-500 text-sm flex-shrink-0">•</span>
          <div className="text-gray-200 text-xs sm:text-sm leading-normal flex-1 font-sans">
            {parseInline(content)}
          </div>
        </div>
      );
      i++;
      continue;
    }

    // 7. Numbered lists (1. or 2.)
    if (/^\d+\.\s+/.test(trimmed)) {
      const match = trimmed.match(/^(\d+)\.\s+(.*)/);
      if (match) {
        elements.push(
          <div key={`num-${i}`} className="flex items-start gap-2 my-0.5 pl-0.5">
            <span className="text-xs sm:text-sm font-semibold text-emerald-400 min-w-[18px]">
              {match[1]}.
            </span>
            <div className="text-gray-200 text-xs sm:text-sm leading-normal flex-1 font-sans">
              {parseInline(match[2])}
            </div>
          </div>
        );
        i++;
        continue;
      }
    }

    // 8. Standard paragraph line
    elements.push(
      <p key={`p-${i}`} className="text-xs sm:text-sm text-gray-200 leading-normal my-0.5 font-sans">
        {parseInline(trimmed)}
      </p>
    );
    i++;
  }

  return (
    <div className="space-y-1">
      {/* Sleek Collapsible Thinking Process Accordion */}
      {thinkContent && (
        <div className="mb-2 bg-[#0b140e] border border-[#1b2c20] hover:border-emerald-500/40 rounded-xl overflow-hidden shadow-sm transition-colors">
          <button
            type="button"
            onClick={() => setShowThinking(!showThinking)}
            className="w-full flex items-center justify-between px-3.5 py-2 text-xs font-medium text-gray-300 hover:text-white bg-[#0e1912] hover:bg-[#122017] transition-all cursor-pointer select-none"
          >
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-md bg-emerald-950/60 border border-emerald-500/30 flex items-center justify-center">
                <Brain className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <span className="font-semibold text-emerald-300 tracking-wide">
                Thinking Process
              </span>
              <span className="text-[10px] text-gray-400 bg-[#16271c] px-2 py-0.5 rounded-full border border-emerald-500/20 font-sans">
                {showThinking ? "Expanded" : "Click to view reasoning"}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {showThinking ? (
                <ChevronDown className="w-4 h-4 text-emerald-400 transition-transform" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-emerald-400 transition-transform" />
              )}
            </div>
          </button>

          {showThinking && (
            <div className="border-t border-[#16271c] bg-[#070e09] p-3 relative">
              <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-[#142319] text-[11px] text-gray-400">
                <span className="flex items-center gap-1.5 text-emerald-400/80">
                  <Sparkles className="w-3 h-3" />
                  Model Reasoning & Strategy
                </span>
                <button
                  type="button"
                  onClick={handleCopyThinking}
                  className="flex items-center gap-1 px-2 py-0.5 text-[11px] text-gray-400 hover:text-emerald-300 bg-[#0e1b12] hover:bg-[#15271b] rounded transition-colors"
                >
                  {copiedThink ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" /> Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" /> Copy thinking
                    </>
                  )}
                </button>
              </div>
              <div className="text-xs text-gray-300 font-mono leading-relaxed max-h-56 overflow-y-auto whitespace-pre-wrap pr-1">
                {thinkContent}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main Response Content (Odia / Native Script Markdown) */}
      <div className="space-y-0.5">{elements}</div>
    </div>
  );
}
