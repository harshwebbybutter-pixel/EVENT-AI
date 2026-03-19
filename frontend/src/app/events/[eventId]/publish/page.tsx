// src/app/events/[eventId]/publish/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { QRDisplay } from "@/components/ai-setup/QRDisplay";
import { api } from "@/lib/api";

export default function PublishPage() {
  const { eventId } = useParams();
  const router = useRouter();

  const [status, setStatus] = useState<"idle" | "publishing" | "done" | "error">("idle");
  const [link, setLink] = useState<any>(null);
  const [error, setError] = useState("");
  const [eventName, setEventName] = useState("");

  // Fetch event name for display
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { router.push("/login"); return; }
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/events/${eventId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => {
        setEventName(d.name || "");
        // If already published, show the existing link directly
        if (d.status === "published" && d.registration_links?.[0]) {
          setLink(d.registration_links[0]);
          setStatus("done");
        }
      })
      .catch(() => {});
  }, [eventId, router]);

  const handlePublish = async () => {
    setStatus("publishing");
    setError("");
    try {
      const res = await api.publishEvent(eventId as string);
      setLink(res.registration_link);
      setStatus("done");
    } catch (err: any) {
      setError(err.message || "Publish failed.");
      setStatus("error");
    }
  };

  if (status === "done" && link) {
    return (
      <div className="p-10 max-w-3xl mx-auto">
        <Link href={`/events/${eventId}`} className="text-sm text-gray-400 hover:text-[#1B4F72] font-medium mb-6 inline-block">
          ← Back to Event
        </Link>
        <QRDisplay link={link} onReset={() => router.push("/events/new")} />
      </div>
    );
  }

  return (
    <div className="p-10 max-w-2xl mx-auto">
      <Link href={`/events/${eventId}`} className="text-sm text-gray-400 hover:text-[#1B4F72] font-medium">
        ← Back to Event
      </Link>

      <div className="mt-8 bg-white rounded-3xl border border-gray-100 shadow-sm p-10 text-center">
        <div className="text-5xl mb-4">🚀</div>
        <h1 className="text-3xl font-extrabold text-[#1B4F72] mb-2">Ready to Publish?</h1>
        {eventName && (
          <p className="text-gray-500 mb-2">
            You're about to publish <strong className="text-gray-800">{eventName}</strong>.
          </p>
        )}
        <p className="text-gray-400 text-sm mb-8">
          This will make the event live and generate a public registration link and QR code.
          Attendees will be able to register immediately.
        </p>

        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-xl text-sm font-medium border border-red-200">
            {error}
          </div>
        )}

        <div className="flex gap-4 justify-center">
          <Link
            href={`/events/${eventId}`}
            className="px-8 py-3 border-2 border-gray-200 text-gray-600 rounded-xl font-bold hover:border-gray-300 transition"
          >
            Cancel
          </Link>
          <button
            onClick={handlePublish}
            disabled={status === "publishing"}
            className="px-10 py-3 bg-[#F5A623] text-white rounded-xl font-bold text-lg hover:bg-[#d98f1b] shadow-lg disabled:opacity-50 transition flex items-center gap-2"
          >
            {status === "publishing" ? (
              <><span className="animate-spin">↻</span> Publishing...</>
            ) : (
              "Confirm & Publish 🚀"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
