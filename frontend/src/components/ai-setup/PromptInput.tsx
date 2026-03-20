// src/components/ai-setup/PromptInput.tsx
"use client";

import { useState, useRef, useEffect } from "react";

interface PromptInputProps {
  onGenerate: (prompt: string) => void;
  isLoading: boolean;
}

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export function PromptInput({ onGenerate, isLoading }: PromptInputProps) {
  const [prompt, setPrompt] = useState("");
  const [isExtracting, setIsExtracting] = useState(false);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);

  const [isListening, setIsListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [interimText, setInterimText] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const promptRef = useRef("");

  useEffect(() => { promptRef.current = prompt; }, [prompt]);

  useEffect(() => {
    const supported = !!(window.SpeechRecognition || window.webkitSpeechRecognition);
    setVoiceSupported(supported);
  }, []);

  const startListening = () => {
    setVoiceError(null);
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setVoiceError("Voice input is only supported in Chrome or Edge.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = "en-IN";
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onstart = () => { setIsListening(true); setInterimText(""); };

    recognition.onresult = (event: any) => {
      let interimTranscript = "";
      let finalTranscript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalTranscript += transcript + " ";
        else interimTranscript += transcript;
      }
      if (finalTranscript) {
        const updated = promptRef.current
          ? promptRef.current + " " + finalTranscript.trim()
          : finalTranscript.trim();
        setPrompt(updated);
        promptRef.current = updated;
      }
      setInterimText(interimTranscript);
    };

    recognition.onerror = (event: any) => {
      if (event.error === "not-allowed") setVoiceError("Microphone access denied.");
      else if (event.error === "no-speech") setVoiceError("No speech detected. Try again.");
      else setVoiceError(`Voice error: ${event.error}`);
      setIsListening(false);
      setInterimText("");
    };

    recognition.onend = () => { setIsListening(false); setInterimText(""); };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    setIsListening(false);
    setInterimText("");
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsExtracting(true);
    setOcrError(null);
    setUploadedFile(file.name);

    const token = localStorage.getItem("token");
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("http://localhost:8000/api/v1/ocr", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "OCR extraction failed");
      const extracted = data.extracted_text?.trim();
      if (extracted) {
        setPrompt((prev) =>
          prev ? `${prev}\n\n--- Extracted from ${file.name} ---\n${extracted}` : extracted
        );
      }
    } catch (err: any) {
      setOcrError(err.message || "Failed to extract text from file");
      setUploadedFile(null);
    } finally {
      setIsExtracting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const examplePrompts = [
    "2-day jewelry exhibition in Ahmedabad, expecting 5000 visitors and 200 exhibitors",
    "Annual medical conference in Mumbai, 3 days, 1500 delegates with early bird pricing",
    "One-day corporate workshop on AI, 100 participants, free entry",
  ];

  const displayValue = isListening && interimText
    ? prompt + (prompt ? " " : "") + interimText
    : prompt;

  return (
    <div className="space-y-4 w-full max-w-3xl mx-auto mt-10">

      {/* Textarea with + and mic buttons inside */}
      <div className="relative">
        <textarea
          value={displayValue}
          onChange={(e) => { if (!isListening) setPrompt(e.target.value); }}
          placeholder={
            isListening
              ? "🎙️ Listening... speak now"
              : "Describe your event... upload a file (+) or use the mic 🎙️"
          }
          rows={5}
          className={`w-full p-4 pb-14 border rounded-lg text-lg resize-none focus:ring-2 focus:outline-none transition-colors
            ${isListening
              ? "border-red-400 focus:ring-red-300 bg-red-50"
              : "border-gray-300 focus:ring-[#F5A623]"
            }`}
        />

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.webp"
          className="hidden"
          onChange={handleFileUpload}
          disabled={isExtracting}
        />

        {/* Bottom-left: + upload button */}
        <button
          type="button"
          onClick={() => !isExtracting && fileInputRef.current?.click()}
          title="Upload PDF or Image"
          disabled={isExtracting}
          className={`absolute bottom-3 left-3 w-10 h-10 rounded-full flex items-center justify-center font-bold text-xl transition-all shadow
            ${isExtracting
              ? "bg-yellow-400 cursor-wait animate-pulse"
              : "bg-gray-200 hover:bg-[#F5A623] hover:text-white text-gray-600"
            }`}
        >
          {isExtracting ? (
            <span className="animate-spin border-2 border-white border-t-transparent rounded-full w-4 h-4 inline-block"></span>
          ) : (
            "+"
          )}
        </button>

        {/* Bottom-right: mic button */}
        {voiceSupported && (
          <button
            type="button"
            onClick={() => isListening ? stopListening() : startListening()}
            title={isListening ? "Stop listening" : "Start voice input"}
            className={`absolute bottom-3 right-3 w-10 h-10 rounded-full flex items-center justify-center transition-all shadow
              ${isListening
                ? "bg-red-500 hover:bg-red-600 animate-pulse"
                : "bg-[#1B4F72] hover:bg-[#163d59]"
              }`}
          >
            <span className="text-white text-lg">{isListening ? "⏹" : "🎙️"}</span>
          </button>
        )}
      </div>

      {/* Upload status */}
      {uploadedFile && !isExtracting && (
        <p className="text-xs text-green-600 font-medium">✅ Extracted from: {uploadedFile}</p>
      )}

      {/* Errors */}
      {ocrError && (
        <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded px-3 py-2">⚠️ {ocrError}</p>
      )}

      {/* Listening status */}
      {isListening && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
          <span className="animate-pulse">🔴</span>
          <span>Listening... Click ⏹ to stop, then Generate.</span>
          {interimText && (
            <span className="text-gray-400 italic ml-2 truncate">"{interimText}"</span>
          )}
        </div>
      )}

      {voiceError && (
        <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded px-3 py-2">⚠️ {voiceError}</p>
      )}

      {/* Buttons */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => onGenerate(prompt)}
          disabled={!prompt.trim() || isLoading || isExtracting}
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

        {prompt && (
          <button
            onClick={() => { setPrompt(""); setUploadedFile(null); setOcrError(null); setVoiceError(null); stopListening(); }}
            className="text-sm text-gray-400 hover:text-gray-600 underline"
          >
            Clear
          </button>
        )}
      </div>

      {/* Example Prompts */}
      <div className="text-sm text-gray-500 mt-4">
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
