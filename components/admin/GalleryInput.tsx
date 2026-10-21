"use client";

import {
  ArrowLeft,
  ArrowRight,
  ImageUp,
  Link2,
  Plus,
  Trash2,
  Video,
} from "lucide-react";
import { useRef, useState } from "react";

import { Button, IconButton, Input } from "@/components/admin/ui";
import {
  DEFAULT_UPLOAD_FOLDER,
  IMAGE_MIME_TYPES,
  MAX_GALLERY_IMAGES,
  uploadMediaFile,
  VIDEO_HOST,
  VIDEO_MIME_TYPES,
  isVideoUrl,
  type UploadFolder,
} from "@/lib/upload";

/**
 * Editor for the extra media of a product.
 *
 * The main image stays in its own field; this one holds the gallery that is
 * shown next to it on the product detail page. The value is a plain list of
 * URLs — images and videos mixed — so nothing downstream has to know how the
 * files were added.
 */
export function GalleryInput({
  label = "Gallery",
  hint,
  value,
  onChange,
  folder = DEFAULT_UPLOAD_FOLDER,
}: {
  label?: string;
  hint?: string;
  value: string[];
  onChange: (urls: string[]) => void;
  folder?: UploadFolder;
}) {
  const pickerRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [pasted, setPasted] = useState("");

  const full = value.length >= MAX_GALLERY_IMAGES;

  async function send(file: File) {
    if (full) {
      setError(
        `A product can hold at most ${MAX_GALLERY_IMAGES} gallery items.`,
      );

      return;
    }

    setUploading(true);
    setError("");

    const result = await uploadMediaFile(file, folder);

    setUploading(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    onChange([...value, result.url]);
  }

  function addPasted() {
    const url = pasted.trim();

    if (!url) return;

    if (full) {
      setError(
        `A product can hold at most ${MAX_GALLERY_IMAGES} gallery items.`,
      );

      return;
    }

    /* A hosted player cannot be played from a gallery tile, so the link has
       to point at the video file itself. */
    if (VIDEO_HOST.test(url)) {
      setError(
        "Paste a direct link to the video file (.mp4 or .webm), not a YouTube or Vimeo page.",
      );

      return;
    }

    onChange([...value, url]);
    setPasted("");
    setError("");
  }

  function move(index: number, offset: number) {
    const target = index + offset;

    if (target < 0 || target >= value.length) return;

    const next = [...value];
    const [row] = next.splice(index, 1);

    next.splice(target, 0, row);

    onChange(next);
  }

  return (
    <div>
      <span className="field-label">{label}</span>

      {value.length > 0 && (
        <ul className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
          {value.map((url, index) => (
            <li
              key={`${url}-${index}`}
              className="group relative overflow-hidden rounded-md border border-line bg-panel"
            >
              <div className="aspect-square w-full">
                {isVideoUrl(url) ? (
                  <div className="grid size-full place-items-center bg-sunken">
                    <span className="flex flex-col items-center gap-1 text-subtle">
                      <Video className="size-5" aria-hidden="true" />

                      <span className="text-[10px] tracking-widest">
                        VIDEO
                      </span>
                    </span>
                  </div>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={url}
                    alt=""
                    className="size-full object-cover"
                  />
                )}
              </div>

              <div className="flex items-center justify-between gap-1 border-t border-line px-1 py-1">
                <IconButton
                  label="Move gallery item left"
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                >
                  <ArrowLeft className="size-3.5" aria-hidden="true" />
                </IconButton>

                <span className="cell-muted text-xs">
                  {index + 1}/{value.length}
                </span>

                <IconButton
                  label="Move gallery item right"
                  disabled={index === value.length - 1}
                  onClick={() => move(index, 1)}
                >
                  <ArrowRight className="size-3.5" aria-hidden="true" />
                </IconButton>

                <IconButton
                  label="Remove gallery item"
                  onClick={() =>
                    onChange(value.filter((_, row) => row !== index))
                  }
                >
                  <Trash2
                    className="size-3.5 text-danger"
                    aria-hidden="true"
                  />
                </IconButton>
              </div>
            </li>
          ))}
        </ul>
      )}

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
        className="mt-2 flex items-center gap-3 rounded-lg border border-line bg-sunken p-3 transition-colors data-[dragging=true]:border-accent"
      >
        <div className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-md border border-line bg-panel">
          <ImageUp className="size-5 text-subtle" aria-hidden="true" />
        </div>

        <div className="min-w-0 flex-1">
          <p className="cell-strong truncate text-sm">
            {uploading ? "Uploading…" : "Drop images or videos here"}
          </p>

          <p className="cell-muted text-xs">
            {value.length}/{MAX_GALLERY_IMAGES} items · JPEG, PNG, WebP, AVIF,
            GIF or MP4, WebM, MOV
          </p>
        </div>

        <Button
          type="button"
          loading={uploading}
          disabled={full}
          onClick={() => pickerRef.current?.click()}
        >
          <Plus className="size-4" aria-hidden="true" />
          Add media
        </Button>

        <input
          ref={pickerRef}
          type="file"
          accept={[...IMAGE_MIME_TYPES, ...VIDEO_MIME_TYPES].join(",")}
          onChange={(event) => {
            const file = event.target.files?.[0];

            event.target.value = "";

            if (file) void send(file);
          }}
          className="hidden"
          tabIndex={-1}
          aria-hidden="true"
        />
      </div>

      <div className="mt-2 flex items-end gap-2">
        <Input
          label="…or paste an image or video URL"
          value={pasted}
          placeholder="https://…"
          onChange={(event) => setPasted(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              addPasted();
            }
          }}
        />

        <Button type="button" disabled={full} onClick={addPasted}>
          <Link2 className="size-4" aria-hidden="true" />
          Add
        </Button>
      </div>

      {hint && <p className="field-hint mt-1">{hint}</p>}

      {error && <span className="field-error">{error}</span>}
    </div>
  );
}
