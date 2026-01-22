import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bill, BudgetConfig, SavingsGoal } from "../types";
import { getTodayISO, saveConfig, regenerateSystemTransactions, generateId } from "../lib/storage";
import { Trash2, Plus, ArrowRight } from "lucide-react";

export const SetupWizard = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);

  // Form State
  const [monthlyIncome, setMonthlyIncome] = useState<string>("");
  const [startDate, setStartDate] = useState(getTodayISO());
  const [bills, setBills] = useState<Bill[]>([
    { id: "1", name: "Rent", amount: 0 },
    { id: "2", name: "Phone", amount: 0 },
    { id: "3", name: "Car Payment", amount: 0 },
  ]);
  const [savingsMode, setSavingsMode] = useState<"percent" | "fixed">("percent");
  const [savingsValue, setSavingsValue] = useState<string>("20"); // 20% or $20
  const [rolloverUnspent, setRolloverUnspent] = useState(true);

  // Helpers
  const addBill = () => setBills([...bills, { id: generateId(), name: "", amount: 0 }]);
  const removeBill = (id: string) => setBills(bills.filter((b) => b.id !== id));
  const updateBill = (id: string, field: keyof Bill, val: any) => {
    setBills(bills.map((b) => (b.id === id ? { ...b, [field]: val } : b)));
  };

  const getSavingsAmount = () => {
    const inc = parseFloat(monthlyIncome) || 0;
    const val = parseFloat(savingsValue) || 0;
    return savingsMode === "percent" ? inc * (val / 100) : val;
  };

  const handleSave = () => {
    const savingsGoal: SavingsGoal =
      savingsMode === "percent"
        ? { mode: "percent", percent: parseFloat(savingsValue) || 0 }
        : { mode: "fixed", amount: parseFloat(savingsValue) || 0 };

    const config: BudgetConfig = {
      startDate,
      monthlyIncome: parseFloat(monthlyIncome) || 0,
      bills: bills.filter(b => b.name.trim() !== ""),
      savingsGoal,
      rolloverUnspent,
    };

    saveConfig(config);
    regenerateSystemTransactions(config);
    navigate("/");
  };

  const renderStep1 = () => (
    <div className="space-y-6 animate-fade-in">
      <h2 className="text-2xl font-bold text-white">Let's get started</h2>
      <div>
        <label className="block text-gray-400 mb-2">Monthly Income</label>
        <input
          type="number"
          value={monthlyIncome}
          onChange={(e) => setMonthlyIncome(e.target.value)}
          placeholder="e.g. 5000"
          className="w-full bg-[#2a2a2a] p-4 rounded-xl text-white text-xl border border-[#333] focus:border-green-500 outline-none"
        />
      </div>
      <div>
        <label className="block text-gray-400 mb-2">Period start date</label>
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="w-full bg-[#2a2a2a] p-4 rounded-xl text-white text-xl border border-[#333] focus:border-green-500 outline-none"
        />
      </div>
      <label className="flex items-center justify-between bg-[#2a2a2a] p-4 rounded-xl border border-[#333]">
        <div>
          <div className="text-gray-200 font-medium">Rollover unspent budget</div>
          <div className="text-xs text-gray-500">
            Unused daily budget carries into remaining days.
          </div>
        </div>
        <input
          type="checkbox"
          checked={rolloverUnspent}
          onChange={(e) => setRolloverUnspent(e.target.checked)}
          className="h-5 w-5 accent-green-500"
        />
      </label>
      <button 
        disabled={!monthlyIncome}
        onClick={() => setStep(2)} 
        className="w-full bg-green-600 p-4 rounded-xl font-bold text-white mt-8 disabled:opacity-50">
        Next
      </button>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-4 animate-fade-in h-full flex flex-col">
      <h2 className="text-2xl font-bold text-white">Recurring Bills</h2>
      <div className="flex-grow overflow-y-auto space-y-3 pb-4">
        {bills.map((bill) => (
          <div key={bill.id} className="flex gap-2 items-center">
            <input
              type="text"
              value={bill.name}
              onChange={(e) => updateBill(bill.id, "name", e.target.value)}
              placeholder="Bill Name"
              className="flex-grow bg-[#2a2a2a] p-3 rounded-lg text-white border border-[#333]"
            />
            <input
              type="number"
              value={bill.amount || ""}
              onChange={(e) => updateBill(bill.id, "amount", parseFloat(e.target.value))}
              placeholder="$"
              className="w-24 bg-[#2a2a2a] p-3 rounded-lg text-white border border-[#333]"
            />
            <button onClick={() => removeBill(bill.id)} className="text-red-500 p-2">
              <Trash2 size={20} />
            </button>
          </div>
        ))}
        <button onClick={addBill} className="flex items-center gap-2 text-green-500 font-medium p-2">
          <Plus size={18} /> Add Bill
        </button>
      </div>
      <button onClick={() => setStep(3)} className="w-full bg-green-600 p-4 rounded-xl font-bold text-white">
        Next
      </button>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6 animate-fade-in">
      <h2 className="text-2xl font-bold text-white">Savings Goal</h2>
      <div className="flex bg-[#2a2a2a] p-1 rounded-lg">
        <button
          onClick={() => setSavingsMode("percent")}
          className={`flex-1 py-2 rounded-md transition ${savingsMode === "percent" ? "bg-green-600 text-white" : "text-gray-400"}`}
        >
          Percent (%)
        </button>
        <button
          onClick={() => setSavingsMode("fixed")}
          className={`flex-1 py-2 rounded-md transition ${savingsMode === "fixed" ? "bg-green-600 text-white" : "text-gray-400"}`}
        >
          Fixed ($)
        </button>
      </div>
      <div>
        <label className="block text-gray-400 mb-2">{savingsMode === "percent" ? "Percentage" : "Amount"}</label>
        <input
          type="number"
          value={savingsValue}
          onChange={(e) => setSavingsValue(e.target.value)}
          className="w-full bg-[#2a2a2a] p-4 rounded-xl text-white text-xl border border-[#333] focus:border-green-500 outline-none"
        />
        <p className="text-gray-500 mt-2">
          Approximated savings: <span className="text-green-500 font-bold">${getSavingsAmount().toFixed(0)}</span>
        </p>
      </div>
      <button onClick={() => setStep(4)} className="w-full bg-green-600 p-4 rounded-xl font-bold text-white mt-8">
        Next
      </button>
    </div>
  );

  const renderStep4 = () => {
    // Preview calculations
    const inc = parseFloat(monthlyIncome) || 0;
    const billsTotal = bills.reduce((acc, b) => acc + (b.amount || 0), 0);
    const saveAmt = getSavingsAmount();
    const available = inc - billsTotal - saveAmt;

    return (
      <div className="space-y-6 animate-fade-in">
        <h2 className="text-2xl font-bold text-white">Review</h2>
        <div className="bg-[#2a2a2a] rounded-xl p-4 space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-400">Monthly Income</span>
            <span className="text-green-500 font-bold">+${inc}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Period Start</span>
            <span className="text-white font-medium">{startDate}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Bills Total</span>
            <span className="text-red-500 font-bold">-${billsTotal}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Savings</span>
            <span className="text-red-500 font-bold">-${saveAmt.toFixed(0)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Rollover</span>
            <span className="text-white font-medium">{rolloverUnspent ? "On" : "Off"}</span>
          </div>
          <div className="h-px bg-[#333] my-2"></div>
          <div className="flex justify-between text-lg">
            <span className="text-white">Available to Spend</span>
            <span className="text-green-500 font-bold">${available.toFixed(0)}</span>
          </div>
        </div>
        <button onClick={handleSave} className="w-full bg-green-600 p-4 rounded-xl font-bold text-white mt-8 flex justify-center items-center gap-2">
          Looks Good <ArrowRight size={20} />
        </button>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#121212] text-white p-6 flex flex-col justify-center max-w-md mx-auto">
      {step === 1 && renderStep1()}
      {step === 2 && renderStep2()}
      {step === 3 && renderStep3()}
      {step === 4 && renderStep4()}
    </div>
  );
};
