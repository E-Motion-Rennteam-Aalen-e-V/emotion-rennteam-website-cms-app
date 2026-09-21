import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

/**
 * Rasterizes src/app/icon.svg (the same mark used for the browser tab favicon)
 * into the PNG sizes a PWA manifest and Apple touch icon need. Playwright
 * renders it at each target size so results are crisp, not just a scaled-up
 * bitmap of a single small render.
 */
const svgPath = fileURLToPath(new URL("../src/app/icon.svg", import.meta.url));
const svgMarkup = readFileSync(svgPath, "utf-8");

const targets = [
  { file: "public/icon-192.png", size: 192 },
  { file: "public/icon-512.png", size: 512 },
  // Next's file-convention route (src/app/apple-icon.png) auto-generates the
  // <link rel="apple-touch-icon"> tag, unlike a plain public/ file.
  { file: "src/app/apple-icon.png", size: 180 },
];

const browser = await chromium.launch();
const page = await browser.newPage();

for (const { file, size } of targets) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(
    `<!doctype html><html><head><style>
      html,body{margin:0;padding:0;background:transparent;}
      svg{display:block;width:${size}px;height:${size}px;}
    </style></head><body>${svgMarkup}</body></html>`,
  );
  const outPath = fileURLToPath(new URL(`../${file}`, import.meta.url));
  await page.screenshot({ path: outPath, omitBackground: true });
  console.log(`Wrote ${file} (${size}x${size})`);
}

await browser.close();
