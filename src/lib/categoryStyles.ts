import { TransactionCategory } from "../types";

type CategoryStyle = {
  selected: string;
  unselected: string;
  badge: string;
};

export const CATEGORY_STYLES: Record<TransactionCategory, CategoryStyle> = {
  Food: {
    selected: "bg-[#8B5A2B] text-white shadow-lg shadow-[#4a2f14]/50",
    unselected: "bg-[#8B5A2B]/20 text-[#cda57a] hover:bg-[#8B5A2B]/30",
    badge: "bg-[#8B5A2B]/30 text-[#cda57a]",
  },
  Bills: {
    selected: "bg-red-600 text-white shadow-lg shadow-red-900/50",
    unselected: "bg-red-600/20 text-red-400 hover:bg-red-600/30",
    badge: "bg-red-600/20 text-red-400",
  },
  Savings: {
    selected: "bg-green-600 text-white shadow-lg shadow-green-900/50",
    unselected: "bg-green-600/20 text-green-400 hover:bg-green-600/30",
    badge: "bg-green-600/20 text-green-400",
  },
  Shopping: {
    selected: "bg-purple-600 text-white shadow-lg shadow-purple-900/50",
    unselected: "bg-purple-600/20 text-purple-400 hover:bg-purple-600/30",
    badge: "bg-purple-600/20 text-purple-400",
  },
  Transport: {
    selected: "bg-yellow-500 text-black shadow-lg shadow-yellow-900/50",
    unselected: "bg-yellow-500/20 text-yellow-300 hover:bg-yellow-500/30",
    badge: "bg-yellow-500/20 text-yellow-300",
  },
  Entertainment: {
    selected: "bg-blue-600 text-white shadow-lg shadow-blue-900/50",
    unselected: "bg-blue-600/20 text-blue-400 hover:bg-blue-600/30",
    badge: "bg-blue-600/20 text-blue-400",
  },
  Other: {
    selected: "bg-gray-600 text-white shadow-lg shadow-black/40",
    unselected: "bg-gray-600/20 text-gray-400 hover:bg-gray-600/30",
    badge: "bg-gray-600/20 text-gray-400",
  },
  Income: {
    selected: "bg-green-500 text-white shadow-lg shadow-green-900/50",
    unselected: "bg-green-500/20 text-green-500 hover:bg-green-500/30",
    badge: "bg-green-500/20 text-green-500",
  },
};
