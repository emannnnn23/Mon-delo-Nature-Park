import { Plus } from "lucide-react";
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { useSearchParams } from "react-router";

import { CrudList } from "~/admin/components/CrudList";
import { useToast } from "~/admin/components/Toast";
import { applySwap, neighbour, sortRows } from "~/admin/lib/reorder";
import { Button } from "~/components/common/Button";
import { SampleTag } from "~/components/common/SampleTag";
import { deleteRow, setPublished, swapOrder } from "~/services/admin/crud";
import { toFriendlyError } from "~/services/admin/errors";
import type { AttractionKind } from "~/types/content";
import type { Row } from "~/types/db-helpers";

type AttractionRow = Row<"attractions">;

type AttractionsListPageProps = {
  /** Every attraction and experience, in list order. */
  rows: AttractionRow[];
};

const TABS: {
  kind: AttractionKind;
  label: string;
  add: string;
  empty: string;
}[] = [
  {
    kind: "attraction",
    label: "Attractions",
    add: "Add attraction",
    empty: "No attractions yet. Use “Add attraction” to create the first one.",
  },
  {
    kind: "experience",
    label: "Experiences",
    add: "Add experience",
    empty: "No experiences yet. Use “Add experience” to create the first one.",
  },
];

/**
 * Attractions and experiences, one tab each (kept in `?kind=` so the address
 * can be shared and the back button works). Publishing, order and deleting
 * happen here; everything else is on the edit page.
 */
export function AttractionsListPage({ rows }: AttractionsListPageProps) {
  const toast = useToast();
  const uid = useId();
  const [searchParams, setSearchParams] = useSearchParams();
  const [current, setCurrent] = useState(() => sortRows(rows));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const messageRef = useRef<HTMLParagraphElement>(null);
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const kind: AttractionKind =
    searchParams.get("kind") === "experience" ? "experience" : "attraction";
  const tab = TABS.find((t) => t.kind === kind) ?? TABS[0];
  const shown = current.filter((r) => r.kind === kind);

  // A failure message takes focus so keyboard users do not miss it.
  useEffect(() => {
    if (message) messageRef.current?.focus();
  }, [message]);

  function selectTab(next: AttractionKind) {
    setMessage(null);
    setSearchParams(next === "attraction" ? {} : { kind: next });
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
    selectTab(TABS[target].kind);
    tabRefs.current[TABS[target].kind]?.focus();
  }

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setMessage(null);
    try {
      await action();
    } catch (e) {
      setMessage(toFriendlyError(e, { entity: "attraction" }).friendly);
    } finally {
      setBusy(false);
    }
  }

  const handleTogglePublish = (item: AttractionRow, next: boolean) =>
    run(async () => {
      const updated = await setPublished("attractions", item.id, next);
      setCurrent((cur) => cur.map((r) => (r.id === item.id ? updated : r)));
      toast.success(
        next ? `${item.name} is on the website.` : `${item.name} is hidden.`,
      );
    });

  const handleReorder = (item: AttractionRow, direction: "up" | "down") => {
    const other = neighbour(shown, item, direction);
    if (!other) return Promise.resolve();
    return run(async () => {
      await swapOrder("attractions", item, other);
      setCurrent((cur) => applySwap(cur, item, other));
    });
  };

  const handleDelete = (item: AttractionRow) =>
    run(async () => {
      await deleteRow("attractions", item.id);
      setCurrent((cur) => cur.filter((r) => r.id !== item.id));
      toast.success(`${item.name} deleted.`);
    });

  return (
    <section aria-labelledby="attractions-title">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1
            id="attractions-title"
            className="font-serif text-3xl font-bold text-forest-900"
          >
            Attractions
          </h1>
          <p className="mt-3 max-w-xl text-ink-600">
            Attractions have their own page on the website. Experiences are the
            small cards with an icon on the Discover page. Only what is switched
            on is shown to visitors.
          </p>
        </div>
        <Button
          to={
            kind === "experience"
              ? "/admin/attractions/new?kind=experience"
              : "/admin/attractions/new"
          }
          variant="outline-dark"
        >
          <Plus aria-hidden="true" className="size-4" />
          {tab.add}
        </Button>
      </div>

      <div
        role="tablist"
        aria-label="Attractions or experiences"
        className="mt-8 flex gap-2 border-b border-earth-600/30"
      >
        {TABS.map((t, index) => {
          const selected = t.kind === kind;
          return (
            <button
              key={t.kind}
              ref={(el) => {
                tabRefs.current[t.kind] = el;
              }}
              type="button"
              role="tab"
              id={`${uid}-tab-${t.kind}`}
              aria-selected={selected}
              aria-controls={`${uid}-panel`}
              tabIndex={selected ? 0 : -1}
              onClick={() => selectTab(t.kind)}
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
        aria-labelledby={`${uid}-tab-${kind}`}
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
        <CrudList
          items={shown}
          emptyText={tab.empty}
          busy={busy}
          render={(item) => ({
            label: item.name,
            detail: item.summary,
            badges: (
              <>
                {item.is_sample ? <SampleTag /> : null}
                {item.is_featured ? (
                  <span className="text-sm font-semibold text-earth-700">
                    On the homepage
                  </span>
                ) : null}
              </>
            ),
            editTo: `/admin/attractions/${item.id}`,
          })}
          onTogglePublish={(item, next) => void handleTogglePublish(item, next)}
          onReorder={(item, direction) => void handleReorder(item, direction)}
          onDelete={(item) => void handleDelete(item)}
          deleteBody={(item) =>
            item.kind === "attraction"
              ? "Its extra photos will be removed from this attraction (the photos stay in your media library)."
              : "This can't be undone."
          }
        />
      </div>
    </section>
  );
}
