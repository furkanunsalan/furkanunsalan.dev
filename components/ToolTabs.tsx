"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Tool as ToolType } from "@/types";
import Tool from "@/components/Tool";
import { useMemo, useState, useEffect, useRef } from "react";

export default function ToolTabs({ tools }: { tools: ToolType[] }) {
  // Group the tools by category
  const toolsByCategory = useMemo(() => {
    return tools.reduce((acc: Record<string, ToolType[]>, tool) => {
      acc[tool.category] = acc[tool.category] || [];
      acc[tool.category].push(tool);
      return acc;
    }, {});
  }, [tools]);

  // Extract and sort categories - memoized to prevent infinite loops
  // Order: tech - desk - other
  const categories = useMemo(() => {
    const categoryOrder = ["tech", "desk", "other"];
    const allCategories = Object.keys(toolsByCategory);
    // Sort by predefined order, then add any remaining categories
    const sorted = categoryOrder.filter((cat) => allCategories.includes(cat));
    const remaining = allCategories.filter(
      (cat) => !categoryOrder.includes(cat),
    );
    return [...sorted, ...remaining];
  }, [toolsByCategory]);

  const [activeTab, setActiveTab] = useState<string>("");
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });
  const tabsListRef = useRef<HTMLDivElement>(null);

  // Update activeTab when tools are loaded - only once
  useEffect(() => {
    if (
      categories.length > 0 &&
      (!activeTab || !categories.includes(activeTab))
    ) {
      setActiveTab(categories[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tools.length]); // Only depend on tools.length to avoid infinite loops

  useEffect(() => {
    if (!activeTab) return;

    const updateIndicator = () => {
      const tabsListElement = tabsListRef.current;
      if (!tabsListElement) return;

      const activeTabElement = tabsListElement.querySelector(
        `[data-state="active"]`,
      ) as HTMLElement;

      if (activeTabElement) {
        const tabsListRect = tabsListElement.getBoundingClientRect();
        const activeTabRect = activeTabElement.getBoundingClientRect();
        const left = activeTabRect.left - tabsListRect.left;
        const width = activeTabRect.width;

        setIndicatorStyle({ left, width });
      }
    };

    // Small delay to ensure DOM is ready
    const timeoutId = setTimeout(() => {
      updateIndicator();
      requestAnimationFrame(updateIndicator);
    }, 0);

    window.addEventListener("resize", updateIndicator);

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener("resize", updateIndicator);
    };
  }, [activeTab]); // Only depend on activeTab, not categories

  // Don't render if no categories
  if (categories.length === 0) {
    return null;
  }

  return (
    <Tabs
      value={activeTab || categories[0]}
      className="max-w-xl mx-auto"
      onValueChange={setActiveTab}
    >
      {/* Tabs List */}
      <div className="relative">
        <TabsList
          ref={tabsListRef}
          className="grid w-full grid-cols-3 bg-transparent p-0 gap-0 relative"
        >
          {categories.map((category) => (
            <TabsTrigger
              key={category}
              value={category}
              className="capitalize px-0 py-2 bg-transparent hover:bg-transparent dark:hover:bg-transparent data-[state=active]:bg-transparent rounded-none transition-colors duration-300"
            >
              {category}
            </TabsTrigger>
          ))}
          {/* Sliding indicator */}
          <div
            className="absolute bottom-0 h-0.5 bg-accent-primary"
            style={{
              left: `${indicatorStyle.left}px`,
              width: `${indicatorStyle.width}px`,
            }}
          />
        </TabsList>
      </div>

      {/* Tabs Content */}
      {categories.map((category) => (
        <TabsContent key={category} value={category} className="mt-6">
          {toolsByCategory[category].map((tool) => (
            <Tool key={tool.id} tool={tool} />
          ))}
        </TabsContent>
      ))}
    </Tabs>
  );
}
