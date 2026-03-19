// src/app/events/[eventId]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";

export default function EventDetailPage() {
  const { eventId } = useParams();
  const router = useRouter();
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!eventId) return;
    const token = localStorage.getItem("token");
    if (!token) { router.push("/login"); return; }

    fetch(`${process.env.NEXT_PUBLIC_API_URL}/events/${eventId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => { if (!r.ok) throw new Error("Not found"); return r.json(); })
      .then((data) => setEvent(data))
      .catch(() => setError("Event not found or access denied."))
      .finally(() => setLoading(false));
  }, [eventId, router]);

  if (loading) return (
    <div className="p-10 flex items-center gap-3 text-[#1B4F72] font-bold animate-pulse">
      <span className="animate-spin text-xl">↻</span> Loading event...
    </div>
  );

  if (error) return (
    <div className="p-10">
      <p className="text-red-500 font-medium">{error}</p>
      <Link href="/" className="mt-4 inline-block text-[#1B4F72] font-bold hover:underline">← Back to Dashboard</Link>
    </div>
  );

  const statusColor: Record<string, string> = {
    draft: "bg-yellow-100 text-yellow-700",
    published: "bg-green-100 text-green-700",
    cancelled: "bg-red-100 text-red-700",
  };

  return (
    <div className="p-10 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <Link href="/" className="text-sm text-gray-400 hover:text-[#1B4F72] font-medium">← Dashboard</Link>
          <h1 className="text-3xl font-extrabold text-[#1B4F72] mt-2">{event?.name || "Event"}</h1>
          <div className="flex items-center gap-3 mt-2">
            <span className={`text-xs font-bold px-3 py-1 rounded-full capitalize ${statusColor[event?.status] || "bg-gray-100 text-gray-600"}`}>
              {event?.status}
            </span>
            <span className="text-sm text-gray-400">{event?.event_type}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          {event?.status === "draft" && (
            <Link
              href={`/events/${eventId}/publish`}
              className="px-6 py-3 bg-[#F5A623] text-white rounded-xl font-bold hover:bg-[#d98f1b] transition shadow-md"
            >
              🚀 Publish Event
            </Link>
          )}
          {event?.status === "published" && (
            <Link
              href={`/events/${eventId}/publish`}
              className="px-6 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition shadow-md"
            >
              📋 View Published Details
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Event Info */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Event Details</h2>
          <dl className="space-y-3 text-sm">
            {[
              ["Dates", `${event?.start_date} → ${event?.end_date}`],
              ["Location", `${event?.city || "—"}, ${event?.country || ""}`],
              ["Timezone", event?.timezone],
              ["Max Attendees", event?.max_attendees ?? "Unlimited"],
              ["AI Confidence", event?.ai_confidence ? `${Math.round(event.ai_confidence * 100)}%` : "—"],
            ].map(([label, value]) => (
              <div key={label as string} className="flex justify-between gap-4">
                <dt className="text-gray-400 font-medium">{label}</dt>
                <dd className="text-gray-800 font-semibold text-right">{value as string}</dd>
              </div>
            ))}
          </dl>
        </div>

        {/* Tickets */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">
            Tickets ({event?.tickets?.length ?? 0})
          </h2>
          {event?.tickets?.length === 0 ? (
            <p className="text-gray-400 text-sm">No tickets found.</p>
          ) : (
            <div className="space-y-3">
              {event?.tickets?.map((t: any) => (
                <div key={t.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <div>
                    <p className="font-bold text-gray-800 text-sm">{t.name}</p>
                    <p className="text-xs text-gray-400 capitalize">{t.user_type}</p>
                  </div>
                  <p className="font-bold text-[#1B4F72]">
                    {t.price === 0 ? "FREE" : `₹${t.price}`}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Registration Form */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Registration Form</h2>
          {event?.registration_forms?.[0] ? (
            <div className="space-y-2">
              {event.registration_forms[0].schema?.pages?.[0]?.fields?.map((f: any) => (
                <div key={f.field_id} className="flex items-center gap-2 text-sm p-2 bg-gray-50 rounded-lg">
                  <span>{f.ai_generated ? "✨" : "•"}</span>
                  <span className="font-medium text-gray-700">{f.label}</span>
                  <span className="ml-auto text-xs bg-gray-200 px-2 py-0.5 rounded capitalize text-gray-500">{f.type}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-sm">No form configured.</p>
          )}
        </div>

        {/* Email Template */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Confirmation Email</h2>
          {event?.email_templates?.[0] ? (
            <>
              <p className="text-xs text-gray-400 mb-1 font-medium">Subject</p>
              <p className="text-sm font-semibold text-gray-800 mb-4 bg-gray-50 p-2 rounded">
                {event.email_templates[0].subject}
              </p>
              <p className="text-xs text-gray-400 mb-1 font-medium">Preview</p>
              <div
                className="text-xs text-gray-600 bg-gray-50 p-3 rounded border border-gray-100 max-h-32 overflow-y-auto"
                dangerouslySetInnerHTML={{ __html: event.email_templates[0].body_html }}
              />
            </>
          ) : (
            <p className="text-gray-400 text-sm">No email template configured.</p>
          )}
        </div>
      </div>
    </div>
  );
}
