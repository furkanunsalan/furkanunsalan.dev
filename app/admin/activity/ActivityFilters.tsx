"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

export default function ActivityFilters({
  action,
  resource,
  actions,
  resources,
}: {
  action: string;
  resource: string;
  actions: string[];
  resources: string[];
}) {
  const router = useRouter();
  const sp = useSearchParams();

  const update = useCallback(
    (key: "action" | "resource", value: string) => {
      const next = new URLSearchParams(sp?.toString() ?? "");
      if (value) next.set(key, value);
      else next.delete(key);
      const qs = next.toString();
      router.replace(qs ? `/admin/activity?${qs}` : "/admin/activity");
    },
    [router, sp],
  );

  const fieldClass =
    "bg-black ring-1 ring-white/[0.08] focus:ring-accent-primary/60 outline-none rounded-lg px-2.5 py-1.5 text-xs text-white";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="text-[10px] uppercase tracking-widest text-light-fourth">
        Action
      </label>
      <select
        value={action}
        onChange={(e) => update("action", e.target.value)}
        className={fieldClass}
      >
        <option value="">all</option>
        {actions.map((a) => (
          <option key={a} value={a}>
            {a}
          </option>
        ))}
      </select>
      <label className="ml-2 text-[10px] uppercase tracking-widest text-light-fourth">
        Resource
      </label>
      <select
        value={resource}
        onChange={(e) => update("resource", e.target.value)}
        className={fieldClass}
      >
        <option value="">all</option>
        {resources.map((r) => (
          <option key={r} value={r}>
            {r}
          </option>
        ))}
      </select>
      {(action || resource) && (
        <button
          type="button"
          onClick={() => router.replace("/admin/activity")}
          className="ml-1 rounded-md px-2 py-1 text-[11px] text-light-fourth ring-1 ring-white/[0.08] hover:text-white hover:ring-white/20"
        >
          Clear
        </button>
      )}
    </div>
  );
}
