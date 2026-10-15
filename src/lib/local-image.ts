import "server-only";

import sharp from "sharp";

const MAX_BYTES = 8 * 1024 * 1024;
const TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function raster(buf: Buffer) {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return true;
  if (buf.length >= 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
    return true;
  }
  return buf.length >= 12 && buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP";
}

export async function compactUpload(file: File): Promise<{ bytes: Buffer } | { error: string }> {
  if (!TYPES.has(file.type) || file.size <= 0 || file.size > MAX_BYTES) {
    return { error: "Image must be a jpeg, png, or webp under 8 MB" };
  }
  const input = Buffer.from(await file.arrayBuffer());
  if (!raster(input)) return { error: "Image must be a jpeg, png, or webp under 8 MB" };
  try {
    const bytes = await sharp(input, { limitInputPixels: 20_000_000, failOn: "error", animated: false })
      .rotate()
      .resize({ width: 960, height: 640, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 72 })
      .toBuffer();
    if (bytes.length === 0) return { error: "Could not read image" };
    return { bytes };
  } catch {
    return { error: "Could not read image" };
  }
}
