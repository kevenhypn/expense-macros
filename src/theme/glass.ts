type ShadowToken = {
  shadowColor: string;
  shadowOffset: { width: number; height: number };
  shadowOpacity: number;
  shadowRadius: number;
  elevation: number;
};

export const GLASS: {
  rCard: number;
  rPill: number;
  rChip: number;
  pad: number;
  gap: number;
  border: string;
  borderStrong: string;
  surface: string;
  surfaceStrong: string;
  shadow: ShadowToken;
  blurBase: number;
  blurPressed: number;
  blurScrollBoost: number;
} = {
  rCard: 28,
  rPill: 18,
  rChip: 14,
  pad: 18,
  gap: 12,
  border: "rgba(255,255,255,0.14)",
  borderStrong: "rgba(255,255,255,0.22)",
  surface: "rgba(255,255,255,0.06)",
  surfaceStrong: "rgba(255,255,255,0.10)",
  shadow: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.18,
    shadowRadius: 28,
    elevation: 12,
  },
  blurBase: 18,
  blurPressed: 28,
  blurScrollBoost: 8,
};

export const glassTint = (hex: string, alpha = 0.16) => {
  const normalized = hex.replace("#", "");
  const red = parseInt(normalized.slice(0, 2), 16);
  const green = parseInt(normalized.slice(2, 4), 16);
  const blue = parseInt(normalized.slice(4, 6), 16);

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
};
