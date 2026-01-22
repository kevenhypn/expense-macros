import { TransactionCategory } from "../types";

type CategoryStyle = {
  selected: string;
  unselected: string;
  badge: string;
  selectedBg: string;
  unselectedBg: string;
  badgeBg: string;
};

export const CATEGORY_STYLES: Record<TransactionCategory, CategoryStyle> = {
  Food: {
    selected: "bg-[#8B5A2B] text-white shadow-lg shadow-[#4a2f14]/50",
    unselected: "bg-[#8B5A2B]/20 text-black hover:bg-[#8B5A2B]/30",
    badge: "bg-[#8B5A2B]/30 text-[#cda57a]",
    selectedBg: "#8B5A2B",
    unselectedBg: "#2d1e10",
    badgeBg: "#2d1e10",
  },
  Bills: {
    selected: "bg-red-600 text-white shadow-lg shadow-red-900/50",
    unselected: "bg-red-600/20 text-black hover:bg-red-600/30",
    badge: "bg-red-600/20 text-red-400",
    selectedBg: "#dc2626",
    unselectedBg: "#3d1515",
    badgeBg: "#3d1515",
  },
  Savings: {
    selected: "bg-green-600 text-white shadow-lg shadow-green-900/50",
    unselected: "bg-green-600/20 text-black hover:bg-green-600/30",
    badge: "bg-green-600/20 text-green-400",
    selectedBg: "#16a34a",
    unselectedBg: "#14332a",
    badgeBg: "#14332a",
  },
  Shopping: {
    selected: "bg-purple-600 text-white shadow-lg shadow-purple-900/50",
    unselected: "bg-purple-600/20 text-black hover:bg-purple-600/30",
    badge: "bg-purple-600/20 text-purple-400",
    selectedBg: "#9333ea",
    unselectedBg: "#2d1a3d",
    badgeBg: "#2d1a3d",
  },
  Transport: {
    selected: "bg-yellow-500 text-black shadow-lg shadow-yellow-900/50",
    unselected: "bg-yellow-500/20 text-black hover:bg-yellow-500/30",
    badge: "bg-yellow-500/20 text-yellow-300",
    selectedBg: "#eab308",
    unselectedBg: "#3d3314",
    badgeBg: "#3d3314",
  },
  Entertainment: {
    selected: "bg-blue-600 text-white shadow-lg shadow-blue-900/50",
    unselected: "bg-blue-600/20 text-black hover:bg-blue-600/30",
    badge: "bg-blue-600/20 text-blue-400",
    selectedBg: "#2563eb",
    unselectedBg: "#1a2a3d",
    badgeBg: "#1a2a3d",
  },
  Other: {
    selected: "bg-gray-600 text-white shadow-lg shadow-black/40",
    unselected: "bg-gray-600/20 text-black hover:bg-gray-600/30",
    badge: "bg-gray-600/20 text-gray-400",
    selectedBg: "#4b5563",
    unselectedBg: "#262626",
    badgeBg: "#262626",
  },
  Income: {
    selected: "bg-green-500 text-white shadow-lg shadow-green-900/50",
    unselected: "bg-green-500/20 text-black hover:bg-green-500/30",
    badge: "bg-green-500/20 text-green-500",
    selectedBg: "#22c55e",
    unselectedBg: "#14332a",
    badgeBg: "#14332a",
  },
};
