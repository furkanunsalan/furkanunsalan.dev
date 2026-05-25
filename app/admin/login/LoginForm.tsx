"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { KeyRound, LoaderCircle } from "lucide-react";

export default function LoginForm({ next }: { next?: string }) {
  const router = useRouter();
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
      router.replace(next && next.startsWith("/admin") ? next : "/admin");
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
      setPending(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-2xl ring-1 ring-white/[0.06] bg-zinc-950 p-5 space-y-3"
    >
      <label className="block text-xs text-light-fourth">Password</label>
      <div className="relative">
        <KeyRound className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-light-fourth" />
        <input
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoFocus
          required
          className="w-full bg-black ring-1 ring-white/[0.08] focus:ring-accent-primary/60 outline-none rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder:text-light-fourth"
          placeholder="••••••••"
        />
      </div>
      {error && (
        <p className="text-xs text-rose-400" role="alert">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="w-full inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium bg-accent-primary/15 text-accent-primary ring-1 ring-accent-primary/40 hover:bg-accent-primary/25 disabled:opacity-50 transition-colors"
      >
        {pending && <LoaderCircle className="w-4 h-4 animate-spin" />}
        Sign in
      </button>
    </form>
  );
}
