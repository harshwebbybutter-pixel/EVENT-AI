"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({ full_name: "", email: "", password: "", org_name: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.signup(form);
      router.push("/");   // → organizer dashboard
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl p-10">
        <h1 className="text-3xl font-extrabold text-[#1B4F72] mb-1">Create your account</h1>
        <p className="text-gray-500 mb-8 text-sm">Start creating AI-powered events in minutes.</p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Your Name</label>
            <input
              name="full_name" required value={form.full_name} onChange={handleChange}
              placeholder="Ravi Sharma"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4F72]"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Organisation / Brand Name</label>
            <input
              name="org_name" required value={form.org_name} onChange={handleChange}
              placeholder="TechFest Surat"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4F72]"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Email</label>
            <input
              name="email" type="email" required value={form.email} onChange={handleChange}
              placeholder="ravi@techfest.in"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4F72]"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Password</label>
            <input
              name="password" type="password" required value={form.password} onChange={handleChange}
              placeholder="Min 8 characters"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4F72]"
            />
          </div>

          {error && <p className="text-red-500 text-sm font-medium">{error}</p>}

          <button
            type="submit" disabled={loading}
            className="w-full py-3 bg-[#1B4F72] text-white rounded-xl font-bold text-sm hover:bg-[#163d59] transition disabled:opacity-50"
          >
            {loading ? "Creating account..." : "Create Account & Start Free"}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          Already have an account?{" "}
          <Link href="/login" className="text-[#1B4F72] font-bold hover:underline">Log in</Link>
        </p>
      </div>
    </div>
  );
}
