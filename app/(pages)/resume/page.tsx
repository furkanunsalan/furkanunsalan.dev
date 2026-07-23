import Link from "next/link";
import { Download } from "lucide-react";
import type { Metadata } from "next";
import PdfPages from "./PdfPages";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Resume | Furkan Ünsalan",
  description: "Furkan Ünsalan's resume — short and full versions.",
};

export default function ResumePage({
  searchParams,
}: {
  searchParams: { variant?: string };
}) {
  const variant = searchParams.variant === "short" ? "short" : "full";

  return (
    <div className="mt-24 pb-24 min-h-screen max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center justify-between gap-4 animate-fade-in-down">
        <div className="inline-flex rounded-lg border border-white/[0.08] p-0.5 text-sm">
          <ToggleLink
            active={variant === "short"}
            variant="short"
            label="Short"
          />
          <ToggleLink active={variant === "full"} variant="full" label="Full" />
        </div>
        <a
          href={`/api/cv?variant=${variant}&download=1`}
          className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-zinc-950 px-3 py-1.5 text-sm text-light-secondary transition-colors duration-200 hover:border-accent-primary/50 hover:text-accent-primary"
        >
          <Download className="h-3.5 w-3.5" />
          Download
        </a>
      </div>

      <div className="animate-fade-in">
        <PdfPages key={variant} src={`/api/cv?variant=${variant}`} />
      </div>
    </div>
  );
}

function ToggleLink({
  active,
  variant,
  label,
}: {
  active: boolean;
  variant: "short" | "full";
  label: string;
}) {
  return (
    <Link
      href={`/resume?variant=${variant}`}
      scroll={false}
      className={`rounded-md px-3 py-1 transition-colors duration-200 ${
        active
          ? "bg-accent-primary/15 text-accent-primary"
          : "text-light-fourth hover:text-light-secondary"
      }`}
    >
      {label}
    </Link>
  );
}
