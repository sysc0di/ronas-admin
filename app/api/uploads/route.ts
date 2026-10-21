import { authenticateAdmin, unauthorized } from "@/lib/admin-session";
import {
  isCloudinaryConfigured,
  uploadErrorMessage,
  uploadImage,
  uploadVideo,
} from "@/lib/cloudinary";
import { badRequest } from "@/lib/products";
import {
  resolveFolder,
  validateMedia,
  VIDEO_MIME_TYPES,
} from "@/lib/upload";

export const runtime = "nodejs";

/**
 * Single entry point for every admin upload. The browser posts the file as
 * multipart form data and gets back the generated Cloudinary link, which the
 * forms then store as a plain URL — the same column a hand pasted link used to
 * fill, so nothing downstream needs to know uploads exist.
 *
 * Images and videos take different Cloudinary resource types, so the file type
 * decides which one is used.
 */
export async function POST(request: Request) {
  if (!(await authenticateAdmin(request))) return unauthorized();

  if (!isCloudinaryConfigured()) {
    return Response.json(
      {
        errors: [
          "Uploads are not configured. Add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET to your .env file.",
        ],
      },
      { status: 503 },
    );
  }

  let body: FormData;

  try {
    body = await request.formData();
  } catch {
    return badRequest(["Body must be a multipart upload."]);
  }

  const file = body.get("file");

  if (!(file instanceof File)) {
    return badRequest(['"file" is required.']);
  }

  const invalid = validateMedia(file);

  if (invalid) return badRequest([invalid]);

  const folder = resolveFolder(body.get("folder"));

  try {
    if ((VIDEO_MIME_TYPES as readonly string[]).includes(file.type)) {
      const video = await uploadVideo(file, folder);

      return Response.json({ video }, { status: 201 });
    }

    const image = await uploadImage(file, folder);

    return Response.json({ image }, { status: 201 });
  } catch (error) {
    return Response.json({ errors: [uploadErrorMessage(error)] }, {
      status: 502,
    });
  }
}