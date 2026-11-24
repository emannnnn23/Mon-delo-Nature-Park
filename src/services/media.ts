import { getSupabase } from "~/lib/supabase";
import type { MediaRow } from "~/types/db-helpers";
import { encodeVariant, validateImageFile } from "~/utils/encodeImage";
import { buildMediaPath, planVariantWidths } from "~/utils/mediaPath";
import { shortId, slugify, wordsFromFilename } from "~/utils/slug";

import {
  AdminError,
  noRowsError,
  notConfiguredError,
  toFriendlyError,
} from "./admin/errors";

/** The bucket's per-object limit (see the storage migration). */
const MAX_OBJECT_BYTES = 5 * 1024 * 1024;
const RETRY_QUALITY = 0.6;
const BUCKET = "media";
const ENTITY = "photo";

/** Owner-facing names of the pages that have editable sections. */
const PAGE_NAMES: Record<string, string> = {
  home: "Home page",
  about: "About page",
  visit: "Visit page",
};

/** Thrown when a photo is still used somewhere and so cannot be deleted. */
export class MediaInUseError extends AdminError {
  readonly usedBy: string[];

  constructor(usedBy: string[]) {
    super(
      "23503",
      usedBy.length > 0
        ? `This photo is used by: ${usedBy.join(", ")}`
        : "This photo is still in use elsewhere and can't be deleted yet.",
    );
    this.name = "MediaInUseError";
    this.usedBy = usedBy;
  }
}

function client() {
  const supabase = getSupabase();
  if (!supabase) throw notConfiguredError();
  return supabase;
}

type QueryResult<T> = { data: T; error: unknown };

/** Awaits a query and returns its data, or throws a friendly AdminError. */
async function run<T>(query: PromiseLike<QueryResult<T>>): Promise<T> {
  let result: QueryResult<T>;
  try {
    result = await query;
  } catch (e) {
    throw toFriendlyError(e, { entity: ENTITY });
  }
  if (result.error) throw toFriendlyError(result.error, { entity: ENTITY });
  return result.data;
}

/**
 * Storage errors carry an HTTP status instead of a Postgres code: 401 and 403
 * mean the session no longer counts as an admin, 413 a file over the limit.
 */
function storageError(e: unknown): AdminError {
  const status = Number(
    (e as { statusCode?: unknown; status?: unknown } | null)?.statusCode ??
      (e as { status?: unknown } | null)?.status,
  );
  if (status === 401 || status === 403) {
    return toFriendlyError({ code: "42501" }, { entity: ENTITY });
  }
  if (status === 413) {
    return new AdminError(
      "TOO_LARGE",
      "This photo is too large to upload. Please use a smaller version.",
    );
  }
  return toFriendlyError(e, { entity: ENTITY });
}

/** Best effort: a failed clean-up must not hide the error that started it. */
async function removeObjects(paths: string[]): Promise<boolean> {
  if (paths.length === 0) return true;
  try {
    const { error } = await client().storage.from(BUCKET).remove(paths);
    if (error) {
      console.error("Could not remove media files", error);
      return false;
    }
    return true;
  } catch (e) {
    console.error("Could not remove media files", e);
    return false;
  }
}

/**
 * The readable part of a storage key. Built from the description the owner
 * typed, never from the file name (which can carry names, dates or a device
 * id and would sit in a public URL). The file name's words are used only when
 * the description has no letters or digits that survive as ASCII.
 */
function storageSlug(alt: string, fileName: string): string {
  const hasUsable = /[a-z0-9]/i.test(alt.normalize("NFKD").replace(/[̀-ͯ]/g, ""));
  return slugify(hasUsable ? alt : wordsFromFilename(fileName));
}

/**
 * Prepares a chosen photo in the browser (several widths, WebP, no EXIF or GPS)
 * and stores it: every size goes to the `media` bucket, then one `media` row
 * points at them. If anything fails, files already uploaded are removed again
 * and a friendly AdminError is thrown. `onProgress(done, total)` is called
 * before the first size and after each one.
 */
