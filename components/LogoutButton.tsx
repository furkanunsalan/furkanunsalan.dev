"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LogOut } from "lucide-react";

export default function LogoutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function onClick() {
    if (pending) return;
    setPending(true);
    await fetch("/api/admin/logout", { method: "POST" });
    router.replace("/admin/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className="inline-flex items-center gap-1.5 rounded-md border border-rose-500/30 bg-rose-500/[0.06] px-2.5 py-1 text-xs text-rose-400 hover:bg-rose-500/[0.12] hover:border-rose-500/50 disabled:opacity-50 transition-colors whitespace-nowrap"
    >
      <LogOut className="w-3.5 h-3.5" />
      Sign out
    </button>
  );
}
