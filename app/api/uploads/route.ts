import { authenticateAdmin, unauthorized } from "@/lib/admin-session";
import {
  isCloudinaryConfigured,
  uploadErrorMessage,
  uploadImage,
} from "@/lib/cloudinary";
import { badRequest } from "@/lib/products";
import { resolveFolder, validateImage } from "@/lib/upload";

export const runtime = "nodejs";

/**
 * Single entry point for every admin image upload. The browser posts the file
 * as multipart form data and gets back the generated Cloudinary link, which the
 * forms then store as a plain URL — the same column a hand pasted link used to
 * fill, so nothing downstream needs to know uploads exist.
 */
export async function POST(request: Request) {
  if (!(await authenticateAdmin(request))) return unauthorized();

  if (!isCloudinaryConfigured()) {
    return Response.json(
      {
        errors: [
          "Image uploads are not configured. Add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET to your .env file.",
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

  const invalid = validateImage(file);

  if (invalid) return badRequest([invalid]);

  try {
    const image = await uploadImage(file, resolveFolder(body.get("folder")));

    return Response.json({ image }, { status: 201 });
  } catch (error) {
    return Response.json({ errors: [uploadErrorMessage(error)] }, {
      status: 502,
    });
  }
}