import { encodeVariant, validateImageFile } from "./encodeImage";

const MB = 1024 * 1024;

function fileOfSize(name: string, type: string, bytes: number): File {
  // A File built from a sized buffer, so `size` is real without huge strings.
  return new File([new Uint8Array(bytes)], name, { type });
}

describe("validateImageFile", () => {
  it("accepts JPG, PNG and WebP", () => {
    for (const type of ["image/jpeg", "image/png", "image/webp"]) {
      expect(
        validateImageFile(new File(["x"], "a", { type }), "gallery"),
      ).toEqual({ ok: true });
    }
  });

  it("rejects HEIC and anything else with the format message", () => {
    const heic = new File(["x"], "x.heic", { type: "image/heic" });
    expect(validateImageFile(heic, "cover")).toEqual({
      ok: false,
      message: "Please choose a JPG, PNG or WebP photo.",
    });
    expect(
      validateImageFile(
        new File(["x"], "x.gif", { type: "image/gif" }),
        "gallery",
      ),
    ).toMatchObject({ ok: false });
  });

  it("rejects files over 15 MB", () => {
    const big = fileOfSize("big.jpg", "image/jpeg", 16 * MB);
    expect(validateImageFile(big, "gallery")).toEqual({
      ok: false,
      message: "That photo is larger than 15 MB. Please use a smaller version.",
    });
    const edge = fileOfSize("edge.jpg", "image/jpeg", 15 * MB);
    expect(validateImageFile(edge, "gallery")).toEqual({ ok: true });
  });

  it("rejects a small cover but lets a small gallery photo through", () => {
    const file = new File(["x"], "a.jpg", { type: "image/jpeg" });
    expect(
      validateImageFile(file, "cover", { width: 300, height: 200 }),
    ).toEqual({
      ok: false,
      message:
        "This photo is too small for a large image (at least 800 px wide is needed).",
    });
    expect(
      validateImageFile(file, "gallery", { width: 300, height: 200 }),
    ).toEqual({ ok: true });
  });

  it("measures a cover by its long edge", () => {
    const file = new File(["x"], "a.jpg", { type: "image/jpeg" });
    expect(
      validateImageFile(file, "cover", { width: 600, height: 800 }),
    ).toEqual({ ok: true });
    expect(
      validateImageFile(file, "cover", { width: 799, height: 799 }),
    ).toMatchObject({ ok: false });
  });
});

type BlobCall = { type: string | undefined; quality: number | undefined };

function fakeCanvas(results: Array<Blob | null>) {
  const calls: BlobCall[] = [];
  const canvas = {
    width: 0,
    height: 0,
    getContext: () => ({
      drawImage: () => {},
      imageSmoothingQuality: "low",
    }),
    toBlob: (
      cb: (blob: Blob | null) => void,
      type?: string,
      quality?: number,
    ) => {
      calls.push({ type, quality });
      cb(results.shift() ?? null);
    },
  };
  return { canvas: canvas as unknown as HTMLCanvasElement, calls };
}

const bitmap = { width: 3000, height: 2000 } as ImageBitmap;

describe("encodeVariant", () => {
  it("scales to the width and encodes WebP at 0.8", async () => {
    const webp = new Blob(["w"], { type: "image/webp" });
    const { canvas, calls } = fakeCanvas([webp]);
    const out = await encodeVariant(bitmap, 960, {
      createCanvas: () => canvas,
    });
    expect(out).toEqual({ blob: webp, ext: "webp" });
    expect(canvas.width).toBe(960);
    expect(canvas.height).toBe(640);
    expect(calls).toEqual([{ type: "image/webp", quality: 0.8 }]);
  });

  it("re-encodes as JPEG at 0.82 when the browser answers PNG (Safari)", async () => {
    const png = new Blob(["p"], { type: "image/png" });
    const jpeg = new Blob(["j"], { type: "image/jpeg" });
    const { canvas, calls } = fakeCanvas([png, jpeg]);
    const out = await encodeVariant(bitmap, 480, {
      createCanvas: () => canvas,
    });
    expect(out).toEqual({ blob: jpeg, ext: "jpg" });
    expect(calls).toEqual([
      { type: "image/webp", quality: 0.8 },
      { type: "image/jpeg", quality: 0.82 },
    ]);
  });

  it("honours a lower quality for a second attempt", async () => {
    const webp = new Blob(["w"], { type: "image/webp" });
    const { canvas, calls } = fakeCanvas([webp]);
    await encodeVariant(bitmap, 480, {
      createCanvas: () => canvas,
      quality: 0.6,
    });
    expect(calls[0].quality).toBe(0.6);
  });

  it("fails when the browser cannot encode at all", async () => {
    const { canvas } = fakeCanvas([null]);
    await expect(
      encodeVariant(bitmap, 480, { createCanvas: () => canvas }),
    ).rejects.toThrow();
  });
});
