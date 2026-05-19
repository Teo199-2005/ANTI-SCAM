/**
 * Strips near-black background, trims empty transparency, outputs public/verified.png.
 */
import sharp from "sharp";
import { existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..", "..");
const candidates = [
  join(root, "verified.png"),
  join(__dirname, "..", "public", "verified.png"),
];

const input = candidates.find((p) => existsSync(p));
if (!input) {
  console.error("verified.png not found");
  process.exit(1);
}

const output = join(__dirname, "..", "public", "verified.png");

const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width, height } = info;

for (let i = 0; i < data.length; i += 4) {
  const r = data[i];
  const g = data[i + 1];
  const b = data[i + 2];
  const lum = Math.max(r, g, b);
  if (lum < 36) {
    data[i + 3] = 0;
  } else if (lum < 72) {
    const edge = (lum - 36) / 36;
    data[i + 3] = Math.min(data[i + 3], Math.round(edge * 255));
  }
}

const meta = await sharp(data, { raw: { width, height, channels: 4 } })
  .trim({ threshold: 12 })
  .resize(512, 512, { fit: "inside" })
  .png({ compressionLevel: 9, adaptiveFiltering: true })
  .toFile(output);

console.log(`Wrote ${output} (${meta.width}x${meta.height})`);
