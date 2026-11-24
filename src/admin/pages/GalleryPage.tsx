import { Plus } from "lucide-react";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { useSearchParams } from "react-router";

import { AdminModal } from "~/admin/components/AdminModal";
import { ConfirmDialog } from "~/admin/components/ConfirmDialog";
import { CrudList } from "~/admin/components/CrudList";
import { CONTROL_CLASS, FormField } from "~/admin/components/FormField";
import { GalleryCategoryDialog } from "~/admin/components/GalleryCategoryDialog";
import {
  GalleryPhotoTile,
  type HomepageState,
} from "~/admin/components/GalleryPhotoTile";
import { MediaUploader } from "~/admin/components/MediaUploader";
import { useToast } from "~/admin/components/Toast";
import { useUnsavedChanges } from "~/admin/hooks/useUnsavedChanges";
import { applySwap, neighbour, sortRows } from "~/admin/lib/reorder";
import { Button } from "~/components/common/Button";
import {
  deleteRow,
  insertRow,
  markConfirmed,
  nextSortOrder,
  setPublished,
  swapOrder,
  updateRow,
} from "~/services/admin/crud";
import { toFriendlyError } from "~/services/admin/errors";
import type { MediaRow, Row } from "~/types/db-helpers";

type CategoryRow = Row<"gallery_categories">;
type ImageRow = Row<"gallery_images">;

type GalleryPageProps = {
  categories: CategoryRow[];
  images: ImageRow[];
  /** Every photo in the library, to show the ones in the gallery. */
  media: MediaRow[];
};

type TabId = "photos" | "categories";

const TABS: { id: TabId; label: string }[] = [
  { id: "photos", label: "Photos" },
  { id: "categories", label: "Categories" },
];

/** How many marked photos the homepage shows (see homeContent). */
const HOMEPAGE_PHOTOS = 5;

const NO_CATEGORY = "none";

/**
 * The gallery, in two tabs kept in `?tab=` (photos or categories). The photos
 * tab can be narrowed to one category with `?category=` (an id, or `none`).
 * Changing a tab or the filter only changes the address search, so it never
 * triggers the leave prompt; leaving the page with unsaved captions does.
 */
