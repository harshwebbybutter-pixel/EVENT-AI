// src/lib/api.ts
// Reads from .env.local in dev, and from your deployment env vars in production
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export const api = {

  // ── Auth ────────────────────────────────────────────────────────────────────

  async signup(data: { full_name: string; email: string; password: string; org_name: string }) {
    const res = await fetch(`${BASE_URL}/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || "Signup failed");
    }
    const json = await res.json();
    localStorage.setItem("token", json.access_token);
    localStorage.setItem("org_id", json.org_id);
    localStorage.setItem("user", JSON.stringify(json.user));
    return json;
  },

  async login(email: string, password: string) {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || "Login failed");
    }
    const json = await res.json();
    localStorage.setItem("token", json.access_token);
    localStorage.setItem("org_id", json.org_id);
    localStorage.setItem("user", JSON.stringify(json.user));
    return json;
  },

  logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("org_id");
    localStorage.removeItem("user");
  },

  async devLogin(email: string) {
    const res = await fetch(`${BASE_URL}/auth/developer-login?email=${email}`, { method: "POST" });
    if (!res.ok) throw new Error("Login failed");
    const json = await res.json();
    localStorage.setItem("token", json.access_token);
    localStorage.setItem("org_id", json.org_id);
    localStorage.setItem("user", JSON.stringify(json.user));
    return json;
  },

  // ── Organizer (protected) ───────────────────────────────────────────────────

  async generateEventSetup(prompt: string) {
    const token = localStorage.getItem("token");
    const orgId = localStorage.getItem("org_id");
    const res = await fetch(`${BASE_URL}/ai-setup`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
      body: JSON.stringify({ prompt, org_id: orgId }),
    });
    if (!res.ok) throw new Error("AI setup failed");
    return res.json();
  },

  async saveEvent(setupData: any) {
    const token = localStorage.getItem("token");
    const res = await fetch(`${BASE_URL}/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
      body: JSON.stringify(setupData),
    });
    if (!res.ok) throw new Error("Save event failed");
    return res.json();
  },

  async publishEvent(eventId: string) {
    const token = localStorage.getItem("token");
    const res = await fetch(`${BASE_URL}/events/${eventId}/publish`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Publish failed");
    return res.json();
  },

  // ── Public (no auth) ────────────────────────────────────────────────────────

  async getPublicEvent(shortCode: string) {
    const res = await fetch(`${BASE_URL}/public/events/${shortCode}`);
    if (!res.ok) throw new Error("Event not found");
    return res.json();
  },

  async registerAttendee(data: {
    event_id: string;
    ticket_id: string;
    full_name: string;
    email: string;
    answers: Record<string, any>;
  }) {
    const res = await fetch(`${BASE_URL}/public/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Registration failed");
    return res.json();
  },
};
