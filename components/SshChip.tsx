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
    <div
      className={`inline-flex items-center gap-2 font-mono text-xs text-light-secondary ${className}`}
    >
      <code className="whitespace-nowrap">
        <span className="text-accent-primary/80">$</span> {CMD}
      </code>
      <button
        type="button"
        onClick={copy}
        aria-label="Copy SSH command"
        title="This site has an SSH twin — click to copy"
        className="shrink-0 text-light-fourth transition-colors duration-200 hover:text-accent-primary"
      >
        {copied ? (
          <Check className="h-3.5 w-3.5 text-emerald-400" />
        ) : (
          <Copy className="h-3.5 w-3.5" />
        )}
      </button>
    </div>
  );
}
