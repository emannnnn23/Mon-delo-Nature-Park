import { useSearchParams } from "react-router";
import { Button } from "../components/common/Button";
import { PageHeader } from "../components/common/PageHeader";
import { PlaceholderImage } from "../components/common/PlaceholderImage";
import { CategoryFilter } from "../components/gallery/CategoryFilter";
import { GalleryGrid } from "../components/gallery/GalleryGrid";
import { useHydrated } from "../hooks/useHydrated";
import { resolveCategory } from "../lib/gallery";
import type {
  GalleryCategory,
  GalleryImage,
  PageSection,
} from "../types/content";

export type GalleryPageProps = {
  intro: PageSection | null;
  categories: GalleryCategory[];
  images: GalleryImage[];
};

/**
 * Gallery: a forest header band, category chips, and the photos in columns.
 * The chosen category lives in `?category=<slug>`; the prerendered page and an
 * unknown slug both show All. Without photos it shows a "coming soon" tile.
 */
export function GalleryPage({ intro, categories, images }: GalleryPageProps) {
  const [searchParams, setSearchParams] = useSearchParams();

  // Only categories that have photos get a chip.
  const usedCategories = categories.filter((category) =>
    images.some((item) => item.categoryId === category.id),
  );
  // The prerendered page is always All; apply the URL's category only after
  // hydration so the first client render matches the server markup.
  const hydrated = useHydrated();
  const activeId = hydrated
    ? resolveCategory(searchParams.get("category"), usedCategories)
    : null;
  const shown =
    activeId === null
      ? images
      : images.filter((item) => item.categoryId === activeId);

  const select = (category: GalleryCategory | null) => {
    setSearchParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        if (category) next.set("category", category.slug);
        else next.delete("category");
        return next;
      },
      { replace: true, preventScrollReset: true },
    );
  };

  return (
    <>
      <PageHeader title="Gallery" body={intro?.body} />

      <div className="bg-ivory-50 py-12 md:py-16">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          {images.length === 0 ? (
            <div className="mx-auto max-w-3xl text-center">
              <div className="aspect-[16/8] overflow-hidden rounded-lg ring-1 ring-earth-700/10">
                <PlaceholderImage label="Photos coming soon" />
              </div>
              <Button to="/discover" variant="outline-dark" className="mt-8">
                Explore the park
              </Button>
            </div>
          ) : (
            <>
              {usedCategories.length > 0 ? (
                <CategoryFilter
                  categories={usedCategories}
                  activeId={activeId}
                  onSelect={select}
                />
              ) : null}
              <div className={usedCategories.length > 0 ? "mt-8" : ""}>
                <GalleryGrid images={shown} />
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
