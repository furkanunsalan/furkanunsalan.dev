import ToolTabs from "@/components/ToolTabs";
import { getTools } from "@/lib/content";

export default async function HomeTools() {
  const tools = await getTools();
  return <ToolTabs tools={tools} />;
}
