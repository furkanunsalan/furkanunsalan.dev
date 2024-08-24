import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Tool as ToolType } from "@/types";
import Tool from "@/components/Tool";  // Import your Tool component
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
    <Tabs defaultValue={categories[0]} className="md:w-1/3 mx-auto p-2">
      {/* Tabs List */}
      <TabsList className="grid w-full grid-cols-3 bg-secondary-light dark:bg-secondary-dark rounded-lg p-1">
        {categories.map((category) => (
          <TabsTrigger
            key={category}
            value={category}
            className="capitalize mx-1 hover:bg-primary-light dark:hover:bg-primary-dark transition data-[state=active]:bg-primary-light dark:data-[state=active]:bg-primary-dark rounded-lg"
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
