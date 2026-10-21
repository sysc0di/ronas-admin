/**
 * Upload contract shared by the browser uploader and the server route.
 *
 * Kept free of any `cloudinary` import so client components can rely on the
 * same limits and folder names the API enforces.
 */

export const UPLOAD_FOLDERS = ["products", "content"] as const;

export type UploadFolder = (typeof UPLOAD_FOLDERS)[number];

export const DEFAULT_UPLOAD_FOLDER: UploadFolder = "content";

/** Comfortably above the weight of a product photo taken on a phone. */
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

/** How many extra images one product may carry on top of its main image. */
export const MAX_GALLERY_IMAGES = 12;

export const IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/gif",
] as const;

export type UploadedImage = {
  /** The HTTPS delivery URL — what gets stored in `Product.image` etc. */
  url: string;
  publicId: string;
  width: number;
  height: number;
  bytes: number;
  format: string;
};

/** Returns a message when the file cannot be uploaded, `null` when it can. */
export function validateImage(file: File) {
  if (!(IMAGE_MIME_TYPES as readonly string[]).includes(file.type)) {
    return "Choose a JPEG, PNG, WebP, AVIF or GIF image.";
  }

  if (file.size === 0) {
    return "That file is empty.";
  }

  if (file.size > MAX_IMAGE_BYTES) {
    return `Images must be ${Math.round(MAX_IMAGE_BYTES / 1024 / 1024)} MB or smaller.`;
  }

  return null;
}

/** Folders are an allowlist: the browser picks one, it never names a path. */
export function resolveFolder(value: FormDataEntryValue | null): UploadFolder {
  return typeof value === "string" &&
    (UPLOAD_FOLDERS as readonly string[]).includes(value)
    ? (value as UploadFolder)
    : DEFAULT_UPLOAD_FOLDER;
}

/**
 * Sends one file to the upload endpoint and hands back the stored image.
 *
 * Lives here so every uploader in the panel (the single image field, the
 * product gallery) posts files the same way and reports the same errors.
 */
export async function uploadImageFile(
  file: File,
  folder: UploadFolder = DEFAULT_UPLOAD_FOLDER,
): Promise<{ ok: true; image: UploadedImage } | { ok: false; error: string }> {
  /* Check before the transfer: the API enforces the same rules, but failing
     locally saves a pointless multi megabyte round trip. */
  const invalid = validateImage(file);

  if (invalid) return { ok: false, error: invalid };

  const body = new FormData();

  body.set("file", file);
  body.set("folder", folder);

  try {
    const response = await fetch("/api/uploads", { method: "POST", body });
    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      return {
        ok: false,
        error:
          Array.isArray(payload.errors) && payload.errors.length > 0
            ? payload.errors.join(" ")
            : "Upload failed.",
      };
    }

    const image = payload.image as UploadedImage | undefined;

    if (!image?.url) return { ok: false, error: "Upload failed." };

    return { ok: true, image };
  } catch {
    return { ok: false, error: "Could not reach the upload endpoint." };
  }
}