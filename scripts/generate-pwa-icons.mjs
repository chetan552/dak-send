import sharp from "sharp";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, "..", "public");
const iconsDir = join(publicDir, "icons");
mkdirSync(iconsDir, { recursive: true });

const srcSvg = readFileSync(join(publicDir, "icon.svg"));

// Maskable version: full-bleed background, icon inset within the 80% safe zone.
const maskableSvg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#6366F1"/>
      <stop offset="100%" stop-color="#8B5CF6"/>
    </linearGradient>
  </defs>
  <rect width="100" height="100" fill="url(#g)"/>
  <g transform="translate(20 20) scale(1.5)">
    <path d="M8 29 L32 8 L22 33 Z" fill="white"/>
    <path d="M8 29 L19 21 L22 33 Z" fill="rgba(67,56,202,0.35)"/>
    <line x1="19" y1="21" x2="32" y2="8" stroke="rgba(255,255,255,0.25)" stroke-width="0.75"/>
  </g>
</svg>`);

const sizes = [
  { size: 192, name: "icon-192.png", src: srcSvg },
  { size: 512, name: "icon-512.png", src: srcSvg },
  { size: 192, name: "icon-maskable-192.png", src: maskableSvg },
  { size: 512, name: "icon-maskable-512.png", src: maskableSvg },
  { size: 180, name: "apple-touch-icon.png", src: srcSvg },
  { size: 32, name: "favicon-32.png", src: srcSvg },
  { size: 16, name: "favicon-16.png", src: srcSvg },
];

for (const { size, name, src } of sizes) {
  const out = join(iconsDir, name);
  await sharp(src).resize(size, size).png().toFile(out);
  console.log(`wrote ${out}`);
}

// apple-touch-icon also at /public root for iOS default lookups
await sharp(srcSvg).resize(180, 180).png().toFile(join(publicDir, "apple-touch-icon.png"));
console.log("wrote public/apple-touch-icon.png");
