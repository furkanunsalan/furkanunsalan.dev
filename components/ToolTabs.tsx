import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Tool as ToolType } from "@/types";
import Tool from "@/components/Tool"; // Import your Tool component
import { useMemo } from "react";

export default function ToolTabs({ tools }: { tools: ToolType[] }) {
  // Group the tools by category
  const toolsByCategory = useMemo(() => {
    return tools.reduce((acc: Record<string, ToolType[]>, tool) => {
      acc[tool.category] = acc[tool.category] || [];
      acc[tool.category].push(tool);
      return acc;
    }, {});
  }, [tools]);

  // Extract the unique categories
  const categories = Object.keys(toolsByCategory);

  return (
    <Tabs defaultValue={categories[0]} className="max-w-xl mx-auto p-2">
      {/* Tabs List */}
      <TabsList className="grid w-full grid-cols-3 bg-secondary-light dark:bg-dark-third rounded-lg p-1">
        {categories.map((category) => (
          <TabsTrigger
            key={category}
            value={category}
            className="capitalize mx-1 hover:bg-hover-light dark:hover:bg-dark-secondary transition data-[state=active]:bg-primary-light dark:data-[state=active]:bg-dark-primary rounded-lg"
          >
            {category}
          </TabsTrigger>
        ))}
      </TabsList>

      {/* Tabs Content */}
      {categories.map((category) => (
        <TabsContent key={category} value={category} className="p-4">
          {toolsByCategory[category].map((tool) => (
            <Tool key={tool.id} tool={tool} />
          ))}
        </TabsContent>
      ))}
    </Tabs>
  );
}
