import { supabase } from "@/integrations/supabase/client";

export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;
export const FRIENDLY_UPLOAD_ERROR =
  "That didn't upload. You can skip this and add it later from your dashboard.";

const MAX_EDGE = 1024;

/**
 * Draw the file to a canvas and re-export it small and clean as PNG.
 * Solves HEIC, huge phone photos and odd formats in one step.
 * Returns null when the browser cannot decode the file, so callers
 * can fall back to the original bytes.
 */
export async function normaliseImage(file: File): Promise<File | null> {
  // SVG goes through untouched: canvas would rasterise it and it is already tiny.
  if (file.type === "image/svg+xml" || /\.svg$/i.test(file.name)) return file;

  const url = URL.createObjectURL(file);
  try {
    const bitmap = await new Promise<ImageBitmap | HTMLImageElement>((resolve, reject) => {
      if (typeof createImageBitmap === "function") {
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

    const w = "width" in bitmap ? bitmap.width : 0;
    const h = "height" in bitmap ? bitmap.height : 0;
    if (!w || !h) return null;

    const scale = Math.min(1, MAX_EDGE / Math.max(w, h));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(w * scale));
    canvas.height = Math.max(1, Math.round(h * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(bitmap as CanvasImageSource, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!blob) return null;
    return new File([blob], "image.png", { type: "image/png" });
  } catch (err) {
    console.error("[imageUpload] canvas normalise failed, using original file", err);
    return null;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function extFor(file: File) {
  if (file.type === "image/svg+xml" || /\.svg$/i.test(file.name)) return "svg";
  if (file.type === "image/png") return "png";
  const raw = (file.name.split(".").pop() || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  return raw && raw.length <= 5 ? raw : "png";
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

  const normalised = (await normaliseImage(file)) ?? file;
  const path = `${uid}/${basename}.${extFor(normalised)}`;

  const { error } = await supabase.storage.from(bucket).upload(path, normalised, {
    upsert: true,
    cacheControl: "3600",
    contentType: normalised.type || undefined,
  });

  if (error) {
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
