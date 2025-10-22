/**
 * Generate PWA icons placeholder script
 * In production, use proper icon generation tools
 * For now, creates placeholder SVG icons
 */

import { writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const iconsDir = join(__dirname, "../public/icons");

// Ensure icons directory exists
try {
  mkdirSync(iconsDir, { recursive: true });
} catch (err) {
  // Directory might already exist
}

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

sizes.forEach((size) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="#000000"/>
  <circle cx="${size / 2}" cy="${size / 2}" r="${size * 0.4}" fill="#ffffff"/>
  <text x="${size / 2}" y="${size / 2}" font-size="${size * 0.3}" fill="#000000" text-anchor="middle" dominant-baseline="middle" font-family="sans-serif" font-weight="bold">BF</text>
</svg>`;

  writeFileSync(join(iconsDir, `icon-${size}x${size}.png.svg`), svg);
  console.log(`Generated icon-${size}x${size}.png.svg`);
});

console.log(
  "\nNote: For production, replace these SVG placeholders with actual PNG icons.",
);
console.log(
  "Use tools like https://realfavicongenerator.net/ to generate proper PWA icons.",
);
