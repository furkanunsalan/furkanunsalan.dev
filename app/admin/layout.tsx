import type { Metadata } from "next";
import { cookies } from "next/headers";
import { getIronSession } from "iron-session";
import Link from "next/link";
import { Home } from "lucide-react";
import { sessionOptions, type AdminSession } from "@/lib/auth";
import AdminNav from "@/components/AdminNav";
import AdminMobileNav from "@/components/AdminMobileNav";
import LogoutButton from "@/components/LogoutButton";
import ViewLink from "@/components/admin/ViewLink";
import CommandPalette from "@/components/CommandPalette";
import "@/app/globals.css";

export const metadata: Metadata = {
  title: "Admin · furkanunsalan.dev",
  robots: { index: false, follow: false },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getIronSession<AdminSession>(cookies(), sessionOptions);

  // Login page: render bare children — no nav, no chrome.
  if (!session.isAuthed) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="sticky top-0 z-20 border-b border-white/[0.06] bg-black/80 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-12 flex items-center justify-center md:justify-between gap-2">
          <span className="hidden md:inline text-sm font-semibold tracking-tight">
            furkanunsalan.dev
          </span>
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.03] px-2.5 py-1 text-xs text-light-secondary hover:text-white hover:bg-white/[0.08] hover:border-white/20 transition-colors whitespace-nowrap"
            >
              <Home className="w-3.5 h-3.5" />
              <span>Home</span>
            </Link>
            <ViewLink />
            <LogoutButton />
            <AdminMobileNav />
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 md:grid md:grid-cols-[200px_1fr] md:gap-6">
        <aside className="hidden md:block md:sticky md:top-16 md:self-start">
          <AdminNav />
        </aside>
        <main className="min-w-0">{children}</main>
      </div>
      <CommandPalette />
    </div>
  );
}
