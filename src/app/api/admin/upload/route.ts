import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth/admin";
import {
  createSupabaseServerClient,
  createSupabaseServiceClient,
} from "@/lib/supabase/server";

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5 MB
const MEDIA_BUCKET = "pastcraft-media";

const ALLOWED_MIME_TYPES = new Map<string, string>([
  ["image/png", "png"],
  ["image/jpeg", "jpg"],
  ["image/webp", "webp"],
  ["image/gif", "gif"],
]);

export function detectImageSignature(bytes: Uint8Array): string | null {
  if (bytes.length < 12) return null;

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return "image/png";
  }

  // JPEG: FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }

  // GIF: GIF87a / GIF89a
  if (
    bytes[0] === 0x47 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x38
  ) {
    return "image/gif";
  }

  // WebP: RIFF....WEBP
  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image/webp";
  }

  return null;
}

export async function POST(request: Request) {
  const auth = await requireAdminApi({ scope: "upload" });
  if (!auth.ok) return auth.response;

  try {
    const formData = await request.formData();
    const entry = formData.get("file");

    if (!(entry instanceof File)) {
      return NextResponse.json(
        { error: "Image file is required." },
        { status: 400 }
      );
    }

    if (entry.size <= 0 || entry.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        { error: "Image file must be between 1 byte and 5 MB." },
        { status: 400 }
      );
    }

    const declaredMime = entry.type.toLowerCase();
    if (!ALLOWED_MIME_TYPES.has(declaredMime)) {
      return NextResponse.json(
        { error: "Only PNG, JPEG, WebP, and GIF images are supported." },
        { status: 400 }
      );
    }

    const arrayBuffer = await entry.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    const detectedMime = detectImageSignature(bytes);

    if (!detectedMime || detectedMime !== declaredMime) {
      return NextResponse.json(
        { error: "File contents do not match a valid supported image format." },
        { status: 400 }
      );
    }

    const supabase =
      createSupabaseServiceClient() ?? (await createSupabaseServerClient());

    if (!supabase) {
      return NextResponse.json(
        {
          error:
            "Image upload storage is unavailable until Supabase is configured. Paste an https:// image URL directly instead.",
        },
        { status: 503 }
      );
    }

    const ext = ALLOWED_MIME_TYPES.get(detectedMime) ?? "png";
    const objectPath = `timeline/${Date.now()}-${randomUUID()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from(MEDIA_BUCKET)
      .upload(objectPath, bytes, {
        contentType: detectedMime,
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json(
        {
          error: `Upload failed: ${uploadError.message}. Paste an https:// image URL or verify the '${MEDIA_BUCKET}' storage bucket exists.`,
        },
        { status: 502 }
      );
    }

    const { data: publicUrlData } = supabase.storage
      .from(MEDIA_BUCKET)
      .getPublicUrl(objectPath);

    return NextResponse.json({ url: publicUrlData.publicUrl }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Failed to process image upload." },
      { status: 500 }
    );
  }
}
