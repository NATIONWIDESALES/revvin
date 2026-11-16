import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { normaliseImage, uploadUserImage } from "@/lib/imageUpload";

const mocks = vi.hoisted(() => ({ upload: vi.fn(), session: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {
  auth: { getSession: mocks.session },
  storage: { from: () => ({ upload: mocks.upload, getPublicUrl: () => ({ data: { publicUrl: "https://example.test/image" } }) }) },
} }));

function canvasExports(exportBlob: (type: string, width: number) => Blob | null) {
  const drawImage = vi.fn();
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({ drawImage } as unknown as CanvasRenderingContext2D);
  vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation(function (this: HTMLCanvasElement, cb, type) {
    cb(exportBlob(type ?? "image/png", this.width));
  });
  return drawImage;
}
const blob = (size: number, type: string) => new Blob([new Uint8Array(size)], { type });

beforeEach(() => {
  mocks.upload.mockReset().mockResolvedValue({ error: null });
  mocks.session.mockResolvedValue({ data: { session: { user: { id: "owner" } } } });
  vi.stubGlobal("URL", { createObjectURL: vi.fn(() => "blob:test"), revokeObjectURL: vi.fn() });
  vi.stubGlobal("createImageBitmap", vi.fn().mockResolvedValue({ width: 2048, height: 1024, close: vi.fn() }));
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("bounded image uploads", () => {
  it("uses WEBP at quality 0.9 when PNG is oversized, preserving the output extension", async () => {
    canvasExports(type => blob(type === "image/png" ? 2_000_000 : 1_900_000, type));
    const result = await uploadUserImage("business-logos", "logo", new File(["input"], "photo.png", { type: "image/png" }));
    expect(result).toHaveProperty("path", "owner/logo.webp");
    const [, output, options] = mocks.upload.mock.calls[0];
    expect(output.size).toBeLessThan(2_000_000);
    expect(options.contentType).toBe("image/webp");
    expect(HTMLCanvasElement.prototype.toBlob).toHaveBeenLastCalledWith(expect.any(Function), "image/webp", 0.9);
  });
  it("halves the longest edge until the export is small enough", async () => {
    const widths: number[] = [];
    canvasExports((type, width) => { widths.push(width); return blob(width > 256 ? 2_100_000 : 150_000, type); });
    const result = await normaliseImage(new File(["input"], "large.png", { type: "image/png" }));
    expect(widths).toEqual([1024, 1024, 512, 512, 256]);
    expect(result?.size).toBe(150_000);
    expect(result?.name).toBe("image.png");
  });
  it("rasterises SVG through Image at 512 square when intrinsic dimensions are absent", async () => {
    vi.stubGlobal("Image", class {
      width = 0; height = 0; onload?: () => void;
      set src(_: string) { this.onload?.(); }
    });
    const draw = canvasExports(type => blob(100, type));
    const input = new File(["<svg/>"], "logo.svg", { type: "image/svg+xml" });
    const result = await normaliseImage(input);
    expect(createImageBitmap).not.toHaveBeenCalled();
    expect(draw).toHaveBeenCalledWith(expect.any(Object), 0, 0, 512, 512);
    expect(result).not.toBe(input);
    expect(result?.type).toBe("image/png");
  });
  it("rejects undecodable non-raster input without contacting storage", async () => {
    vi.stubGlobal("createImageBitmap", vi.fn().mockRejectedValue(new Error("decode")));
    vi.stubGlobal("Image", class {
      onerror?: (error: Error) => void;
      set src(_: string) { this.onerror?.(new Error("decode")); }
    });
    expect(await uploadUserImage("avatars", "avatar", new File(["bad"], "bad.heic", { type: "image/heic" })))
      .toEqual({ error: "We couldn't read that image. Please try a PNG or JPG." });
    expect(mocks.upload).not.toHaveBeenCalled();
  });
  it.each([["image/png", "png"], ["image/jpeg", "jpg"], ["image/webp", "webp"]])("matches fallback extension for %s", async (type, ext) => {
    canvasExports(() => null);
    await uploadUserImage("avatars", "avatar", new File(["small"], "wrong.extension", { type }));
    expect(mocks.upload).toHaveBeenCalledWith(`owner/avatar.${ext}`, expect.objectContaining({ type }), expect.objectContaining({ contentType: type }));
  });
  it("never sends an oversized raster fallback", async () => {
    canvasExports(() => null);
    const result = await uploadUserImage("avatars", "avatar", new File([new Uint8Array(2_000_000)], "large.png", { type: "image/png" }));
    expect(result).toHaveProperty("error");
    expect(mocks.upload).not.toHaveBeenCalled();
  });
});