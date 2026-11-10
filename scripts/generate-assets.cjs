const fs = require("node:fs");
const path = require("node:path");
const { PNG } = require("pngjs");

const emerald = [8, 113, 79, 255];
const mist = [245, 246, 245, 255];
const bars = [[173, 229, 200, 255], [255, 255, 255, 255], [110, 231, 168, 255]];

function icon(file, width, height, background, scale = 1) {
  const img = new PNG({ width, height, colorType: background ? 2 : 6 });
  const unit = Math.min(width, height) * scale / 100;
  for (let py = 0; py < height; py++) for (let px = 0; px < width; px++) {
    const x = (px + 0.5 - width / 2) / unit;
    const y = (py + 0.5 - height / 2) / unit;
    let pixel = background ?? [0, 0, 0, 0];
    for (let i = 0; i < 3; i++) {
      const top = [0, -11, -24][i];
      const cx = [-17, 0, 17][i];
      const d = Math.hypot(x - cx, y - Math.max(top + 5, Math.min(20, y)));
      const opacity = Math.min(1, Math.max(0, (5 - d) * unit + 0.5));
      if (opacity > 0) pixel = background
        ? bars[i].map((v, j) => Math.round(v * opacity + background[j] * (1 - opacity)))
        : [...bars[i].slice(0, 3), Math.round(opacity * 255)];
    }
    img.data.set(pixel, 4 * (py * width + px));
  }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, PNG.sync.write(img, { colorType: background ? 2 : 6, inputColorType: 6 }));
}

icon("assets/icon.png", 1024, 1024, emerald);
icon("assets/adaptive-icon.png", 1024, 1024, null, 0.85);
icon("assets/splash.png", 1024, 1024, mist, 0.37);
for (const size of [180, 192, 512]) icon(`public/icons/app-${size}.png`, size, size, emerald);
