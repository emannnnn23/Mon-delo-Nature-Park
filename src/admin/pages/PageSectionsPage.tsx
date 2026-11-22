import { useCallback, useState } from "react";

import { SectionEditor } from "~/admin/components/SectionEditor";
import { useToast } from "~/admin/components/Toast";
import { useUnsavedChanges } from "~/admin/hooks/useUnsavedChanges";
import {
  PAGE_TITLES,
  SECTION_LABELS,
  imagePurposeFor,
  sectionLabel,
  type PageKey,
} from "~/admin/lib/sectionLabels";
import { Button } from "~/components/common/Button";
import { insertRow, nextSortOrder } from "~/services/admin/crud";
import { toFriendlyError } from "~/services/admin/errors";
import type { MediaRow, Row } from "~/types/db-helpers";

type SectionRow = Row<"page_sections">;

type PageSectionsPageProps = {
  page: PageKey;
  rows: SectionRow[];
  /** Every photo in the library. */
  media: MediaRow[];
};

/**
 * Edit the sections of one public page (home, about or visit). Each known
 * section has its own collapsible editor and Save button. A section the public
 * site looks for but the database does not have yet can be added, and starts
 * hidden so nothing appears on the website by accident.
 */
export function PageSectionsPage({ page, rows, media }: PageSectionsPageProps) {
  const toast = useToast();
  const [current, setCurrent] = useState(rows);
  const [adding, setAdding] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [firstNew, setFirstNew] = useState<string | null>(null);
  const [dirtyIds, setDirtyIds] = useState<ReadonlySet<string>>(new Set());

  // One leave prompt for the whole page (a router allows one blocker). Each
  // section keeps its own draft on this device, so leaving loses nothing.
  const { leaveDialog } = useUnsavedChanges(dirtyIds.size > 0);
  const handleDirtyChange = useCallback((id: string, dirty: boolean) => {
    setDirtyIds((cur) => {
      if (cur.has(id) === dirty) return cur;
      const next = new Set(cur);
      if (dirty) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const knownKeys = Object.keys(SECTION_LABELS[page]);
  const known = knownKeys.flatMap((key) => {
    const found = current.find((r) => r.key === key);
    return found ? [found] : [];
  });
  // Rows the admin has no name for are still shown, after the known ones.
  const others = current.filter((r) => !knownKeys.includes(r.key));
  const missing = knownKeys.filter(
    (key) => !current.some((r) => r.key === key),
  );
  const title = PAGE_TITLES[page];

  async function handleAdd(key: string) {
    setAdding(key);
    setMessage(null);
    try {
      const sort_order = await nextSortOrder("page_sections", { page });
      const created = await insertRow("page_sections", {
        page,
        key,
        sort_order,
        is_published: false,
        is_sample: false,
      });
      setCurrent((cur) => [...cur, created]);
      setFirstNew(created.id);
      toast.success(
        `${sectionLabel(page, key)} added. It is hidden until you publish it.`,
      );
    } catch (e) {
      setMessage(toFriendlyError(e, { entity: "section" }).friendly);
    } finally {
      setAdding(null);
    }
  }

  return (
    <section aria-labelledby="page-sections-title">
      <h1
        id="page-sections-title"
        className="font-serif text-3xl font-bold text-forest-900"
      >
        {title}
      </h1>
      <p className="mt-3 max-w-xl text-ink-600">
        Change the words and photos of each part of this page. Leave anything
        you do not need empty. Every part has its own Save button, and only what
        is switched on is shown on the website.
      </p>

      <div className="mt-8 flex flex-col gap-4">
        {[...known, ...others].map((row, index) => (
          <SectionEditor
            key={row.id}
            row={row}
            label={sectionLabel(page, row.key)}
            media={media}
            imagePurpose={imagePurposeFor(row.key)}
            defaultOpen={index === 0 || row.id === firstNew}
            onDirtyChange={handleDirtyChange}
          />
        ))}
      </div>

      {missing.length > 0 ? (
        <section aria-labelledby="page-sections-missing" className="mt-10">
          <h2
            id="page-sections-missing"
            className="font-serif text-xl font-bold text-forest-900"
          >
            Not set up yet
          </h2>
          <p className="mt-2 max-w-xl text-ink-600">
            These parts of the page have not been created. Add one to start
            editing it. It stays hidden until you publish it.
          </p>
          {message ? (
            <p role="alert" className="mt-3 font-semibold text-red-700">
              {message}
            </p>
          ) : null}
          <ul className="mt-4 flex flex-col gap-3">
            {missing.map((key) => {
              const label = SECTION_LABELS[page][key];
              return (
                <li
                  key={key}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-cream-100 bg-white px-5 py-3"
                >
                  <span className="font-semibold text-ink-900">{label}</span>
                  <Button
                    type="button"
                    variant="outline-dark"
                    aria-label={`Add section: ${label}`}
                    disabled={adding !== null}
                    onClick={() => void handleAdd(key)}
                  >
                    Add section
                  </Button>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
      {leaveDialog}
    </section>
  );
}
