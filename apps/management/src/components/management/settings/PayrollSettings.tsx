import React, { useState, useEffect } from "react";
import Card from "../../common/Card.tsx";
import { Photographer } from "../../../types.ts";
import { useCurrency } from "../../CurrencyContext.tsx";
import { apiService } from "../../../services/apiService.ts";
import Spinner from "../../common/Spinner.tsx";

const PayrollSettings: React.FC = () => {
  const [photographers, setPhotographers] = useState<Photographer[]>([]);
  const [loading, setLoading] = useState(true);
  const { currency } = useCurrency();

  useEffect(() => {
    const fetchUsers = async () => {
      const users = await apiService.getUsers();
      setPhotographers(users);
      setLoading(false);
    };
    fetchUsers();
  }, []);

  const handleSettingChange = (
    id: string,
    field: keyof Photographer,
    value: string | number,
  ) => {
    setPhotographers((prev) =>
      prev.map((p) => {
        if (p.id === id) {
          let newValues: Partial<Photographer> = {};

          if (field === "payrollType") {
            newValues = { payrollType: value as "Commission" | "Salary" };
            if (value === "Salary") newValues.commissionRate = 0;
            if (value === "Commission") newValues.monthlySalary = 0;
          } else if (field === "monthlySalary") {
            newValues = { monthlySalary: Number(value) / currency.rate };
          } else if (field === "commissionRate") {
            newValues = { commissionRate: Number(value) / 100 };
          } else {
            newValues = { [field]: value };
          }
          return { ...p, ...newValues };
        }
        return p;
      }),
    );
  };

  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");

  const handleSave = async () => {
    setSaveStatus("saving");
    try {
      await Promise.all(
        photographers.map((p) => apiService.updateUser(p.id, p)),
      );
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch (error) {
      console.error("Failed to save payroll settings", error);
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 3000);
    }
  };

  if (loading) return <Spinner />;

  const inputStyles =
    "w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 outline-none transition-all font-bold";

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
          Photographer <span className="text-cyan-600">Payroll</span>
        </h2>
        <button
          onClick={handleSave}
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
        Configure the payment method for each photographer. Choose between a
        fixed monthly salary or a commission-based percentage of their total
        sales.
      </p>
      <div className="overflow-hidden border border-slate-200 dark:border-slate-700 rounded-2xl">
        <table className="w-full text-left min-w-[600px]">
          <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
            <tr>
              <th className="p-4">Photographer</th>
              <th className="p-4 w-48">Payroll Type</th>
              <th className="p-4">Rate / Amount</th>
            </tr>
          </thead>
          <tbody>
            {photographers.map((p) => (
              <tr
                key={p.id}
                className="border-b border-slate-200 dark:border-slate-700"
              >
                <td className="p-4 font-semibold flex items-center space-x-3 text-slate-900 dark:text-white">
                  <img
                    src={p.avatarUrl}
                    alt={p.name}
                    className="w-10 h-10 rounded-full"
                  />
                  <span>{p.name}</span>
                </td>
                <td className="p-4">
                  <select
                    value={p.payrollType}
                    onChange={(e) =>
                      handleSettingChange(p.id, "payrollType", e.target.value)
                    }
                    className={inputStyles}
                  >
                    <option value="Commission">Commission</option>
                    <option value="Salary">Salary</option>
                  </select>
                </td>
                <td className="p-4">
                  {p.payrollType === "Commission" ? (
                    <div className="relative">
                      <input
                        type="number"
                        value={((p.commissionRate || 0) * 100).toFixed(2)}
                        onChange={(e) =>
                          handleSettingChange(
                            p.id,
                            "commissionRate",
                            Number(e.target.value),
                          )
                        }
                        className={`${inputStyles} pl-3 pr-8`}
                      />
                      <span className="absolute inset-y-0 right-3 flex items-center text-slate-400">
                        %
                      </span>
                    </div>
                  ) : (
                    <div className="relative">
                      <input
                        type="number"
                        value={((p.monthlySalary || 0) * currency.rate).toFixed(
                          0,
                        )}
                        onChange={(e) =>
                          handleSettingChange(
                            p.id,
                            "monthlySalary",
                            Number(e.target.value),
                          )
                        }
                        className={`${inputStyles} pl-8 pr-3`}
                      />
                      <span className="absolute inset-y-0 left-3 flex items-center text-slate-400">
                        {currency.symbol}
                      </span>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PayrollSettings;
