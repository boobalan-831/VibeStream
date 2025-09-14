import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
// Generate crisp favicons at runtime from the bundled logo
const LOGO_URL = new URL('../icons/VStream-logo.png', import.meta.url).href;

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function getTrimmedBounds(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const pixels = ctx.getImageData(0, 0, w, h).data;
  let top = 0, left = 0, right = w - 1, bottom = h - 1;
  let found = false;
  // top
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (pixels[(y * w + x) * 4 + 3] !== 0) { top = y; found = true; break; }
    }
    if (found) break;
  }
  found = false;
  // bottom
  for (let y = h - 1; y >= 0; y--) {
    for (let x = 0; x < w; x++) {
      if (pixels[(y * w + x) * 4 + 3] !== 0) { bottom = y; found = true; break; }
    }
    if (found) break;
  }
  found = false;
  // left
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) {
      if (pixels[(y * w + x) * 4 + 3] !== 0) { left = x; found = true; break; }
    }
    if (found) break;
  }
  found = false;
  // right
  for (let x = w - 1; x >= 0; x--) {
    for (let y = 0; y < h; y++) {
      if (pixels[(y * w + x) * 4 + 3] !== 0) { right = x; found = true; break; }
    }
    if (found) break;
  }
  // If fully transparent, fallback to full image
  if (top === 0 && left === 0 && right === w - 1 && bottom === h - 1) {
    return { x: 0, y: 0, width: w, height: h };
  }
  return { x: left, y: top, width: Math.max(1, right - left + 1), height: Math.max(1, bottom - top + 1) };
}

function drawIcon(img: HTMLImageElement, size: number, opts?: { bg?: string; marginRatio?: number }): string {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  canvas.width = canvas.height = size;
  const marginRatio = opts?.marginRatio ?? 0.1; // 10% margin by default
  const margin = Math.floor(size * marginRatio);

  // Draw image to temp canvas to compute trim bounds
  const t = document.createElement('canvas');
  const tctx = t.getContext('2d')!;
  t.width = img.width; t.height = img.height;
  tctx.clearRect(0, 0, t.width, t.height);
  tctx.drawImage(img, 0, 0);
  const crop = getTrimmedBounds(tctx, t.width, t.height);

  // Fill background (useful for Apple touch icon and dark theme)
  if (opts?.bg) {
    ctx.fillStyle = opts.bg;
    ctx.fillRect(0, 0, size, size);
  } else {
    // Transparent background favicons are fine
    ctx.clearRect(0, 0, size, size);
  }

  // Compute draw rect to fit within size - margins
  const maxW = size - margin * 2;
  const maxH = size - margin * 2;
  const scale = Math.min(maxW / crop.width, maxH / crop.height);
  const dw = Math.floor(crop.width * scale);
  const dh = Math.floor(crop.height * scale);
  const dx = Math.floor((size - dw) / 2);
  const dy = Math.floor((size - dh) / 2);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, crop.x, crop.y, crop.width, crop.height, dx, dy, dw, dh);
  return canvas.toDataURL('image/png');
}

function upsertIconLink(rel: string, href: string, sizes?: string): HTMLLinkElement {
  let selector = `link[rel="${rel}"]`;
  if (sizes) selector += `[sizes="${sizes}"]`;
  let link = document.querySelector<HTMLLinkElement>(selector);
  if (!link) {
    link = document.createElement('link');
    link.rel = rel as any;
    if (sizes) link.sizes = sizes;
    document.head.appendChild(link);
  }
  link.type = 'image/png';
  link.href = href;
  return link;
}

async function ensureFavicons() {
  try {
    const img = await loadImage(LOGO_URL);
    // Smaller sizes with tighter margins for clarity
    const icon16 = drawIcon(img, 16, { marginRatio: 0.06 });
    const icon32 = drawIcon(img, 32, { marginRatio: 0.08 });
    const icon64 = drawIcon(img, 64, { marginRatio: 0.08 });
    const apple180 = drawIcon(img, 180, { marginRatio: 0.12, bg: '#0B0F14' });
    upsertIconLink('icon', icon16, '16x16');
    upsertIconLink('icon', icon32, '32x32');
    upsertIconLink('icon', icon64, '64x64');
    upsertIconLink('apple-touch-icon', apple180, '180x180');
  } catch (e) {
    // Fallback to raw logo if any processing fails
    upsertIconLink('icon', LOGO_URL);
  }
}

// Fire and forget; doesn’t block app render
ensureFavicons();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);