const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 15 * 1024 * 1024;
const MIN_COVER_EDGE = 800;

export type ImagePurpose = "cover" | "gallery";
export type ImageCheck = { ok: true } | { ok: false; message: string };

/**
 * Checks a chosen file before any work is done on it. Pass `dims` (from the
 * decoded image) to also check the size in pixels: a cover needs a long edge
 * of at least 800 px. A small gallery photo is allowed; the uploader shows a
 * separate warning for it.
 */
export function validateImageFile(
  file: File,
  purpose: ImagePurpose,
  dims?: { width: number; height: number },
): ImageCheck {
  if (!ACCEPTED_TYPES.includes(file.type)) {
    return { ok: false, message: "Please choose a JPG, PNG or WebP photo." };
  }
  if (file.size > MAX_BYTES) {
    return {
      ok: false,
      message: "That photo is larger than 15 MB. Please use a smaller version.",
    };
  }
  if (
    dims &&
    purpose === "cover" &&
    Math.max(dims.width, dims.height) < MIN_COVER_EDGE
  ) {
    return {
      ok: false,
      message:
        "This photo is too small for a large image (at least 800 px wide is needed).",
    };
  }
  return { ok: true };
}

type EncodeOptions = {
  /** WebP quality, 0 to 1. Default 0.8. */
  quality?: number;
  /** Canvas factory, so tests (jsdom has no canvas) can provide a fake. */
  createCanvas?: () => HTMLCanvasElement;
};

const WEBP_QUALITY = 0.8;
const JPEG_QUALITY = 0.82;

function toBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

/**
 * Draws `bitmap` scaled to `width` (height keeps the proportions) and encodes
 * it as WebP. Re-encoding through a canvas drops all metadata, including EXIF
 * and GPS location. Browsers that cannot encode WebP (Safari) answer with a
 * PNG; that is discarded and the image is encoded as JPEG instead.
 */
export async function encodeVariant(
  bitmap: ImageBitmap,
  width: number,
  options: EncodeOptions = {},
): Promise<{ blob: Blob; ext: "webp" | "jpg" }> {
  const canvas = (
    options.createCanvas ?? (() => document.createElement("canvas"))
  )();
  canvas.width = width;
  canvas.height = Math.max(
    1,
    Math.round((bitmap.height * width) / bitmap.width),
  );
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas is not available");
  context.imageSmoothingQuality = "high";
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

  const quality = options.quality ?? WEBP_QUALITY;
  const webp = await toBlob(canvas, "image/webp", quality);
  if (webp && webp.type === "image/webp") return { blob: webp, ext: "webp" };

  const jpeg = await toBlob(
    canvas,
    "image/jpeg",
    options.quality ?? JPEG_QUALITY,
  );
  if (!jpeg) throw new Error("Could not encode the image");
  return { blob: jpeg, ext: "jpg" };
}
