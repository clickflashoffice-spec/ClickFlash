import React, { useState, useEffect } from "react";
import { useCurrency } from "../../CurrencyContext.tsx";
import { apiService } from "../../../services/apiService.ts";
import { Currency } from "../../../types.ts";
import Spinner from "../../common/Spinner.tsx";
import { logger } from "@/utils/logger";

const CurrencySettings: React.FC = () => {
  const { baseCurrency } = useCurrency();
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCurrencies = async () => {
      const data = await apiService.getCurrencies();
      setCurrencies(data);
      setLoading(false);
    };
    fetchCurrencies();
  }, []);

  const handleRateChange = (code: string, newRate: number) => {
    setCurrencies((prev) =>
      prev.map((c) => (c.code === code ? { ...c, rate: newRate } : c)),
    );
  };

  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");

  const handleSaveChanges = async () => {
    setSaveStatus("saving");
    try {
      await apiService.updateCurrencies(currencies);
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch (error) {
      logger.error("Failed to save currency settings", error);
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 3000);
    }
  };

  const inputStyles =
    "w-48 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-slate-900 dark:text-white disabled:bg-slate-100 dark:disabled:bg-slate-800 focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 outline-none transition-all font-bold";

  if (loading) return <Spinner />;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
          Currency <span className="text-cyan-600">Exchange</span>
        </h2>
        <button
          onClick={handleSaveChanges}
          disabled={saveStatus === "saving"}
          className="bg-cyan-600 hover:bg-cyan-500 text-white font-black py-2.5 px-6 rounded-xl text-xs uppercase tracking-widest shadow-lg shadow-cyan-600/20 transition-all active:scale-95 disabled:opacity-50"
        >
          {saveStatus === "saving"
            ? "Saving..."
            : saveStatus === "saved"
              ? "✓ Saved"
              : saveStatus === "error"
                ? "Failed"
                : "Save Changes"}
        </button>
      </div>
      <p className="text-slate-500 dark:text-slate-400 mb-6">
        The base currency is{" "}
        <span className="font-bold">
          {baseCurrency.name} ({baseCurrency.code})
        </span>
        . All product prices and order totals are stored in this currency.
        Exchange rates are relative to this base.
      </p>
      <div className="overflow-hidden border border-slate-200 dark:border-slate-700 rounded-2xl">
        <table className="w-full text-left">
          <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
            <tr>
              <th className="p-4">Currency</th>
              <th className="p-4">Code</th>
              <th className="p-4">Symbol</th>
              <th className="p-4">Rate (1 {baseCurrency.code} = X)</th>
            </tr>
          </thead>
          <tbody>
            {currencies.map((c) => (
              <tr
                key={c.code}
                className="border-b border-slate-200 dark:border-slate-700"
              >
                <td className="p-4 font-semibold text-slate-900 dark:text-white">
                  {c.name}
                </td>
                <td className="p-4 font-mono text-slate-700 dark:text-slate-300">
                  {c.code}
                </td>
                <td className="p-4 text-slate-700 dark:text-slate-300">
                  {c.symbol}
                </td>
                <td className="p-4">
                  <input
                    type="number"
                    value={c.rate}
                    onChange={(e) =>
                      handleRateChange(c.code, Number(e.target.value))
                    }
                    disabled={c.code === baseCurrency.code}
                    className={inputStyles}
                    step="0.01"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CurrencySettings;
