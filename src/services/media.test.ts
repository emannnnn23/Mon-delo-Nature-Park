import type { MediaRow } from "~/types/db-helpers";
import { AdminError } from "~/services/admin/errors";

import {
  MediaInUseError,
  deleteMedia,
  findMediaUsage,
  listMedia,
  updateMedia,
  uploadImage,
} from "./media";

type Call = { table: string; op: string; args: unknown[] };
type Result = { data: unknown; error: unknown };

/** Fake of the supabase-js query builder plus Storage, recording every call. */
const fake = vi.hoisted(() => {
  const state = {
    calls: [] as Call[],
    results: {} as Record<string, Result[]>,
    uploads: [] as Array<{
      path: string;
      blob: Blob;
      options: Record<string, unknown>;
    }>,
    uploadResults: [] as Array<{ error: unknown }>,
    removed: [] as string[][],
    removeResult: { error: null } as { error: unknown },
    configured: true,
  };
  function builder(table: string) {
    const b: Record<string, unknown> = {};
    for (const op of [
      "select",
      "insert",
      "update",
      "delete",
      "eq",
      "order",
      "single",
    ]) {
      b[op] = (...args: unknown[]) => {
        state.calls.push({ table, op, args });
        return b;
      };
    }
    b.then = (
      resolve: (r: Result) => unknown,
      reject: (e: unknown) => unknown,
    ) =>
      Promise.resolve(
        state.results[table]?.shift() ?? { data: [], error: null },
      ).then(resolve, reject);
    return b;
  }
  const client = {
    from: (table: string) => builder(table),
    storage: {
      from: (bucket: string) => ({
        upload: async (
          path: string,
          blob: Blob,
          options: Record<string, unknown>,
        ) => {
          state.calls.push({
            table: `storage:${bucket}`,
            op: "upload",
            args: [path],
          });
          state.uploads.push({ path, blob, options });
          return state.uploadResults.shift() ?? { error: null };
        },
        remove: async (paths: string[]) => {
          state.calls.push({
            table: `storage:${bucket}`,
            op: "remove",
            args: [paths],
          });
          state.removed.push(paths);
          return state.removeResult;
        },
      }),
    },
  };
  return { state, client };
});

vi.mock("~/lib/supabase", () => ({
  getSupabase: () => (fake.state.configured ? fake.client : null),
}));

vi.mock("~/utils/encodeImage", async (importOriginal) => {
  const actual = await importOriginal<typeof import("~/utils/encodeImage")>();
  return {
    ...actual,
    encodeVariant: vi.fn(),
  };
});
import { encodeVariant } from "~/utils/encodeImage";

const ok = (data: unknown): Result => ({ data, error: null });
const fail = (code: string, message = "raw db message"): Result => ({
  data: null,
  error: { code, message, details: "raw details" },
});
const queue = (table: string, ...results: Result[]) => {
  fake.state.results[table] = results;
};

const bitmap = { width: 3000, height: 2000, close: vi.fn() };

function jpeg(name = "Blue Lagoon.JPG") {
  return new File([new Uint8Array(10)], name, { type: "image/jpeg" });
}

function mediaRow(overrides: Partial<MediaRow> = {}): MediaRow {
  return {
    id: "m1",
    storage_base_path: "2026/blue-lagoon-ab12cd",
    alt_text: "Blue lagoon",
    width: 3000,
    height: 2000,
    variants: {
      "480": "2026/blue-lagoon-ab12cd-480.webp",
      "960": "2026/blue-lagoon-ab12cd-960.webp",
    },
    focal_x: 50,
    focal_y: 50,
    original_filename: "Blue Lagoon.JPG",
    created_at: "2026-11-23T00:00:00Z",
    updated_at: "2026-11-23T00:00:00Z",
    ...overrides,
  };
}

