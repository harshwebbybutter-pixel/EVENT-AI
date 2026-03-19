"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";

export default function PublicRegistrationPage() {
  const params = useParams();
  const shortCode = params.short_code as string;

  const [step, setStep] = useState<"loading" | "ticket" | "form" | "success" | "error">("loading");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [event, setEvent] = useState<any>(null);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    answers: {} as Record<string, string>,
  });

  useEffect(() => {
    if (!shortCode) return;
    api.getPublicEvent(shortCode)
      .then((data) => { setEvent(data); setStep("ticket"); })
      .catch(() => setStep("error"));
  }, [shortCode]);

  const handleAnswerChange = (fieldId: string, value: string) => {
    setFormData((prev) => ({ ...prev, answers: { ...prev.answers, [fieldId]: value } }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage("");
    try {
      const result = await api.registerAttendee({
        event_id: event.id,
        ticket_id: selectedTicket.id,
        full_name: formData.full_name,
        email: formData.email,
        answers: formData.answers,
      });
      if (result.status === "success") setStep("success");
    } catch {
      setErrorMessage("Registration failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Render a single field based on its type ──────────────────────────────────
  const renderField = (field: any) => {
    const baseClass = "w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#1B4F72] outline-none text-sm";

    if (field.type === "textarea") return (
      <textarea
        required={field.required}
        placeholder={field.placeholder || ""}
        value={formData.answers[field.id] || ""}
        onChange={(e) => handleAnswerChange(field.id, e.target.value)}
        rows={3}
        className={baseClass + " resize-none"}
      />
    );

    if (field.type === "select" && field.options?.length > 0) return (
      <select
        required={field.required}
        value={formData.answers[field.id] || ""}
        onChange={(e) => handleAnswerChange(field.id, e.target.value)}
        className={baseClass}
      >
        <option value="">Select an option</option>
        {field.options.map((opt: string) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    );

    if (field.type === "checkbox") return (
      <label className="flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          required={field.required}
          checked={formData.answers[field.id] === "true"}
          onChange={(e) => handleAnswerChange(field.id, e.target.checked ? "true" : "false")}
          className="w-5 h-5 accent-[#1B4F72]"
        />
        <span className="text-sm text-gray-600">{field.placeholder || field.label}</span>
      </label>
    );

    // Default: text, email, tel, date, number
    return (
      <input
        type={field.type || "text"}
        required={field.required}
        placeholder={field.placeholder || ""}
        value={formData.answers[field.id] || ""}
        onChange={(e) => handleAnswerChange(field.id, e.target.value)}
        className={baseClass}
      />
    );
  };

  // ── States ───────────────────────────────────────────────────────────────────

  if (step === "loading") return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-[#1B4F72] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-[#1B4F72] font-bold">Loading Event...</p>
      </div>
    </div>
  );

  if (step === "error") return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 gap-4 p-4">
      <div className="text-6xl">😕</div>
      <h1 className="text-2xl font-bold text-gray-700">Event not found</h1>
      <p className="text-gray-500 text-center max-w-sm">
        This link may be invalid, expired, or the event is no longer open for registration.
      </p>
    </div>
  );

  if (step === "success") return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="bg-white p-10 rounded-3xl shadow-xl max-w-md w-full text-center border-t-8 border-green-500">
        <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-4xl mx-auto mb-6">✓</div>
        <h2 className="text-3xl font-extrabold text-[#1B4F72] mb-2">You're In!</h2>
        <p className="text-gray-600 mb-6">
          Your spot at <strong>{event?.name}</strong> is confirmed.
          Details will be sent to <strong>{formData.email}</strong>.
        </p>
        <div className="bg-blue-50 p-4 rounded-xl text-sm text-blue-800 font-mono">
          Ticket: {selectedTicket?.name?.toUpperCase()}
        </div>
      </div>
    </div>
  );

  // ── Main UI ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-12 px-4">
      <div className="bg-white rounded-3xl shadow-xl max-w-2xl w-full overflow-hidden border border-gray-100">

        {/* Header */}
        <div className="bg-[#1B4F72] p-8 text-white text-center">
          <p className="text-blue-300 text-xs font-bold uppercase tracking-widest mb-2">You're Invited</p>
          <h1 className="text-3xl font-extrabold mb-2">{event?.name}</h1>
          <p className="text-blue-200 text-sm">
            {event?.date ? new Date(event.date).toLocaleDateString("en-IN", { dateStyle: "long" }) : "Date TBA"}
            {event?.location ? ` • ${event.location}` : ""}
          </p>
          {event?.venue && <p className="text-blue-300 text-xs mt-1">{event.venue}</p>}
        </div>

        <div className="p-8">

          {/* STEP 1 — Ticket Selection */}
          {step === "ticket" && (
            <div>
              <h2 className="text-xl font-bold text-gray-800 mb-6">Select your ticket</h2>
              {(!event?.tickets || event.tickets.length === 0) && (
                <p className="text-gray-400 text-sm">No tickets available.</p>
              )}
              <div className="space-y-4">
                {event?.tickets?.map((ticket: any) => (
                  <label
                    key={ticket.id}
                    className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      selectedTicket?.id === ticket.id ? "border-[#1B4F72] bg-blue-50" : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <input
                        type="radio" name="ticket"
                        checked={selectedTicket?.id === ticket.id}
                        onChange={() => setSelectedTicket(ticket)}
                        className="w-5 h-5 accent-[#1B4F72]"
                      />
                      <div>
                        <p className="font-bold text-gray-800">{ticket.name}</p>
                        <p className="text-sm text-gray-500 capitalize">{ticket.type || "General"}</p>
                      </div>
                    </div>
                    <p className="font-bold text-lg text-[#1B4F72]">
                      {ticket.price === 0 ? "FREE" : `₹${ticket.price.toLocaleString("en-IN")}`}
                    </p>
                  </label>
                ))}
              </div>
              <button
                onClick={() => setStep("form")} disabled={!selectedTicket}
                className="w-full mt-8 py-4 bg-[#1B4F72] text-white rounded-xl font-bold text-lg hover:bg-[#163d59] transition disabled:opacity-40"
              >
                Continue →
              </button>
            </div>
          )}

          {/* STEP 2 — Registration Form */}
          {step === "form" && (
            <form onSubmit={handleSubmit}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-800">Your Details</h2>
                <button type="button" onClick={() => setStep("ticket")} className="text-sm text-[#1B4F72] font-bold hover:underline">
                  ← Back
                </button>
              </div>

              {errorMessage && (
                <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-xl text-sm font-medium border border-red-200">
                  {errorMessage}
                </div>
              )}

              <div className="space-y-5">
                {/* Always-present standard fields */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text" required
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    placeholder="Ravi Sharma"
                    className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#1B4F72] outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email" required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="ravi@example.com"
                    className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#1B4F72] outline-none text-sm"
                  />
                </div>

                {/* AI-generated dynamic fields from registration_forms.schema */}
                {event?.form_fields?.length > 0 && (
                  <div className="pt-4 border-t border-gray-100 space-y-5">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                      Additional Information
                    </h3>
                    {event.form_fields.map((field: any) => (
                      <div key={field.id}>
                        <label className="block text-sm font-bold text-gray-700 mb-1">
                          {field.label}
                          {field.required && <span className="text-red-500 ml-1">*</span>}
                        </label>
                        {renderField(field)}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button
                type="submit" disabled={isSubmitting}
                className="w-full mt-8 py-4 bg-[#1B4F72] text-white rounded-xl font-bold text-lg hover:bg-[#163d59] transition disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {isSubmitting ? <><span className="animate-spin">↻</span> Submitting...</> : "Complete Registration"}
              </button>
            </form>
          )}
        </div>
      </div>

      <p className="mt-8 text-xs text-gray-400 font-bold uppercase tracking-widest">Powered by Evenuefy</p>
    </div>
  );
}
