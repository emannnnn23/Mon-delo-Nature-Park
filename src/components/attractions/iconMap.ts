import {
  BedDouble,
  Camera,
  Coffee,
  Flower2,
  Leaf,
  type LucideIcon,
  Mountain,
  Sunset,
  Tent,
  Trees,
  Users,
  Utensils,
  WavesHorizontal,
} from "lucide-react";
import type { AttractionIcon } from "../../types/content";

/** The Lucide icon drawn for each icon key an admin can pick. */
export const iconMap: Record<AttractionIcon, LucideIcon> = {
  leaf: Leaf,
  mountain: Mountain,
  utensils: Utensils,
  waves: WavesHorizontal,
  tent: Tent,
  trees: Trees,
  sunset: Sunset,
  camera: Camera,
  users: Users,
  "flower-2": Flower2,
  "bed-double": BedDouble,
  coffee: Coffee,
};