export async function uploadImage(
  file: File,
  altText: string,
  purpose: "cover" | "gallery",
  onProgress?: (done: number, total: number) => void,
): Promise<MediaRow> {
  const alt = altText.trim();
  if (alt === "") {
    throw new AdminError(
      "VALIDATION",
      "Please describe the photo in a few words.",
    );
  }
  const check = validateImageFile(file, purpose);
  if (!check.ok) throw new AdminError("INVALID_IMAGE", check.message);
  const supabase = client();

  let bitmap: ImageBitmap;
  try {
    if (typeof createImageBitmap !== "function") throw new Error("unsupported");
    try {
      bitmap = await createImageBitmap(file, {
        imageOrientation: "from-image",
      });
    } catch (e) {
      // Older Safari and Chromium reject the option itself (a TypeError).
      if (!(e instanceof TypeError)) throw e;
      bitmap = await createImageBitmap(file);
    }
  } catch {
    throw new AdminError(
      "UNREADABLE",
      "We couldn't open that photo. Please try a different one.",
    );
  }

  const uploaded: string[] = [];
  try {
    const dims = { width: bitmap.width, height: bitmap.height };
    const sized = validateImageFile(file, purpose, dims);
    if (!sized.ok) throw new AdminError("INVALID_IMAGE", sized.message);

    const widths = planVariantWidths(dims.width);
    const year = new Date().getFullYear();
    const slug = storageSlug(alt, file.name);
    const id = shortId();
    const variants: Record<string, string> = {};

    onProgress?.(0, widths.length);
    for (const [index, width] of widths.entries()) {
      let encoded: Awaited<ReturnType<typeof encodeVariant>>;
      try {
        encoded = await encodeVariant(bitmap, width);
        if (encoded.blob.size > MAX_OBJECT_BYTES) {
          encoded = await encodeVariant(bitmap, width, {
            quality: RETRY_QUALITY,
          });
        }
      } catch {
        throw new AdminError(
          "ENCODE",
          "We couldn't prepare that photo. Please try a different one.",
        );
      }
      if (encoded.blob.size > MAX_OBJECT_BYTES) {
        throw new AdminError(
          "TOO_LARGE",
          "This photo is still too large after shrinking it. Please use a smaller version.",
        );
      }

      const path = buildMediaPath({
        year,
        base: slug,
        id,
        width,
        ext: encoded.ext,
      });
      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(path, encoded.blob, {
          contentType: encoded.blob.type,
          cacheControl: "31536000",
          upsert: false,
        });
      if (error) throw storageError(error);
      uploaded.push(path);
      variants[String(width)] = path;
      onProgress?.(index + 1, widths.length);
    }

    const row = await run(
      supabase
        .from("media")
        .insert({
          storage_base_path: `${year}/${slug}-${id}`,
          alt_text: alt,
          width: dims.width,
          height: dims.height,
          variants,
          // The camera's file name can hold a person's name or a date; it is
          // not kept (the column is nullable).
          original_filename: null,
        })
        .select()
        .single(),
    );
    if (!row) throw noRowsError();
    return row;
  } catch (e) {
    await removeObjects(uploaded);
    throw e instanceof AdminError ? e : toFriendlyError(e, { entity: ENTITY });
  } finally {
    bitmap.close?.();
  }
}

/** Every photo in the library, newest first. */
export async function listMedia(): Promise<MediaRow[]> {
  const rows = await run(
    client().from("media").select("*").order("created_at", {
      ascending: false,
    }),
  );
  return rows ?? [];
}