beforeEach(() => {
  fake.state.calls = [];
  fake.state.results = {};
  fake.state.uploads = [];
  fake.state.uploadResults = [];
  fake.state.removed = [];
  fake.state.removeResult = { error: null };
  fake.state.configured = true;
  bitmap.close.mockClear();
  vi.mocked(encodeVariant).mockReset();
  vi.mocked(encodeVariant).mockImplementation(async (_bitmap, width) => ({
    blob: new Blob([`w${width}`], { type: "image/webp" }),
    ext: "webp",
  }));
  vi.stubGlobal(
    "createImageBitmap",
    vi.fn(async () => bitmap),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const insertCall = () =>
  fake.state.calls.find((c) => c.table === "media" && c.op === "insert");

describe("uploadImage", () => {
  it("encodes each planned width, uploads it, then inserts the media row", async () => {
    const row = mediaRow();
    queue("media", ok(row));
    const result = await uploadImage(
      jpeg("IMG_4821 Maria Santos.JPG"),
      "  Blue lagoon  ",
      "gallery",
    );

    expect(result).toBe(row);
    expect(fake.state.uploads).toHaveLength(4);
    const year = new Date().getFullYear();
    for (const [i, width] of [480, 960, 1600, 2400].entries()) {
      const upload = fake.state.uploads[i];
      expect(upload.path).toMatch(
        new RegExp(`^${year}/blue-lagoon-[a-z0-9]{6}-${width}\\.webp$`),
      );
      expect(upload.options).toEqual({
        contentType: "image/webp",
        cacheControl: "31536000",
        upsert: false,
      });
    }

    const values = insertCall()?.args[0] as Record<string, unknown>;
    const base = values.storage_base_path as string;
    expect(base).toMatch(new RegExp(`^${year}/blue-lagoon-[a-z0-9]{6}$`));
    expect(values.variants).toEqual({
      "480": `${base}-480.webp`,
      "960": `${base}-960.webp`,
      "1600": `${base}-1600.webp`,
      "2400": `${base}-2400.webp`,
    });
    expect(values).toMatchObject({
      width: 3000,
      height: 2000,
      alt_text: "Blue lagoon",
      original_filename: null,
    });
    expect(
      JSON.stringify([...fake.state.uploads.map((u) => u.path), values]),
    ).not.toMatch(/maria|santos|img_4821|img-4821/i);
    expect(bitmap.close).toHaveBeenCalled();
    expect(fake.state.removed).toEqual([]);
  });

  it("names the stored files after the description, not the file name", async () => {
    queue("media", ok(mediaRow()));
    await uploadImage(
      jpeg("DSC 0042 juan.jpg"),
      "Sunrise at the falls",
      "gallery",
    );
    expect(fake.state.uploads[0].path).toMatch(
      /^\d{4}\/sunrise-at-the-falls-[a-z0-9]{6}-480\.webp$/,
    );
  });

  it("falls back to the file name words only when the description has no usable letters", async () => {
    queue("media", ok(mediaRow()));
    await uploadImage(jpeg("blue_lagoon.jpg"), "湖の景色", "gallery");
    expect(fake.state.uploads[0].path).toMatch(
      /^\d{4}\/blue-lagoon-[a-z0-9]{6}-480\.webp$/,
    );
    const values = insertCall()?.args[0] as Record<string, unknown>;
    expect(values.original_filename).toBeNull();
  });

  it("uses the .jpg extension in the key when the browser fell back to JPEG", async () => {
    vi.mocked(encodeVariant).mockResolvedValue({
      blob: new Blob(["j"], { type: "image/jpeg" }),
      ext: "jpg",
    });
    queue("media", ok(mediaRow()));
    await uploadImage(jpeg(), "Blue lagoon", "gallery");
    expect(fake.state.uploads[0].path).toMatch(/-480\.jpg$/);
    expect(fake.state.uploads[0].options.contentType).toBe("image/jpeg");
  });

  it("removes what was already uploaded when a later upload fails", async () => {
    fake.state.uploadResults = [
      { error: null },
      { error: null },
      { error: { message: "boom", statusCode: "500" } },
    ];
    const attempt = uploadImage(jpeg(), "Blue lagoon", "gallery");
    await expect(attempt).rejects.toBeInstanceOf(AdminError);
    await expect(attempt).rejects.not.toHaveProperty("friendly", "boom");

    const uploaded = fake.state.uploads.slice(0, 2).map((u) => u.path);
    expect(fake.state.removed).toEqual([uploaded]);
    expect(insertCall()).toBeUndefined();
    expect(bitmap.close).toHaveBeenCalled();
  });

  it("removes every uploaded file when the row insert fails", async () => {
    queue("media", fail("23514"));
    await expect(
      uploadImage(jpeg(), "Blue lagoon", "gallery"),
    ).rejects.toBeInstanceOf(AdminError);
    expect(fake.state.removed).toEqual([fake.state.uploads.map((u) => u.path)]);
  });

  it("re-encodes a too-large width once at lower quality", async () => {
    const big = new Blob([new Uint8Array(5 * 1024 * 1024 + 1)], {
      type: "image/webp",
    });
    const small = new Blob(["s"], { type: "image/webp" });
    vi.mocked(encodeVariant).mockResolvedValueOnce({ blob: big, ext: "webp" });
    vi.mocked(encodeVariant).mockResolvedValueOnce({
      blob: small,
      ext: "webp",
    });
    queue("media", ok(mediaRow()));
    await uploadImage(jpeg(), "Blue lagoon", "gallery");
    const [first, second] = vi.mocked(encodeVariant).mock.calls;
    expect(first[1]).toBe(480);
    expect(second[1]).toBe(480);
    expect((second[2] as { quality?: number }).quality).toBeLessThan(0.8);
    expect(fake.state.uploads[0].blob).toBe(small);
  });

  it("fails with a friendly message when a width is still too large", async () => {
    const big = new Blob([new Uint8Array(5 * 1024 * 1024 + 1)], {
      type: "image/webp",
    });
    vi.mocked(encodeVariant).mockResolvedValue({ blob: big, ext: "webp" });
    await expect(
      uploadImage(jpeg(), "Blue lagoon", "gallery"),
    ).rejects.toMatchObject({
      friendly: expect.stringMatching(/too large|smaller/i),
    });
    expect(fake.state.uploads).toHaveLength(0);
    expect(insertCall()).toBeUndefined();
  });

  it("rejects an invalid file before decoding it", async () => {
    const heic = new File(["x"], "a.heic", { type: "image/heic" });
    await expect(uploadImage(heic, "Alt", "gallery")).rejects.toMatchObject({
      friendly: "Please choose a JPG, PNG or WebP photo.",
    });
    expect(createImageBitmap).not.toHaveBeenCalled();
  });

  it("rejects a small cover after measuring it", async () => {
    vi.stubGlobal(
      "createImageBitmap",
      vi.fn(async () => ({ width: 300, height: 200, close: vi.fn() })),
    );
    await expect(uploadImage(jpeg(), "Alt", "cover")).rejects.toMatchObject({
      friendly: expect.stringContaining("at least 800 px"),
    });
    expect(fake.state.uploads).toHaveLength(0);
  });

  it("requires alt text", async () => {
    await expect(uploadImage(jpeg(), "   ", "gallery")).rejects.toBeInstanceOf(
      AdminError,
    );
    expect(createImageBitmap).not.toHaveBeenCalled();
  });

  it("retries without options when the browser rejects imageOrientation", async () => {
    const create = vi
      .fn()
      .mockRejectedValueOnce(new TypeError("invalid enum value"))
      .mockResolvedValueOnce(bitmap);
    vi.stubGlobal("createImageBitmap", create);
    queue("media", ok(mediaRow()));
    await expect(uploadImage(jpeg(), "Alt", "gallery")).resolves.toBeDefined();
    expect(create).toHaveBeenCalledTimes(2);
    expect(create.mock.calls[0][1]).toEqual({ imageOrientation: "from-image" });
    expect(create.mock.calls[1]).toHaveLength(1);
  });

  it("does not retry for other decode errors", async () => {
    const create = vi.fn(async () => {
      throw new Error("decode failed");
    });
    vi.stubGlobal("createImageBitmap", create);
    await expect(uploadImage(jpeg(), "Alt", "gallery")).rejects.toBeInstanceOf(
      AdminError,
    );
    expect(create).toHaveBeenCalledTimes(1);
  });

  it("says so when the photo cannot be read", async () => {
    vi.stubGlobal(
      "createImageBitmap",
      vi.fn(async () => {
        throw new Error("decode failed");
      }),
    );
    await expect(uploadImage(jpeg(), "Alt", "gallery")).rejects.toMatchObject({
      friendly: expect.stringMatching(/open|read/i),
    });
  });

  it("reports progress after each size", async () => {
    queue("media", ok(mediaRow()));
    const seen: Array<[number, number]> = [];
    await uploadImage(jpeg(), "Alt", "gallery", (done, total) =>
      seen.push([done, total]),
    );
    expect(seen).toEqual([
      [0, 4],
      [1, 4],
      [2, 4],
      [3, 4],
      [4, 4],
    ]);
  });
});

describe("updateMedia", () => {
  it("writes trimmed alt text and clamped, rounded focal values", async () => {
    queue("media", ok([mediaRow()]));
    await updateMedia("m1", {
      altText: "  New alt ",
      focalX: 120,
      focalY: 33.4,
    });
    const update = fake.state.calls.find((c) => c.op === "update");
    expect(update?.args[0]).toEqual({
      alt_text: "New alt",
      focal_x: 100,
      focal_y: 33,
    });
  });

  it("only sends what changed", async () => {
    queue("media", ok([mediaRow()]));
    await updateMedia("m1", { focalX: 10 });
    expect(fake.state.calls.find((c) => c.op === "update")?.args[0]).toEqual({
      focal_x: 10,
    });
  });

  it("refuses blank alt text", async () => {
    await expect(updateMedia("m1", { altText: "  " })).rejects.toBeInstanceOf(
      AdminError,
    );
    expect(fake.state.calls).toEqual([]);
  });

  it("treats an update that touched no row as an expired session", async () => {
    queue("media", ok([]));
    await expect(updateMedia("m1", { focalX: 1 })).rejects.toMatchObject({
      code: "NO_ROWS",
    });
  });
});

describe("listMedia", () => {
  it("lists newest first", async () => {
    const rows = [mediaRow()];
    queue("media", ok(rows));
    await expect(listMedia()).resolves.toEqual(rows);
    expect(fake.state.calls.find((c) => c.op === "order")?.args).toEqual([
      "created_at",
      { ascending: false },
    ]);
  });

  it("maps errors through the friendly layer", async () => {
    queue("media", fail("42501"));
    await expect(listMedia()).rejects.toMatchObject({
      friendly: expect.stringContaining("session has expired"),
    });
  });
});

describe("findMediaUsage", () => {
  it("labels every place the photo is used", async () => {
    queue(
      "page_sections",
      ok([{ key: "hero", heading: "Welcome", page: "home" }]),
    );
    queue("attractions", ok([{ name: "Scenic Views" }]));
    queue("attraction_images", ok([{ attractions: { name: "Blue Lagoon" } }]));
    queue("gallery_images", ok([{ id: "g1" }, { id: "g2" }]));
    queue("site_settings", ok([{ id: "s1" }]));
    const usage = await findMediaUsage("m1");
    expect(usage).toEqual([
      "Home page section: Welcome",
      "Attraction: Scenic Views",
      "Attraction photo: Blue Lagoon",
      "Gallery image (2)",
      "Social sharing image (Contact & settings)",
    ]);
  });

  it("names the page, never an internal key, and counts repeats", async () => {
    queue(
      "page_sections",
      ok([
        { key: "hero", heading: null, page: "about" },
        { key: "story", heading: "  ", page: "about" },
        { key: "map", heading: "Find us", page: "visit" },
      ]),
    );
    queue(
      "attraction_images",
      ok([
        { attractions: { name: "Blue Lagoon" } },
        { attractions: { name: "Blue Lagoon" } },
        { attractions: { name: "Blue Lagoon" } },
      ]),
    );
    const usage = await findMediaUsage("m1");
    expect(usage).toEqual([
      "About page section (2)",
      "Visit page section: Find us",
      "Attraction photo: Blue Lagoon (3)",
    ]);
    expect(usage.join(" ")).not.toMatch(/hero|story/);
  });

  it("is empty when nothing uses it", async () => {
    await expect(findMediaUsage("m1")).resolves.toEqual([]);
  });
});

describe("deleteMedia", () => {
  it("throws MediaInUseError and keeps the files when the photo is in use", async () => {
    queue("media", fail("23503"));
    queue("attractions", ok([{ name: "Scenic Views" }]));
    const attempt = deleteMedia(mediaRow());
    await expect(attempt).rejects.toBeInstanceOf(MediaInUseError);
    await expect(attempt).rejects.toMatchObject({
      usedBy: ["Attraction: Scenic Views"],
      friendly: "This photo is used by: Attraction: Scenic Views",
    });
    expect(fake.state.removed).toEqual([]);
  });

  it("deletes the row first, then removes every variant file", async () => {
    queue("media", ok([{ id: "m1", variants: mediaRow().variants }]));
    const row = mediaRow();
    await expect(deleteMedia(row)).resolves.toEqual({
      storageCleanupFailed: false,
    });
    const order = fake.state.calls
      .filter((c) => c.op === "delete" || c.op === "remove")
      .map((c) => c.op);
    expect(order).toEqual(["delete", "remove"]);
    expect(fake.state.removed).toEqual([Object.values(row.variants)]);
  });

  it("removes the paths the database returns, not the ones the client holds", async () => {
    const stored = {
      "480": "2026/real-aaaaaa-480.webp",
      "960": "2026/real-aaaaaa-960.webp",
    };
    queue("media", ok([{ id: "m1", variants: stored }]));
    // A stale or tampered client copy must not decide what is deleted.
    const stale = mediaRow({ variants: { "480": "2026/other-file.webp" } });
    await deleteMedia(stale);
    expect(fake.state.removed).toEqual([Object.values(stored)]);
    const del = fake.state.calls.find((c) => c.op === "select");
    expect(del?.args).toEqual(["id, variants"]);
  });

  it("reports (does not throw) when the files cannot be removed after the row is gone", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    queue("media", ok([{ id: "m1", variants: mediaRow().variants }]));
    fake.state.removeResult = { error: { message: "nope" } };
    await expect(deleteMedia(mediaRow())).resolves.toEqual({
      storageCleanupFailed: true,
    });
    expect(log).toHaveBeenCalled();
  });

  it("treats a delete that touched no row as an expired session", async () => {
    queue("media", ok([]));
    await expect(deleteMedia(mediaRow())).rejects.toMatchObject({
      code: "NO_ROWS",
    });
    expect(fake.state.removed).toEqual([]);
  });

  it("maps other database errors and leaves the files alone", async () => {
    queue("media", fail("XX000"));
    await expect(deleteMedia(mediaRow())).rejects.toBeInstanceOf(AdminError);
    expect(fake.state.removed).toEqual([]);
  });
});
