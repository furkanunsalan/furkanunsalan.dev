"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

const CMD = "ssh -p 2222 furkanunsalan.dev";

export default function SshChip({ className = "" }: { className?: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(CMD);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard blocked — nothing to do
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      data-umami-event="SSH twin copy"
      title="This site has an SSH twin — click to copy"
      className={`group inline-flex items-center gap-2 rounded-lg border border-white/[0.08] bg-zinc-950 px-3 py-1.5 font-mono text-xs text-light-secondary transition-all duration-200 hover:border-accent-primary/50 hover:text-accent-primary ${className}`}
    >
      <span className="text-accent-primary/80 group-hover:text-accent-primary">
        $
      </span>
      <span className="truncate">{CMD}</span>
      {copied ? (
        <Check className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
      ) : (
        <Copy className="h-3.5 w-3.5 shrink-0 opacity-50 group-hover:opacity-100" />
      )}
    </button>
  );
}
