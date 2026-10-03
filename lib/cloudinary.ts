import { v2 as cloudinary } from "cloudinary";

import {
  DEFAULT_UPLOAD_FOLDER,
  type UploadedImage,
  type UploadFolder,
} from "@/lib/upload";

/**
 * Cloudinary wiring for admin uploads. Server side only — importing the SDK
 * here keeps the API secret away from the browser. The panel posts files to
 * `/api/uploads`, which forwards them through this module and returns the
 * generated `secure_url` for the forms to store as a plain URL.
 */

function requireEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is not set. Add it to your .env file.`);
  }

  return value;
}

/* `NEXT_PUBLIC_` is only a fallback for setups that created the key before the
   uploads moved server side; nothing in the browser needs it. */
function apiKey() {
  return (
    process.env.CLOUDINARY_API_KEY ??
    process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY ??
    requireEnv("CLOUDINARY_API_KEY")
  );
}

/** Lets the upload route answer with a helpful message instead of a 500. */
export function isCloudinaryConfigured() {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_SECRET &&
      (process.env.CLOUDINARY_API_KEY ||
        process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY),
  );
}

/** `cloudinary.config` mutates a module global, so only ever do it once. */
let configured = false;

function configure() {
  if (configured) return;

  cloudinary.config({
    cloud_name: requireEnv("CLOUDINARY_CLOUD_NAME"),
    api_key: apiKey(),
    api_secret: requireEnv("CLOUDINARY_API_SECRET"),
    secure: true,
  });

  configured = true;
}

export async function uploadImage(
  file: File,
  folder: UploadFolder = DEFAULT_UPLOAD_FOLDER,
): Promise<UploadedImage> {
  configure();

  const buffer = Buffer.from(await file.arrayBuffer());

  const result = await new Promise<{
    secure_url: string;
    public_id: string;
    width?: number;
    height?: number;
    bytes?: number;
    format?: string;
  }>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: "image",
        folder: `ronas-admin/${folder}`,
        /* `overwrite: false` makes Cloudinary de-duplicate by public id, so
           re-uploading the same bytes reuses the asset instead of piling up
           copies of it. */
        use_filename: true,
        unique_filename: true,
        overwrite: false,
      },
      (error, uploaded) => {
        if (error) {
          reject(error);
          return;
        }

        if (!uploaded || Array.isArray(uploaded)) {
          reject(new Error("Cloudinary returned an unexpected response."));
          return;
        }

        resolve(uploaded);
      },
    );

    stream.end(buffer);
  });

  return {
    url: result.secure_url,
    publicId: result.public_id,
    width: result.width ?? 0,
    height: result.height ?? 0,
    bytes: result.bytes ?? buffer.byteLength,
    format: result.format ?? "",
  };
}

/** Cloudinary errors are opaque; the panel shows whatever text we can salvage. */
export function uploadErrorMessage(error: unknown) {
  if (error && typeof error === "object" && "error" in error) {
    const detail = (error as { error?: { message?: unknown } }).error?.message;

    if (typeof detail === "string" && detail.trim()) return detail.trim();
  }

  if (error instanceof Error && error.message.trim()) return error.message;

  return "Cloudinary rejected the upload.";
}