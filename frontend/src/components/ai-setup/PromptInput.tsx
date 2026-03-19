// src/components/ai-setup/PromptInput.tsx
"use client";

import { useState } from "react";

interface PromptInputProps {
  onGenerate: (prompt: string) => void;
  isLoading: boolean;
}

export function PromptInput({ onGenerate, isLoading }: PromptInputProps) {
  const [prompt, setPrompt] = useState("");

  const examplePrompts = [
    "2-day jewelry exhibition in Ahmedabad, expecting 5000 visitors and 200 exhibitors",
    "Annual medical conference in Mumbai, 3 days, 1500 delegates with early bird pricing",
    "One-day corporate workshop on AI, 100 participants, free entry",
  ];

  return (
    <div className="space-y-4 w-full max-w-3xl mx-auto mt-10">
      <div className="relative">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe your event... e.g., '3-day medical conference in Ahmedabad, December 15-17, expecting 2000 doctors'"
          rows={4}
          className="w-full p-4 border rounded-lg text-lg resize-none focus:ring-2 focus:ring-[#F5A623] focus:outline-none"
        />
        {/* Sparkle Icon [cite: 1295-1296] */}
        <span className="absolute top-3 right-3 text-[#F5A623] text-xl">✨</span> 
      </div>
      
      <div className="flex items-center gap-3">
        <button
          onClick={() => onGenerate(prompt)}
          disabled={!prompt.trim() || isLoading}
          className="px-6 py-3 bg-[#1B4F72] text-white rounded-lg font-semibold hover:bg-[#163d59] disabled:opacity-50 flex items-center gap-2 transition-colors"
        >
          {isLoading ? (
            <>
              <span className="animate-spin border-2 border-white border-t-transparent rounded-full w-5 h-5"></span>
              EVA is thinking...
            </>
          ) : (
            <>Generate with EVA ✨</>
          )}
        </button>
      </div>

      {/* Example prompts for quick start [cite: 1063-1076] */}
      <div className="text-sm text-gray-500 mt-6">
        <p className="mb-2 font-medium">Try an example:</p>
        <div className="flex flex-wrap gap-2">
          {examplePrompts.map((example, i) => (
            <button
              key={i}
              onClick={() => setPrompt(example)}
              className="px-3 py-2 bg-gray-100 rounded-full hover:bg-gray-200 text-xs transition-colors text-left"
            >
              {example.substring(0, 60)}...
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}