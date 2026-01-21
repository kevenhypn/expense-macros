import { TransactionCategory } from "../types";

type CategoryStyle = {
  selected: string;
  unselected: string;
  badge: string;
  // Hex colors for programmatic use
  selectedBg: string;
  unselectedBg: string;
  badgeBg: string;
};

// Using explicit background colors that work with NativeWind
export const CATEGORY_STYLES: Record<TransactionCategory, CategoryStyle> = {
  Food: {
    selected: "bg-[#8B5A2B]",
    unselected: "bg-[#2d1e10]",
    badge: "bg-[#2d1e10]",
    selectedBg: "#8B5A2B",
    unselectedBg: "#2d1e10",
    badgeBg: "#2d1e10",
  },
  Bills: {
    selected: "bg-red-600",
    unselected: "bg-[#3d1515]",
    badge: "bg-[#3d1515]",
    selectedBg: "#dc2626",
    unselectedBg: "#3d1515",
    badgeBg: "#3d1515",
  },
  Savings: {
    selected: "bg-green-600",
    unselected: "bg-[#14332a]",
    badge: "bg-[#14332a]",
    selectedBg: "#16a34a",
    unselectedBg: "#14332a",
    badgeBg: "#14332a",
  },
  Shopping: {
    selected: "bg-purple-600",
    unselected: "bg-[#2d1a3d]",
    badge: "bg-[#2d1a3d]",
    selectedBg: "#9333ea",
    unselectedBg: "#2d1a3d",
    badgeBg: "#2d1a3d",
  },
  Transport: {
    selected: "bg-yellow-500",
    unselected: "bg-[#3d3314]",
    badge: "bg-[#3d3314]",
    selectedBg: "#eab308",
    unselectedBg: "#3d3314",
    badgeBg: "#3d3314",
  },
  Entertainment: {
    selected: "bg-blue-600",
    unselected: "bg-[#1a2a3d]",
    badge: "bg-[#1a2a3d]",
    selectedBg: "#2563eb",
    unselectedBg: "#1a2a3d",
    badgeBg: "#1a2a3d",
  },
  Other: {
    selected: "bg-gray-600",
    unselected: "bg-[#262626]",
    badge: "bg-[#262626]",
    selectedBg: "#4b5563",
    unselectedBg: "#262626",
    badgeBg: "#262626",
  },
  Income: {
    selected: "bg-green-500",
    unselected: "bg-[#14332a]",
    badge: "bg-[#14332a]",
    selectedBg: "#22c55e",
    unselectedBg: "#14332a",
    badgeBg: "#14332a",
  },
};

// Text colors for each category
export const CATEGORY_TEXT_COLORS: Record<
  TransactionCategory,
  { selected: string; unselected: string; badge: string }
> = {
  Food: {
    selected: "text-white",
    unselected: "text-[#cda57a]",
    badge: "text-[#cda57a]",
  },
  Bills: {
    selected: "text-white",
    unselected: "text-red-400",
    badge: "text-red-400",
  },
  Savings: {
    selected: "text-white",
    unselected: "text-green-400",
    badge: "text-green-400",
  },
  Shopping: {
    selected: "text-white",
    unselected: "text-purple-400",
    badge: "text-purple-400",
  },
  Transport: {
    selected: "text-black",
    unselected: "text-yellow-300",
    badge: "text-yellow-300",
  },
  Entertainment: {
    selected: "text-white",
    unselected: "text-blue-400",
    badge: "text-blue-400",
  },
  Other: {
    selected: "text-white",
    unselected: "text-gray-400",
    badge: "text-gray-400",
  },
  Income: {
    selected: "text-white",
    unselected: "text-green-500",
    badge: "text-green-500",
  },
};
