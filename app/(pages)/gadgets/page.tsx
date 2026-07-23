import { Metadata } from "next";
import { getTools } from "@/lib/content";
import GadgetsBlueprint from "@/components/GadgetsBlueprint";

export const metadata: Metadata = {
  title: "Gadgets | Furkan Ünsalan",
  description:
    "The gear I use every day — a technical flat-lay of my everyday carry and desk setup.",
};

// DB-backed: avoid prerender at build time (CI has no access to the VPS pg).
export const dynamic = "force-dynamic";

export default async function GadgetsPage() {
  const gadgets = await getTools();
  return <GadgetsBlueprint gadgets={gadgets} />;
}