/** Changes a photo's description or focal point. Only what is passed changes. */
export async function updateMedia(
  id: string,
  changes: { altText?: string; focalX?: number; focalY?: number },
): Promise<MediaRow> {
  const values: {
    alt_text?: string;
    focal_x?: number;
    focal_y?: number;
  } = {};
  if (changes.altText !== undefined) {
    const alt = changes.altText.trim();
    if (alt === "") {
      throw new AdminError(
        "VALIDATION",
        "Please describe the photo in a few words.",
      );
    }
    values.alt_text = alt;
  }
  const percent = (n: number) => Math.min(100, Math.max(0, Math.round(n)));
  if (changes.focalX !== undefined) values.focal_x = percent(changes.focalX);
  if (changes.focalY !== undefined) values.focal_y = percent(changes.focalY);

  const rows = await run(
    client().from("media").update(values).eq("id", id).select(),
  );
  // Row level security hides the row from a session that is no longer admin.
  if (!rows || rows.length === 0) throw noRowsError();
  return rows[0];
}

/**
 * Where a photo is used, as plain labels such as "Attraction: Scenic Views" or
 * "Gallery image". Each place appears once.
 */
export async function findMediaUsage(id: string): Promise<string[]> {
  const supabase = client();
  const [sections, attractions, attractionImages, gallery, settings] =
    await Promise.all([
      run(
        supabase
          .from("page_sections")
          .select("page, heading")
          .eq("media_id", id),
      ),
      run(supabase.from("attractions").select("name").eq("cover_media_id", id)),
      run(
        supabase
          .from("attraction_images")
          .select("attractions(name)")
          .eq("media_id", id),
      ),
      run(supabase.from("gallery_images").select("id").eq("media_id", id)),
      run(
        supabase
          .from("site_settings")
          .select("id")
          .eq("default_og_media_id", id),
      ),
    ]);

  const labels = [
    ...(sections ?? []).map((s) => {
      const where = `${PAGE_NAMES[s.page] ?? "Page"} section`;
      const heading = s.heading?.trim();
      return heading ? `${where}: ${heading}` : where;
    }),
    ...(attractions ?? []).map((a) => `Attraction: ${a.name}`),
    ...(attractionImages ?? []).map(
      (a) => `Attraction photo: ${a.attractions?.name ?? "unnamed"}`,
    ),
    ...(gallery ?? []).map(() => "Gallery image"),
    ...(settings ?? []).map(() => "Social sharing image (Contact & settings)"),
  ];
  // Each place once, with a count when it repeats ("Gallery image (3)").
  const counts = new Map<string, number>();
  for (const label of labels) counts.set(label, (counts.get(label) ?? 0) + 1);
  return [...counts].map(([label, n]) => (n > 1 ? `${label} (${n})` : label));
}

/**
 * Deletes a photo. The database row goes first: while anything still points at
 * it the database refuses (`MediaInUseError`, nothing is touched). Only then
 * are the files removed from storage. If that clean-up fails the photo is
 * already gone from the site, so it is logged and reported through
 * `storageCleanupFailed` rather than thrown.
 */
export async function deleteMedia(
  row: MediaRow,
): Promise<{ storageCleanupFailed: boolean }> {
  const supabase = client();
  let result: QueryResult<{ id: string; variants: unknown }[] | null>;
  try {
    result = await supabase
      .from("media")
      .delete()
      .eq("id", row.id)
      .select("id, variants");
  } catch (e) {
    throw toFriendlyError(e, { entity: ENTITY });
  }
  if (result.error) {
    if ((result.error as { code?: unknown }).code === "23503") {
      let usedBy: string[] = [];
      try {
        usedBy = await findMediaUsage(row.id);
      } catch {
        // Still in use; we just cannot say where.
      }
      throw new MediaInUseError(usedBy);
    }
    throw toFriendlyError(result.error, { entity: ENTITY });
  }
  if (!result.data || result.data.length === 0) throw noRowsError();

  // What the database says it deleted is authoritative; the copy held by the
  // page may be stale.
  const deleted = result.data[0].variants;
  const paths =
    typeof deleted === "object" && deleted !== null && !Array.isArray(deleted)
      ? Object.values(deleted).filter((p): p is string => typeof p === "string")
      : [];
  return { storageCleanupFailed: !(await removeObjects(paths)) };
}
