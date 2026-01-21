import React from "react";

interface AmountToggleProps {
  amount: string;
  setAmount: (val: string) => void;
  isIncome: boolean;
  setIsIncome: (val: boolean) => void;
}

export const AmountToggle: React.FC<AmountToggleProps> = ({
  amount,
  setAmount,
  isIncome,
  setIsIncome,
}) => {
  return (
    <div className="flex gap-4 items-stretch h-16 mb-6">
      <div className="flex-grow bg-[#2a2a2a] rounded-2xl flex items-center px-4 border border-[#333]">
        <span className="text-gray-400 text-xl mr-2">$</span>
        <input
          type="number"
          placeholder="0.00"
          className="bg-transparent text-3xl font-bold text-white w-full focus:outline-none"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </div>

      <button
        onClick={() => setIsIncome(!isIncome)}
        className={`w-16 h-16 flex-shrink-0 rounded-2xl flex items-center justify-center font-bold text-sm border-2 transition-colors ${
          isIncome
            ? "border-green-500/50 text-green-400 bg-green-900/10"
            : "border-red-500/50 text-red-400 bg-red-900/10"
        }`}
      >
        {isIncome ? "IN" : "OUT"}
      </button>
    </div>
  );
};
