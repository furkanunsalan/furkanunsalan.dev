"use client";

import {
  Cake,
  Camera,
  Coffee,
  Compass,
  Landmark,
  MapPin,
  TentTree,
  TreePine,
  Utensils,
  Wine,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { type ListIconKey, iconKey } from "./place-list-icons";

// Client-only React-component lookup. Keys must match place-list-icons.ts.
export const PLACE_LIST_ICON_COMPONENTS: Record<ListIconKey, LucideIcon> = {
  compass: Compass,
  utensils: Utensils,
  cake: Cake,
  coffee: Coffee,
  wine: Wine,
  "map-pin": MapPin,
  camera: Camera,
  "tree-pine": TreePine,
  landmark: Landmark,
  "tent-tree": TentTree,
};

export function iconFor(k: string | null | undefined): LucideIcon {
  return PLACE_LIST_ICON_COMPONENTS[iconKey(k)];
}
