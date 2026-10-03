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