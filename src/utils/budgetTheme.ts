export const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export const blendHexColor = (from: string, to: string, progress: number) => {
  const amount = clamp(progress, 0, 1);
  const fromValue = from.replace("#", "");
  const toValue = to.replace("#", "");

  const fromRgb = [
    parseInt(fromValue.slice(0, 2), 16),
    parseInt(fromValue.slice(2, 4), 16),
    parseInt(fromValue.slice(4, 6), 16),
  ];
  const toRgb = [
    parseInt(toValue.slice(0, 2), 16),
    parseInt(toValue.slice(2, 4), 16),
    parseInt(toValue.slice(4, 6), 16),
  ];

  const mixed = fromRgb.map((channel, index) =>
    Math.round(channel + (toRgb[index] - channel) * amount)
  );

  return `#${mixed
    .map((channel) => channel.toString(16).padStart(2, "0"))
    .join("")}`;
};

export const withAlpha = (hex: string, alpha: number) => {
  const opacity = clamp(alpha, 0, 1);
  const alphaHex = Math.round(opacity * 255)
    .toString(16)
    .padStart(2, "0");

  return `${hex}${alphaHex}`;
};

const getContrastText = (hex: string) => {
  const normalized = hex.replace("#", "");
  const red = parseInt(normalized.slice(0, 2), 16) / 255;
  const green = parseInt(normalized.slice(2, 4), 16) / 255;
  const blue = parseInt(normalized.slice(4, 6), 16) / 255;

  const luminance = 0.2126 * red + 0.7152 * green + 0.0722 * blue;
  return luminance > 0.62 ? "#101010" : "#ffffff";
};

export type BudgetTheme = {
  ratio: number;
  accent: string;
  accentText: string;
  accentGlowStrong: string;
  accentGlowSoft: string;
  accentSurface: string;
  accentSurfaceStrong: string;
  accentBorder: string;
  accentBorderStrong: string;
  onAccent: string;
};

export const getBudgetTheme = (ratio: number): BudgetTheme => {
  const normalizedRatio = clamp(ratio, 0, 1);
  const accent =
    normalizedRatio > 0.5
      ? blendHexColor("#f59e0b", "#34d399", (normalizedRatio - 0.5) / 0.5)
      : blendHexColor("#ef4444", "#f59e0b", normalizedRatio / 0.5);
  const accentText =
    normalizedRatio > 0.5
      ? blendHexColor("#fde68a", "#d1fae5", (normalizedRatio - 0.5) / 0.5)
      : blendHexColor("#fecaca", "#fde68a", normalizedRatio / 0.5);

  return {
    ratio: normalizedRatio,
    accent,
    accentText,
    accentGlowStrong: withAlpha(accent, 0.14),
    accentGlowSoft: withAlpha(accent, 0.08),
    accentSurface: withAlpha(accent, 0.12),
    accentSurfaceStrong: withAlpha(accent, 0.18),
    accentBorder: withAlpha(accent, 0.26),
    accentBorderStrong: withAlpha(accent, 0.46),
    onAccent: getContrastText(accent),
  };
};

export const DEFAULT_BUDGET_THEME = getBudgetTheme(1);
