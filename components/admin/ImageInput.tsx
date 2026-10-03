"use client";

import { ImageUp, Trash2 } from "lucide-react";
import { useId, useRef, useState } from "react";

import { Button, IconButton, Input } from "@/components/admin/ui";
import {
  DEFAULT_UPLOAD_FOLDER,
  IMAGE_MIME_TYPES,
  MAX_IMAGE_BYTES,
  validateImage,
  type UploadFolder,
  type UploadedImage,
} from "@/lib/upload";

/**
 * Image field with a drop target.
 *
 * The value stays a plain URL so nothing downstream changes — tables, the
 * storefront picks, the payload parsers all keep reading a string. Uploading
 * just gives the admin a way to fill that URL in without leaving the panel, and
 * pasting an external link keeps working for anything already hosted.
 */

export function ImageInput({
  label = "Image URL",
  hint,
  value,
  onChange,
  folder = DEFAULT_UPLOAD_FOLDER,
  required = false,
  className,
}: {
  label?: string;
  hint?: string;
  value: string;
  onChange: (url: string) => void;
  folder?: UploadFolder;
  required?: boolean;
  className?: string;
}) {
  const inputId = useId();
  const pickerRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function send(file: File) {
    /* Check before the transfer: the API enforces the same rules, but failing
       locally saves a pointless multi megabyte round trip. */
    const invalid = validateImage(file);

    if (invalid) {
      setError(invalid);
      return;
    }

    setUploading(true);
    setError("");

    const body = new FormData();
    body.set("file", file);
    body.set("folder", folder);

    try {
      const response = await fetch("/api/uploads", { method: "POST", body });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(
          Array.isArray(payload.errors) && payload.errors.length > 0
            ? payload.errors.join(" ")
            : "Upload failed.",
        );
        return;
      }

      const image = payload.image as UploadedImage | undefined;

      if (!image?.url) {
        setError("Upload failed.");
        return;
      }

      onChange(image.url);
    } catch {
      setError("Could not reach the upload endpoint.");
    } finally {
      setUploading(false);
    }
  }

  /* The picker is the only way in, so reset it after every pick — otherwise
     re-selecting the same file would not fire a change event. */
  function pick(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    event.target.value = "";

    if (file) void send(file);
  }

  return (
    <div className={className}>
      <label className="field-label" htmlFor={inputId}>
        {label}
        {required && <span aria-hidden="true"> *</span>}
      </label>

      <div
        data-dragging={dragging}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={(event) => {
          /* Leave events also fire for child elements, so only reset once the
             pointer has genuinely left the zone. */
          if (
            event.relatedTarget instanceof Node &&
            event.currentTarget.contains(event.relatedTarget)
          ) {
            return;
          }

          setDragging(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);

          const file = event.dataTransfer.files?.[0];

          if (file) void send(file);
        }}
        className="flex items-center gap-3 rounded-lg border border-line bg-sunken p-3 transition-colors data-[dragging=true]:border-accent"
      >
        <div className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-md border border-line bg-panel">
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt="" className="size-full object-cover" />
          ) : (
            <ImageUp className="size-5 text-subtle" aria-hidden="true" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="cell-strong truncate text-sm">
            {uploading
              ? "Uploading…"
              : value
                ? "Image selected"
                : "Drop an image here"}
          </p>

          <p className="cell-muted text-xs">
            JPEG, PNG, WebP, AVIF or GIF, up to{" "}
            {Math.round(MAX_IMAGE_BYTES / 1024 / 1024)} MB.
          </p>
        </div>

        <Button
          type="button"
          loading={uploading}
          onClick={() => pickerRef.current?.click()}
        >
          Choose file
        </Button>

        {value && !uploading && (
          <IconButton
            label="Remove image"
            onClick={() => {
              onChange("");
              setError("");
            }}
          >
            <Trash2 className="size-4" aria-hidden="true" />
          </IconButton>
        )}

        <input
          ref={pickerRef}
          type="file"
          accept={IMAGE_MIME_TYPES.join(",")}
          onChange={pick}
          className="hidden"
          tabIndex={-1}
          aria-hidden="true"
        />
      </div>

      <div className="mt-3">
        <Input
          id={inputId}
          value={value}
          onChange={(event) => {
            onChange(event.target.value);
            setError("");
          }}
          placeholder="https://…"
          hint={hint}
        />
      </div>

      {error && <span className="field-error">{error}</span>}
    </div>
  );
}