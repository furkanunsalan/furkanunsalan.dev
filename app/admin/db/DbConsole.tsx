"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import BrowseTab from "./BrowseTab";
import SchemaTab from "./SchemaTab";
import MigrationsTab from "./MigrationsTab";

type Tab = "browse" | "schema" | "migrations";

const TABS: { id: Tab; label: string }[] = [
  { id: "browse", label: "Browse" },
  { id: "schema", label: "Schema" },
  { id: "migrations", label: "Migrations" },
];

export default function DbConsole({ initial }: { initial: Tab }) {
  const router = useRouter();
  const params = useSearchParams();
  const [active, setActive] = useState<Tab>(initial);

  useEffect(() => {
    const t = (params.get("tab") || "browse") as Tab;
    if ((TABS.map((x) => x.id) as string[]).includes(t) && t !== active) {
      setActive(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  function select(id: Tab) {
    setActive(id);
    const qs = new URLSearchParams(params.toString());
    qs.set("tab", id);
    router.replace(`/admin/db?${qs.toString()}`, { scroll: false });
  }

  return (
    <div>
      <div className="flex items-center gap-1 mb-4 border-b border-white/[0.06]">
        {TABS.map((t) => {
          const isActive = active === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => select(t.id)}
              className={`relative -mb-px px-3 py-2 text-xs transition-colors ${
                isActive
                  ? "text-white border-b-2 border-accent-primary"
                  : "text-light-fourth hover:text-white border-b-2 border-transparent"
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {active === "browse" && <BrowseTab />}
      {active === "schema" && <SchemaTab />}
      {active === "migrations" && <MigrationsTab />}
    </div>
  );
}
