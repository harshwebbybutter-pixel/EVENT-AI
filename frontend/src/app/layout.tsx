// src/app/layout.tsx
"use client";

import { Inter } from "next/font/google";
import "@/styles/globals.css";
import { Sidebar } from "@/components/layout/Sidebar";
import { usePathname } from "next/navigation";

const inter = Inter({ subsets: ["latin"] });

// Pages where sidebar should NOT appear
const PUBLIC_PATHS = ["/login", "/signup", "/r/"];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPublicPage = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  return (
    <html lang="en">
      <head>
        <title>Evenuefy - AI Event Setup</title>
        <meta name="description" content="AI-powered event registration platform" />
      </head>
      <body className={`${inter.className} bg-gray-50`}>
        {isPublicPage ? (
          <div className="min-h-screen">{children}</div>
        ) : (
          <div className="flex min-h-screen">
            <Sidebar />
            <div className="flex-1 overflow-y-auto h-screen">{children}</div>
          </div>
        )}
      </body>
    </html>
  );
}
