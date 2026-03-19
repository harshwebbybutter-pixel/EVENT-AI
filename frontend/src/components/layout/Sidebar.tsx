// src/components/layout/Sidebar.tsx
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<{ full_name: string; email: string } | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) setUser(JSON.parse(stored));
  }, []);

  const handleLogout = () => {
    api.logout();
    router.push("/login");
  };

  const isActive = (path: string) => pathname === path;
  const initials = user?.full_name
    ? user.full_name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  return (
    <div className="w-64 bg-[#1B4F72] text-white min-h-screen p-6 flex flex-col shadow-xl z-10 shrink-0">
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2 mb-12 hover:opacity-80 transition-opacity">
        <span className="text-3xl">🎯</span>
        <div className="text-2xl font-extrabold text-[#F5A623] tracking-tight">evenuefy</div>
      </Link>

      {/* Navigation */}
      <nav className="flex-1 space-y-3">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 ml-2">Main Menu</p>

        <Link
          href="/"
          className={`block py-3 px-4 rounded-lg transition-colors font-medium ${
            isActive("/") ? "bg-[#163d59] text-white" : "text-gray-300 hover:bg-[#163d59] hover:text-white"
          }`}
        >
          📊 Dashboard
        </Link>

        <Link
          href="/events/new"
          className={`block py-3 px-4 rounded-lg font-bold transition-all shadow-sm ${
            isActive("/events/new")
              ? "bg-[#F5A623] text-[#1B4F72]"
              : "bg-[#1e587f] text-white hover:bg-[#F5A623] hover:text-[#1B4F72]"
          }`}
        >
          ✨ AI Event Setup
        </Link>

        <Link
          href="#"
          className="block py-3 px-4 rounded-lg text-gray-400 cursor-not-allowed opacity-60"
        >
          🎟️ My Events <span className="text-xs">(Soon)</span>
        </Link>

        <div className="pt-6">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 ml-2">Settings</p>
          <Link
            href="#"
            className="block py-3 px-4 rounded-lg text-gray-300 hover:bg-[#163d59] hover:text-white transition-colors"
          >
            ⚙️ Organisation
          </Link>
        </div>
      </nav>

      {/* User footer */}
      <div className="mt-auto pt-6 border-t border-[#163d59]">
        <div className="flex items-center gap-3 px-2 mb-4">
          <div className="w-9 h-9 rounded-full bg-[#F5A623] flex items-center justify-center text-[#1B4F72] font-bold text-sm shrink-0">
            {initials}
          </div>
          <div className="overflow-hidden">
            <p className="font-semibold text-gray-200 text-sm truncate">{user?.full_name || "Guest"}</p>
            <p className="text-xs text-gray-500 truncate">{user?.email || ""}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full text-left px-4 py-2 text-xs text-red-400 hover:text-red-300 hover:bg-[#163d59] rounded-lg transition-colors font-bold"
        >
          → Logout
        </button>
      </div>
    </div>
  );
}
