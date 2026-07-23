"use client";

import { useState } from "react";
import { KeyRound, LoaderCircle } from "lucide-react";

export default function LoginIsland({ next }: { next?: string }) {
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!password || pending) return;
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error || `error ${res.status}`);
        setPending(false);
        return;
      }
      const dest = next && next.startsWith("/admin") ? next : "/admin";
      window.location.href = dest;
    } catch (err) {
      setError((err as Error).message);
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="relative">
        <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-light-fourth" />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          autoFocus
          autoComplete="current-password"
          className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] py-2 pl-9 pr-3 text-sm text-white outline-none focus:border-accent-primary/50 focus:ring-1 focus:ring-accent-primary/40"
        />
      </div>
      {error && <p className="text-xs text-rose-400">{error}</p>}
      <button
        type="submit"
        disabled={pending || !password}
        className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-accent-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-primary/85 disabled:opacity-60"
      >
        {pending && <LoaderCircle className="h-4 w-4 animate-spin" />}
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
