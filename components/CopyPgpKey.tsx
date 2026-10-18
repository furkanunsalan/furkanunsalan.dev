"use client";

import { useEffect, useRef, useState } from "react";
import { Check, KeyRound } from "lucide-react";

// Long enough to be noticed, short enough not to read as a permanent state.
const COPIED_MS = 1200;

// The header used to print the key id as a link that only downloaded the key.
// Copying straight to the clipboard is the action people actually want, so the
// key itself never has to be rendered anywhere.
export default function CopyPgpKey() {
  const [copied, setCopied] = useState(false);
  const key = useRef<string | null>(null);
  const timer = useRef<number>();

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const copy = async () => {
    try {
      // Cached after the first click: the key is public and a few KB, and a
      // second fetch would only add latency to the clipboard write.
      if (key.current === null) {
        const res = await fetch("/pgp.asc");
        if (!res.ok) return;
        key.current = await res.text();
      }
      await navigator.clipboard.writeText(key.current);
      setCopied(true);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setCopied(false), COPIED_MS);
    } catch {
      // Clipboard access can be denied (insecure context, permissions) and the
      // fetch can fail. Leave the icon as it was rather than claim a copy that
      // never landed — there is no visible key text to fall back to.
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      aria-label="Copy PGP public key"
      title="Copy PGP public key"
      className="text-white/40 hover:text-accent-primary hover:-translate-y-0.5 transition-all duration-200"
    >
      {copied ? (
        <Check className="w-4 h-4" />
      ) : (
        <KeyRound className="w-4 h-4" />
      )}
    </button>
  );
}
