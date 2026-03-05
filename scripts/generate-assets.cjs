const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, 'assets');

const COLORS = {
  bg: { r: 0x12, g: 0x12, b: 0x12, a: 0xff },
  accent: { r: 0x22, g: 0xc5, b: 0x5e, a: 0xff },
  accentAlt: { r: 0x3b, g: 0x82, b: 0xf6, a: 0xff },
};

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function createPng(width, height, background) {
  const png = new PNG({ width, height });
  if (background) {
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        setPixel(png, x, y, background);
      }
    }
  }
  return png;
}

function setPixel(png, x, y, color) {
  const idx = (png.width * y + x) << 2;
  png.data[idx] = color.r;
  png.data[idx + 1] = color.g;
  png.data[idx + 2] = color.b;
  png.data[idx + 3] = color.a;
}

function drawCircle(png, cx, cy, r, color) {
  const r2 = r * r;
  const minX = Math.max(0, Math.floor(cx - r));
  const maxX = Math.min(png.width - 1, Math.ceil(cx + r));
  const minY = Math.max(0, Math.floor(cy - r));
  const maxY = Math.min(png.height - 1, Math.ceil(cy + r));

  for (let y = minY; y <= maxY; y += 1) {
    const dy = y - cy;
    for (let x = minX; x <= maxX; x += 1) {
      const dx = x - cx;
      if (dx * dx + dy * dy <= r2) {
        setPixel(png, x, y, color);
      }
    }
  }
}

function drawRoundedSquare(png, cx, cy, size, color) {
  const half = size / 2;
  const minX = Math.floor(cx - half);
  const maxX = Math.floor(cx + half);
  const minY = Math.floor(cy - half);
  const maxY = Math.floor(cy + half);
  const radius = Math.floor(size * 0.18);

  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      const dx = Math.min(Math.abs(x - minX), Math.abs(x - maxX));
      const dy = Math.min(Math.abs(y - minY), Math.abs(y - maxY));
      if (dx >= radius || dy >= radius || (dx * dx + dy * dy <= radius * radius)) {
        if (x >= 0 && x < png.width && y >= 0 && y < png.height) {
          setPixel(png, x, y, color);
        }
      }
    }
  }
}

function writePng(png, filePath) {
  fs.writeFileSync(filePath, PNG.sync.write(png));
}

function generateIcon() {
  const size = 1024;
  const png = createPng(size, size, COLORS.bg);
  const cx = size / 2;
  const cy = size / 2;
  drawCircle(png, cx, cy, size * 0.34, COLORS.accentAlt);
  drawRoundedSquare(png, cx, cy, size * 0.42, COLORS.accent);
  writePng(png, path.join(OUT_DIR, 'icon.png'));
}

function generateAdaptiveIcon() {
  const size = 1024;
  const png = createPng(size, size, null);
  const cx = size / 2;
  const cy = size / 2;
  drawCircle(png, cx, cy, size * 0.34, COLORS.accentAlt);
  drawRoundedSquare(png, cx, cy, size * 0.42, COLORS.accent);
  writePng(png, path.join(OUT_DIR, 'adaptive-icon.png'));
}

function generateSplash() {
  const width = 1242;
  const height = 2436;
  const png = createPng(width, height, COLORS.bg);
  const cx = width / 2;
  const cy = height / 2;
  const base = Math.min(width, height);
  drawCircle(png, cx, cy, base * 0.18, COLORS.accentAlt);
  drawRoundedSquare(png, cx, cy, base * 0.22, COLORS.accent);
  writePng(png, path.join(OUT_DIR, 'splash.png'));
}

function main() {
  ensureDir(OUT_DIR);
  generateIcon();
  generateAdaptiveIcon();
  generateSplash();
  console.log('Assets generated in /assets');
}

main();
