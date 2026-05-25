/**
 * Removes outer black background via edge flood-fill (keeps black checkmark on the gold disc).
 * Trims transparency and writes public/branding/verified.png.
 */
import sharp from "sharp";
import { existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, "..", "public");
const candidates = [
  join(publicDir, "branding", "verified-source.png"),
  join(publicDir, "branding", "verified.png"),
];

const input = candidates.find((p) => existsSync(p));
if (!input) {
  console.error("Place source art at frontend/public/branding/verified-source.png");
  process.exit(1);
}

const output = join(publicDir, "branding", "verified.png");

const BLACK_THRESHOLD = 48;

function isNearBlack(r, g, b) {
  return Math.max(r, g, b) < BLACK_THRESHOLD;
}

const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width, height } = info;
const n = width * height;
const isBackground = new Uint8Array(n);
const queue = [];

function trySeed(x, y) {
  if (x < 0 || y < 0 || x >= width || y >= height) return;
  const i = y * width + x;
  if (isBackground[i]) return;
  const o = i * 4;
  if (!isNearBlack(data[o], data[o + 1], data[o + 2])) return;
  isBackground[i] = 1;
  queue.push(i);
}

for (let x = 0; x < width; x++) {
  trySeed(x, 0);
  trySeed(x, height - 1);
}
for (let y = 0; y < height; y++) {
  trySeed(0, y);
  trySeed(width - 1, y);
}

while (queue.length > 0) {
  const i = queue.pop();
  const x = i % width;
  const y = (i / width) | 0;
  if (x > 0) trySeed(x - 1, y);
  if (x < width - 1) trySeed(x + 1, y);
  if (y > 0) trySeed(x, y - 1);
  if (y < height - 1) trySeed(x, y + 1);
}

for (let i = 0; i < n; i++) {
  if (isBackground[i]) {
    data[i * 4 + 3] = 0;
  }
}

const meta = await sharp(data, { raw: { width, height, channels: 4 } })
  .trim({ threshold: 12 })
  .resize(512, 512, { fit: "inside" })
  .png({ compressionLevel: 9, adaptiveFiltering: true })
  .toFile(output);

console.log(`Wrote ${output} (${meta.width}x${meta.height}) — background removed, checkmark preserved`);
