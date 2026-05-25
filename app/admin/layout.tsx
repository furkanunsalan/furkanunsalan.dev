import type { Metadata } from "next";
import { cookies } from "next/headers";
import { getIronSession } from "iron-session";
import { sessionOptions, type AdminSession } from "@/lib/auth";
import AdminNav from "@/components/AdminNav";
import LogoutButton from "@/components/LogoutButton";
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
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-12 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold tracking-tight">
              furkanunsalan.dev
            </span>
            <span className="text-[10px] uppercase tracking-widest text-light-fourth">
              admin
            </span>
          </div>
          <LogoutButton />
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 grid grid-cols-1 md:grid-cols-[200px_1fr] gap-6">
        <aside className="md:sticky md:top-16 md:self-start">
          <AdminNav />
        </aside>
        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}
