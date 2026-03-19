// src/app/events/new/page.tsx
"use client";

import { useState } from "react";
import { PromptInput } from "@/components/ai-setup/PromptInput";
import { EventPreview } from "@/components/ai-setup/EventPreview";
import { TicketPreview } from "@/components/ai-setup/TicketPreview";
import { FormPreview } from "@/components/ai-setup/FormPreview";
import { EmailPreview } from "@/components/ai-setup/EmailPreview";
import { PublishButton } from "@/components/ai-setup/PublishButton"; // New Component
import { QRDisplay } from "@/components/ai-setup/QRDisplay";       // New Component
import { api } from "@/lib/api";
import { AISetupResponse } from "@/lib/types";

export default function AIEventsWizard() {
  const [isLoading, setIsLoading] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiData, setAiData] = useState<AISetupResponse['data'] | null>(null);
  const [publishedLink, setPublishedLink] = useState<any | null>(null);

  const handleGenerate = async (prompt: string) => {
    setIsLoading(true); setError(null);
    try {
      const response = await api.generateEventSetup(prompt);
      setAiData(response.data);
    } catch (err: any) {
      setError(err.message || "FastAPI connection failed.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveAndPublish = async () => {
    if (!aiData) return;
    setIsPublishing(true); setError(null);
    try {
      const saveRes = await api.saveEvent(aiData);
      const pubRes = await api.publishEvent(saveRes.event_id);
      setPublishedLink(pubRes.registration_link);
    } catch (err: any) {
      setError(err.message || "Failed to publish.");
    } finally {
      setIsPublishing(false);
    }
  };

  if (publishedLink) return <div className="p-10"><QRDisplay link={publishedLink} onReset={() => {setAiData(null); setPublishedLink(null);}} /></div>;

  return (
    <div className="p-10 max-w-6xl mx-auto">
      {!aiData ? (
        <>
          <h1 className="text-3xl font-bold text-[#1B4F72] mb-6">✨ Setup Event with EVA</h1>
          <PromptInput onGenerate={handleGenerate} isLoading={isLoading} />
        </>
      ) : (
        <div className="space-y-8">
          <header className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-[#1B4F72]">Review AI Draft</h2>
            <button onClick={() => setAiData(null)} className="text-sm text-gray-500 hover:underline">Discard Draft</button>
          </header>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <EventPreview event={aiData.event} onUpdate={(e) => setAiData({...aiData, event: e})} />
            <TicketPreview tickets={aiData.tickets} onUpdate={(t) => setAiData({...aiData, tickets: t})} />
            <FormPreview form={aiData.form} />
            <EmailPreview email={aiData.confirmation_email} onUpdate={(em) => setAiData({...aiData, confirmation_email: em})} />
          </div>

          <PublishButton onClick={handleSaveAndPublish} isPublishing={isPublishing} />
        </div>
      )}
      {error && <p className="mt-4 text-red-500 font-medium">⚠️ {error}</p>}
    </div>
  );
}