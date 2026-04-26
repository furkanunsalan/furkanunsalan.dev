"use client";

import { useEffect, useState } from "react";
import ToolTabs from "@/components/ToolTabs";
import type { Tool } from "@/types";

function ToolsSkeleton() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="grid grid-cols-3 gap-0 mb-6">
        <div className="skeleton h-6 mx-2" />
        <div className="skeleton h-6 mx-2" />
        <div className="skeleton h-6 mx-2" />
      </div>
      <ul className="divide-y divide-white/[0.06] stagger">
        {Array.from({ length: 6 }).map((_, i) => (
          <li key={i} className="py-2.5 flex items-center gap-3">
            <div className="skeleton h-3 w-3 rounded-full" />
            <div className="skeleton h-4 w-40" />
            <div className="skeleton h-3 w-12" />
            <div className="skeleton h-3 flex-1" />
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function HomeTools() {
  const [tools, setTools] = useState<Tool[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const response = await fetch("/api/tools", { cache: "no-store" });
        if (!response.ok) {
          const body = await response
            .json()
            .catch(() => ({ error: "Failed to fetch tools" }));
          setError(body.error || `HTTP error! status: ${response.status}`);
          return;
        }
        const data = await response.json();
        setTools(data.tools || []);
      } catch (err: any) {
        setError(err.message || "Failed to fetch tools");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (error) {
    return <div className="text-red-500 text-center my-4">{error}</div>;
  }

  if (loading) return <ToolsSkeleton />;

  return <ToolTabs tools={tools} />;
}
