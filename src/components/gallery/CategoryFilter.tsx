import type { GalleryCategory } from "../../types/content";

type CategoryFilterProps = {
  categories: GalleryCategory[];
  /** Id of the selected category, or null for All. */
  activeId: string | null;
  /** Called with the category, or null for All. */
  onSelect: (category: GalleryCategory | null) => void;
};

const chip =
  "inline-flex min-h-11 items-center rounded-full px-5 text-sm font-medium transition-colors motion-reduce:transition-none";

/** "All" followed by one toggle button per category. */
export function CategoryFilter({
  categories,
  activeId,
  onSelect,
}: CategoryFilterProps) {
  return (
    <div
      role="group"
      aria-label="Filter photos by category"
      className="flex flex-wrap gap-2.5"
    >
      <button
        type="button"
        aria-pressed={activeId === null}
        onClick={() => onSelect(null)}
        className={`${chip} ${
          activeId === null
            ? "bg-forest-900 text-ivory-50"
            : "bg-cream-100 text-forest-900 ring-1 ring-earth-700/20 hover:bg-cream-100/60"
        }`}
      >
        All
      </button>
      {categories.map((category) => {
        const pressed = category.id === activeId;
        return (
          <button
            key={category.id}
            type="button"
            aria-pressed={pressed}
            onClick={() => onSelect(category)}
            className={`${chip} ${
              pressed
                ? "bg-forest-900 text-ivory-50"
                : "bg-cream-100 text-forest-900 ring-1 ring-earth-700/20 hover:bg-cream-100/60"
            }`}
          >
            {category.name}
          </button>
        );
      })}
    </div>
  );
}
