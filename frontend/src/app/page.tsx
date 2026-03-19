"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

export default function DashboardHome() {
  const router = useRouter();
  const [user, setUser] = useState<{ full_name: string; email: string } | null>(null);
  const [activeOrg, setActiveOrg] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const orgId = localStorage.getItem("org_id");
    const userData = localStorage.getItem("user");
    if (token && userData) {
      setUser(JSON.parse(userData));
      setActiveOrg(orgId);
    }
  }, []);

  const handleLogout = () => {
    api.logout();
    setUser(null);
    setActiveOrg(null);
    router.push("/login");
  };

  return (
    <div className="p-10 max-w-5xl mx-auto">
      <header className="mb-10 flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-extrabold text-[#1B4F72] mb-2">Organizer Dashboard</h1>
          <p className="text-gray-500 font-medium">
            {user ? `✅ Logged in as ${user.full_name}` : "🔐 Authentication Required"}
          </p>
        </div>
        {user && (
          <button onClick={handleLogout} className="text-sm font-bold text-red-600 hover:bg-red-50 px-4 py-2 rounded-lg border border-red-100 transition-colors">
            Logout
          </button>
        )}
      </header>

      {!user ? (
        <div className="bg-white border-2 border-gray-100 rounded-3xl p-12 text-center shadow-sm">
          <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6 text-3xl">🔐</div>
          <h2 className="text-3xl font-bold text-[#1B4F72] mb-4">Get Started</h2>
          <p className="text-gray-500 mb-8 max-w-sm mx-auto">
            Create an account to start building AI-powered events — or log in if you already have one.
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/signup" className="px-8 py-4 bg-[#1B4F72] text-white rounded-2xl font-bold text-lg hover:shadow-xl hover:-translate-y-1 transition-all">
              Sign Up Free
            </Link>
            <Link href="/login" className="px-8 py-4 bg-white border-2 border-[#1B4F72] text-[#1B4F72] rounded-2xl font-bold text-lg hover:shadow-xl hover:-translate-y-1 transition-all">
              Log In
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex items-center justify-between">
            <span className="text-blue-800 text-sm font-bold uppercase tracking-wider">Your Tenant ID</span>
            <code className="bg-white px-3 py-1 rounded text-xs text-blue-600 border border-blue-200">{activeOrg}</code>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white p-8 rounded-3xl shadow-lg border border-gray-100 hover:border-[#F5A623] transition-all group">
              <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">✨</div>
              <h2 className="text-2xl font-bold text-[#1B4F72] mb-3">AI Event Designer</h2>
              <p className="text-gray-600 mb-8">Draft tickets, forms, and emails instantly using EVA.</p>
              <Link href="/events/new" className="block w-full text-center px-6 py-4 bg-[#1B4F72] text-white rounded-xl font-bold hover:bg-[#163d59] shadow-lg">
                Launch Wizard
              </Link>
            </div>

            <div className="bg-gray-50 p-8 rounded-3xl border border-dashed border-gray-300 flex flex-col justify-center items-center text-center opacity-60">
              <p className="text-gray-400 font-bold uppercase text-xs tracking-widest mb-2">Coming Soon</p>
              <p className="text-gray-500 font-medium">Real-time Registration Stats</p>
            </div>
          </div>
        </div>
      )}

      <footer className="mt-20 pt-8 border-t border-gray-100 flex justify-between items-center text-gray-400 text-[10px] font-bold uppercase tracking-[0.2em]">
        <span>Evenuefy v2.0.0</span>
        <span>RLS Multi-Tenancy Active</span>
      </footer>
    </div>
  );
}
