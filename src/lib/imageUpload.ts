import { supabase } from "@/integrations/supabase/client";
import { reportFailure } from "@/lib/reportFailure";

export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;
export const FRIENDLY_UPLOAD_ERROR =
  "That didn't upload. You can skip this and add it later from your dashboard.";

const MAX_EDGE = 1024;
const MAX_RESULT_BYTES = 2_000_000;
const RASTER_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

/**
 * Draw the file to a canvas and re-export it as a bounded raster image.
 * Solves HEIC, huge phone photos and odd formats in one step.
 * Returns null when the browser cannot decode the file, so callers
 * can fall back only to small supported raster files.
 */
export async function normaliseImage(file: File): Promise<File | null> {
  const isSvg = file.type === "image/svg+xml" || /\.svg$/i.test(file.name);
  const url = URL.createObjectURL(file);
  let decoded: ImageBitmap | HTMLImageElement | undefined;
  try {
    const bitmap = await new Promise<ImageBitmap | HTMLImageElement>((resolve, reject) => {
      if (!isSvg && typeof createImageBitmap === "function") {
        createImageBitmap(file).then(resolve, () => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = reject;
          img.src = url;
        });
        return;
      }
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = url;
    });

    decoded = bitmap;
    const w = bitmap.width || (isSvg ? 512 : 0);
    const h = bitmap.height || (isSvg ? 512 : 0);
    if (!w || !h) return null;

    const scale = Math.min(1, MAX_EDGE / Math.max(w, h));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(w * scale));
    canvas.height = Math.max(1, Math.round(h * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    while (true) {
      ctx.drawImage(bitmap as CanvasImageSource, 0, 0, canvas.width, canvas.height);
      for (const type of ["image/png", "image/webp"]) {
        const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, type === "image/webp" ? 0.9 : undefined));
        if (blob && RASTER_TYPES.has(blob.type) && blob.size < MAX_RESULT_BYTES) {
          const result = new File([blob], "image", { type: blob.type });
          return new File([result], `image.${extFor(result)}`, { type: result.type });
        }
      }
      const longest = Math.max(canvas.width, canvas.height);
      if (longest <= 256) return null;
      const shrink = Math.max(256, Math.floor(longest / 2)) / longest;
      canvas.width = Math.max(1, Math.round(canvas.width * shrink));
      canvas.height = Math.max(1, Math.round(canvas.height * shrink));
    }
  } catch (err) {
    console.error("[imageUpload] canvas normalise failed", err);
    return null;
  } finally {
    if (decoded && "close" in decoded) decoded.close();
    URL.revokeObjectURL(url);
  }
}

function extFor(file: File) {
  if (file.type === "image/webp") return "webp";
  if (file.type === "image/jpeg") return "jpg";
  return "png";
}

/**
 * Upload an image into `${auth.uid()}/<basename>.<ext>`.
 * The uid prefix is what the storage RLS policies require, and we read it from the
 * live session (not cached React state) so the path always matches auth.uid().
 */
export async function uploadUserImage(
  bucket: string,
  basename: string,
  file: File,
): Promise<{ publicUrl: string; path: string } | { error: string }> {
  const { data: sessionData } = await supabase.auth.getSession();
  const uid = sessionData.session?.user?.id;
  if (!uid) {
    console.error("[imageUpload] no active session, cannot build an RLS-compliant path");
    return { error: "Your session expired. Please sign in again to upload." };
  }

  const normalised = (await normaliseImage(file)) ??
    (RASTER_TYPES.has(file.type) && file.size < MAX_RESULT_BYTES ? file : null);
  if (!normalised) {
    reportFailure("image_upload", { error: { message: "Could not read that image", code: "image_decode" } });
    return { error: "We couldn't read that image. Please try a PNG or JPG." };
  }
  const path = `${uid}/${basename}.${extFor(normalised)}`;

  const { error } = await supabase.storage.from(bucket).upload(path, normalised, {
    upsert: true,
    cacheControl: "3600",
    contentType: normalised.type || undefined,
  });

  if (error) {
    reportFailure("image_upload", { error });
    console.error("[imageUpload] storage upload failed", { bucket, path, error });
    return { error: FRIENDLY_UPLOAD_ERROR };
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return { publicUrl: `${data.publicUrl}?v=${Date.now()}`, path };
}

export async function deleteUserImage(bucket: string, path: string) {
  const { error } = await supabase.storage.from(bucket).remove([path]);
  if (error) console.error("[imageUpload] storage delete failed", { bucket, path, error });
  return !error;
}
