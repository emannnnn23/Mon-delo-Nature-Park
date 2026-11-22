import { Ban } from "lucide-react";

import { iconMap } from "~/components/attractions/iconMap";
import { ATTRACTION_ICONS, type AttractionIcon } from "~/types/content";

/** Plain names for the icons, as the owner sees them. */
export const ICON_LABELS: Record<AttractionIcon, string> = {
  leaf: "Leaf",
  mountain: "Mountain",
  utensils: "Food",
  waves: "Water",
  tent: "Camping",
  trees: "Trees",
  sunset: "Sunset",
  camera: "Camera",
  users: "Group",
  "flower-2": "Flower",
  "bed-double": "Stay",
  coffee: "Coffee",
};

type IconPickerProps = {
  value: AttractionIcon | null;
  onChange: (icon: AttractionIcon | null) => void;
  /** Accessible name of the group. */
  label: string;
  /** The radio `name`; FormField passes its own. */
  name: string;
  /** Adds a "No icon" choice, for icons that may be left empty. */
  allowNone?: boolean;
  id?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: true;
};

const TILE =
  "flex min-h-14 min-w-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-earth-600/50 bg-white px-3 py-2 text-center text-sm font-semibold text-ink-900 transition-colors hover:bg-cream-100 peer-checked:border-forest-900 peer-checked:bg-forest-900 peer-checked:text-ivory-50 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-forest-900 motion-reduce:transition-none";

/**
 * The icon choice for an attraction or experience: the twelve icons the
 * website can draw, each with its name. Native radio buttons, so arrow keys
 * move between them and the choice is announced as one group.
 */
export function IconPicker({
  value,
  onChange,
  label,
  name,
  allowNone = false,
  id,
  "aria-describedby": describedBy,
  "aria-invalid": invalid,
}: IconPickerProps) {
  return (
    <div
      role="radiogroup"
      id={id}
      aria-label={label}
      aria-describedby={describedBy}
      aria-invalid={invalid}
      // Focusable so a failed check can move here.
      tabIndex={-1}
      className="flex flex-wrap gap-2 focus:outline-none"
    >
      {allowNone ? (
        <label>
          <input
            type="radio"
            name={name}
            value=""
            checked={value === null}
            onChange={() => onChange(null)}
            className="peer sr-only"
          />
          <span className={TILE}>
            <Ban aria-hidden="true" className="size-5" strokeWidth={1.75} />
            No icon
          </span>
        </label>
      ) : null}
      {ATTRACTION_ICONS.map((icon) => {
        const Icon = iconMap[icon];
        return (
          <label key={icon}>
            <input
              type="radio"
              name={name}
              value={icon}
              checked={value === icon}
              onChange={() => onChange(icon)}
              className="peer sr-only"
            />
            <span className={TILE}>
              <Icon aria-hidden="true" className="size-5" strokeWidth={1.75} />
              {ICON_LABELS[icon]}
            </span>
          </label>
        );
      })}
    </div>
  );
}
