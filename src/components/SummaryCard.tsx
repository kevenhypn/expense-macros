import React from "react";

interface SummaryCardProps {
  title: string;
  mainValue: string; // The big number (e.g. Left)
  mainIsPositive: boolean;
  subValue: string; // The total
  footerText: string;
}

export const SummaryCard: React.FC<SummaryCardProps> = ({
  title,
  mainValue,
  mainIsPositive,
  subValue,
  footerText,
}) => {
  return (
    <div className="bg-[#1e1e1e] border border-[#333] rounded-3xl p-5 shadow-inner flex flex-col gap-2">
      <h3 className="text-gray-400 text-sm uppercase tracking-wider font-semibold">
        {title}
      </h3>
      <div className="flex justify-between items-baseline">
        <span
          className={`text-3xl font-bold ${
            mainIsPositive ? "text-green-500" : "text-red-500"
          }`}
        >
          {mainValue}
        </span>
        <span className="text-gray-500 text-sm font-medium">{subValue}</span>
      </div>
      <div className="text-xs text-gray-500 mt-1">{footerText}</div>
    </div>
  );
};
