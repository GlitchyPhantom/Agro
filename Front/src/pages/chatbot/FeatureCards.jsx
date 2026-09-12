import React from "react";
import { Sparkles, Stethoscope, FlaskConical, Sprout, ShieldCheck } from "lucide-react";

export const FEATURE_CARDS = [
  {
    icon: Stethoscope,
    title: "Disease Diagnostics",
    desc: "Identify leaf spots, blights, and rust symptoms early.",
    prompt: "How do I identify and treat early blight on tomato leaves?",
  },
  {
    icon: FlaskConical,
    title: "Organic Treatments",
    desc: "Natural neem oil & bio-fungicide spray schedules.",
    prompt: "What is the correct neem oil mixture ratio for organic pest control?",
  },
  {
    icon: Sprout,
    title: "Crop Care & Soil",
    desc: "Soil pH balancing, fertilizer ratios & crop rotation.",
    prompt: "What are the best crop rotation practices for potato and corn?",
  },
  {
    icon: ShieldCheck,
    title: "Pest Prevention",
    desc: "Preventive measures against aphid & armyworm outbreaks.",
    prompt: "How to prevent fall armyworm infestations in maize crops?",
  },
];

export default function FeatureCards({ userName, onSelectPrompt }) {
  return (
    <div className="py-6 animate-fade-in">
      {/* Hero Header */}
      <div className="text-center mb-8">
        <div className="w-12 h-12 mx-auto rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/30 flex items-center justify-center mb-3 shadow-lg shadow-emerald-500/10">
          <Sparkles className="w-6 h-6 text-emerald-400" />
        </div>
        <h2 className="font-[Outfit] text-2xl font-bold text-white mb-1.5 tracking-wide">
          What can I help you farm today, {userName}?
        </h2>
        <p className="text-gray-400 text-xs max-w-md mx-auto">
          Real-time crop advisory, plant disease diagnosis, and custom organic treatment schedules.
        </p>
      </div>

      {/* Rich 2x2 Feature Suggestion Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 max-w-2xl mx-auto">
        {FEATURE_CARDS.map((card, idx) => {
          const Icon = card.icon;
          return (
            <button
              key={idx}
              onClick={() => onSelectPrompt(card.prompt)}
              className="group text-left p-3.5 rounded-2xl bg-[#0d1410] border border-[#1a2620] hover:border-emerald-500/40 hover:bg-[#121c17] transition-all shadow-lg hover:shadow-emerald-500/5 flex flex-col justify-between"
            >
              <div className="flex items-center gap-2.5 mb-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:bg-gradient-to-br group-hover:from-emerald-500 group-hover:to-teal-600 group-hover:text-white transition-all">
                  <Icon className="w-4 h-4" />
                </div>
                <span className="font-[Outfit] text-xs font-semibold text-white group-hover:text-emerald-400 transition-colors">
                  {card.title}
                </span>
              </div>
              <p className="text-[11px] text-gray-400 leading-snug">
                {card.desc}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