export function GalleryPage({
  categories: initialCategories,
  images: initialImages,
  media,
}: GalleryPageProps) {
  const toast = useToast();
  const uid = useId();
  const [searchParams, setSearchParams] = useSearchParams();
  const [categories, setCategories] = useState(() =>
    sortRows(initialCategories),
  );
  const [images, setImages] = useState(() => sortRows(initialImages));
  const [library, setLibrary] = useState(media);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState<ImageRow | null>(null);
  // `undefined` is closed, `null` is a new category, a row is being edited.
  const [editing, setEditing] = useState<CategoryRow | null | undefined>(
    undefined,
  );
  const [dirtyCaptions, setDirtyCaptions] = useState<Record<string, boolean>>(
    {},
  );
  const messageRef = useRef<HTMLParagraphElement>(null);
  const gridRef = useRef<HTMLUListElement>(null);
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const refocus = useRef<
    | { kind: "move"; id: string; direction: "up" | "down" }
    | { kind: "delete"; index: number }
    | null
  >(null);

  const tab: TabId =
    searchParams.get("tab") === "categories" ? "categories" : "photos";
  const rawFilter = searchParams.get("category");
  const filter =
    rawFilter === NO_CATEGORY || categories.some((c) => c.id === rawFilter)
      ? rawFilter
      : null;
  const filterCategoryId =
    filter === null || filter === NO_CATEGORY ? null : filter;
  const shown =
    filter === null
      ? images
      : images.filter((i) =>
          filter === NO_CATEGORY
            ? i.category_id === null
            : i.category_id === filter,
        );

  // One leave prompt for the page (a router allows one blocker).
  const unsaved = Object.values(dirtyCaptions).some(Boolean);
  const { leaveDialog } = useUnsavedChanges(unsaved);

  useEffect(() => {
    if (message) messageRef.current?.focus();
  }, [message]);

  // After a move or a delete the focused control may be gone: put focus on
  // the same Move button, or the neighbouring photo, unless the owner moved it.
  useEffect(() => {
    const target = refocus.current;
    if (!target) return;
    refocus.current = null;
    const active = document.activeElement;
    if (active && active !== document.body) return;
    const tiles = Array.from(
      gridRef.current?.querySelectorAll<HTMLElement>("[data-tile-id]") ?? [],
    );
    if (target.kind === "move") {
      tiles
        .find((t) => t.dataset.tileId === target.id)
        ?.querySelector<HTMLElement>(`[data-reorder="${target.direction}"]`)
        ?.focus();
    } else {
      tiles[Math.min(target.index, tiles.length - 1)]?.focus();
    }
  }, [images]);

  // The first photos that are on the website and marked for the homepage are
  // the ones the homepage really shows.
  const onHomepage = new Set(
    images
      .filter((i) => i.is_featured && i.is_published)
      .slice(0, HOMEPAGE_PHOTOS)
      .map((i) => i.id),
  );
  const homepageState = (image: ImageRow): HomepageState =>
    !image.is_featured
      ? null
      : onHomepage.has(image.id)
        ? "shown"
        : "not-shown";

  function selectTab(next: TabId) {
    setMessage(null);
    setSearchParams(next === "photos" ? {} : { tab: next });
  }

  function handleTabKey(event: KeyboardEvent, index: number) {
    const last = TABS.length - 1;
    const target =
      event.key === "ArrowRight"
        ? index === last
          ? 0
          : index + 1
        : event.key === "ArrowLeft"
          ? index === 0
            ? last
            : index - 1
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? last
              : null;
    if (target === null) return;
    event.preventDefault();
    selectTab(TABS[target].id);
    tabRefs.current[TABS[target].id]?.focus();
  }

  function changeFilter(value: string) {
    setSearchParams(value === "" ? {} : { category: value });
  }

  async function run<T>(
    action: () => Promise<T>,
    entity: "photo" | "category",
  ): Promise<T | null> {
    setBusy(true);
    setMessage(null);
    try {
      return await action();
    } catch (e) {
      setMessage(toFriendlyError(e, { entity }).friendly);
      return null;
    } finally {
      setBusy(false);
    }
  }

  const replaceImage = (updated: ImageRow) =>
    setImages((cur) => cur.map((i) => (i.id === updated.id ? updated : i)));

  const handleDirtyChange = useCallback((id: string, dirty: boolean) => {
    setDirtyCaptions((cur) =>
      cur[id] === dirty ? cur : { ...cur, [id]: dirty },
    );
  }, []);

  // Photos ---------------------------------------------------------------

  function handleUploaded(rows: MediaRow[]) {
    setAdding(false);
    setLibrary((cur) => [
      ...cur,
      ...rows.filter((r) => !cur.some((m) => m.id === r.id)),
    ]);
    void run(async () => {
      const added: ImageRow[] = [];
      try {
        for (const row of rows) {
          const sort_order = await nextSortOrder("gallery_images");
          added.push(
            await insertRow("gallery_images", {
              media_id: row.id,
              category_id: filterCategoryId,
              is_published: false,
              sort_order,
            }),
          );
        }
      } finally {
        if (added.length > 0) {
          setImages((cur) => sortRows([...cur, ...added]));
          toast.success(
            added.length === 1
              ? "1 photo added."
              : `${added.length} photos added.`,
          );
        }
      }
    }, "photo");
  }

  const handleSaveCaption = async (image: ImageRow, caption: string) => {
    const updated = await run(async () => {
      const row = await updateRow("gallery_images", image.id, { caption });
      replaceImage(row);
      toast.success("Caption saved.");
      return row;
    }, "photo");
    return updated === null ? null : (updated.caption ?? "");
  };

  const handleCategory = (image: ImageRow, categoryId: string | null) =>
    void run(async () => {
      replaceImage(
        await updateRow("gallery_images", image.id, {
          category_id: categoryId,
        }),
      );
    }, "photo");

  const handleFeatured = (image: ImageRow, next: boolean) =>
    void run(async () => {
      replaceImage(
        await updateRow("gallery_images", image.id, { is_featured: next }),
      );
    }, "photo");

  const handlePublishPhoto = (image: ImageRow, next: boolean) =>
    void run(async () => {
      replaceImage(await setPublished("gallery_images", image.id, next));
      toast.success(
        next ? "The photo is on the website." : "The photo is hidden.",
      );
    }, "photo");

  const handleMove = (image: ImageRow, direction: "up" | "down") => {
    const other = neighbour(shown, image, direction);
    if (!other) return;
    refocus.current = { kind: "move", id: image.id, direction };
    void run(async () => {
      await swapOrder("gallery_images", image, other);
      setImages((cur) => applySwap(cur, image, other));
    }, "photo");
  };

  const handleConfirmPhoto = (image: ImageRow) =>
    void run(async () => {
      replaceImage(await markConfirmed("gallery_images", image.id));
      toast.success("Photo marked as confirmed.");
    }, "photo");

  const handleRemovePhoto = (image: ImageRow) => {
    refocus.current = {
      kind: "delete",
      index: shown.findIndex((i) => i.id === image.id),
    };
    void run(async () => {
      await deleteRow("gallery_images", image.id);
      setImages((cur) => cur.filter((i) => i.id !== image.id));
      setDirtyCaptions((cur) => {
        return Object.fromEntries(
          Object.entries(cur).filter(([id]) => id !== image.id),
        );
      });
      toast.success("Photo removed from the gallery.");
    }, "photo");
  };

  // Categories -----------------------------------------------------------

  const handleTogglePublish = (item: CategoryRow, next: boolean) =>
    void run(async () => {
      const updated = await setPublished("gallery_categories", item.id, next);
      setCategories((cur) => cur.map((c) => (c.id === item.id ? updated : c)));
      toast.success(
        next ? `${item.name} is on the website.` : `${item.name} is hidden.`,
      );
    }, "category");

  const handleReorderCategory = (
    item: CategoryRow,
    direction: "up" | "down",
  ) => {
    const other = neighbour(categories, item, direction);
    if (!other) return;
    void run(async () => {
      await swapOrder("gallery_categories", item, other);
      setCategories((cur) => applySwap(cur, item, other));
    }, "category");
  };

  const handleDeleteCategory = (item: CategoryRow) =>
    void run(async () => {
      await deleteRow("gallery_categories", item.id);
      setCategories((cur) => cur.filter((c) => c.id !== item.id));
      // The database leaves the photos without a category.
      setImages((cur) =>
        cur.map((i) =>
          i.category_id === item.id ? { ...i, category_id: null } : i,
        ),
      );
      toast.success(`${item.name} deleted.`);
    }, "category");

  async function saveCategory(values: {
    name: string;
    slug: string;
  }): Promise<void> {
    if (editing) {
      const updated = await updateRow("gallery_categories", editing.id, {
        name: values.name,
        slug: values.slug,
      });
      setCategories((cur) =>
        cur.map((c) => (c.id === updated.id ? updated : c)),
      );
      toast.success("Category saved.");
    } else {
      const sort_order = await nextSortOrder("gallery_categories");
      const created = await insertRow("gallery_categories", {
        name: values.name,
        slug: values.slug,
        is_published: false,
        sort_order,
      });
      setCategories((cur) => sortRows([...cur, created]));
      toast.success(`${created.name} added. Switch it on to show it.`);
    }
    setEditing(undefined);
  }

  const countIn = (id: string) =>
    images.filter((i) => i.category_id === id).length;

  const removingNumber = removing
    ? shown.findIndex((i) => i.id === removing.id) + 1
    : 0;

  return (
    <section aria-labelledby="gallery-title">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1
            id="gallery-title"
            className="font-serif text-3xl font-bold text-forest-900"
          >
            Gallery
          </h1>
          <p className="mt-3 max-w-xl text-ink-600">
            The photos on the Gallery page. Only what is switched on is shown to
            visitors. Photos come from your media library; deleting one here
            does not delete it from there.
          </p>
        </div>
        {tab === "photos" ? (
          <Button
            type="button"
            variant="outline-dark"
            disabled={busy}
            onClick={() => setAdding(true)}
          >
            <Plus aria-hidden="true" className="size-4" />
            Add photos
          </Button>
        ) : (
          <Button
            type="button"
            variant="outline-dark"
            disabled={busy}
            onClick={() => setEditing(null)}
          >
            <Plus aria-hidden="true" className="size-4" />
            Add category
          </Button>
        )}
      </div>

      <div
        role="tablist"
        aria-label="Photos or categories"
        className="mt-8 flex gap-2 border-b border-earth-600/30"
      >
        {TABS.map((t, index) => {
          const selected = t.id === tab;
          return (
            <button
              key={t.id}
              ref={(el) => {
                tabRefs.current[t.id] = el;
              }}
              type="button"
              role="tab"
              id={`${uid}-tab-${t.id}`}
              aria-selected={selected}
              aria-controls={`${uid}-panel`}
              tabIndex={selected ? 0 : -1}
              onClick={() => selectTab(t.id)}
              onKeyDown={(e) => handleTabKey(e, index)}
              className={`-mb-px min-h-11 rounded-t-lg border-b-2 px-5 py-2 text-base font-semibold ${
                selected
                  ? "border-forest-900 text-forest-900"
                  : "border-transparent text-ink-600 hover:text-forest-900"
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      <div
        role="tabpanel"
        id={`${uid}-panel`}
        aria-labelledby={`${uid}-tab-${tab}`}
        className="mt-6"
      >
        {message ? (
          <p
            ref={messageRef}
            tabIndex={-1}
            role="alert"
            className="mb-4 font-semibold text-red-700 focus:outline-none"
          >
            {message}
          </p>
        ) : null}

        {tab === "photos" ? (
          <>
            <div className="max-w-xs">
              <FormField label="Show photos in" name="filter">
                <select
                  value={filter ?? ""}
                  onChange={(e) => changeFilter(e.target.value)}
                  className={CONTROL_CLASS}
                >
                  <option value="">All photos</option>
                  <option value={NO_CATEGORY}>No category</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </FormField>
            </div>
            <p className="mt-3 max-w-xl text-sm text-ink-600">
              The homepage shows the first 5 published photos marked here.
            </p>

            {shown.length === 0 ? (
              <p className="mt-5 rounded-xl border border-dashed border-earth-600/50 bg-white px-5 py-10 text-center text-ink-600">
                {filter === null
                  ? "No photos yet. Use “Add photos” to upload some."
                  : "No photos here yet. Use “Add photos” to upload some."}
              </p>
            ) : (
              <ul
                ref={gridRef}
                className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
              >
                {shown.map((image, index) => (
                  <GalleryPhotoTile
                    key={image.id}
                    image={image}
                    media={library.find((m) => m.id === image.media_id)}
                    number={index + 1}
                    total={shown.length}
                    categories={categories}
                    homepage={homepageState(image)}
                    busy={busy}
                    onSaveCaption={handleSaveCaption}
                    onDirtyChange={handleDirtyChange}
                    onCategory={handleCategory}
                    onFeatured={handleFeatured}
                    onPublish={handlePublishPhoto}
                    onMove={handleMove}
                    onDelete={setRemoving}
                    onConfirm={handleConfirmPhoto}
                  />
                ))}
              </ul>
            )}
          </>
        ) : (
          <CrudList
            items={categories}
            emptyText="No categories yet. Use “Add category” to create the first one."
            busy={busy}
            render={(item) => {
              const count = countIn(item.id);
              return {
                label: item.name,
                detail: `Web address: ${item.slug} · ${count} ${count === 1 ? "photo" : "photos"}`,
              };
            }}
            onTogglePublish={handleTogglePublish}
            onReorder={handleReorderCategory}
            onEdit={setEditing}
            onDelete={handleDeleteCategory}
            deleteBody={() =>
              "Photos in this category will become uncategorised."
            }
          />
        )}
      </div>

      {adding ? (
        <AdminModal
          title="Add photos"
          busy={uploading}
          onClose={() => setAdding(false)}
        >
          <MediaUploader
            purpose="gallery"
            multiple
            onBusyChange={setUploading}
            onUploaded={handleUploaded}
          />
        </AdminModal>
      ) : null}

      {editing !== undefined ? (
        <GalleryCategoryDialog
          key={editing?.id ?? "new"}
          category={editing}
          onClose={() => setEditing(undefined)}
          onSave={saveCategory}
        />
      ) : null}

      <ConfirmDialog
        open={removing !== null}
        title={`Delete photo ${removingNumber}?`}
        body="It is removed from the gallery only. The photo stays in your media library."
        confirmLabel="Delete"
        destructive
        onCancel={() => setRemoving(null)}
        onConfirm={() => {
          const image = removing;
          setRemoving(null);
          if (image) handleRemovePhoto(image);
        }}
      />

      {leaveDialog}
    </section>
  );
}
