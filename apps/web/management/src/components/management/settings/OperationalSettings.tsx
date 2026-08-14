import React, { useState } from "react";
import CurrencySettings from "./CurrencySettings";
import PayrollSettings from "./PayrollSettings";
import ExpenseCategorySettings from "./ExpenseCategorySettings";
import EquipmentCategorySettings from "./EquipmentCategorySettings";
import SessionTypesSettings from "./SessionTypesSettings";
import PhotoCategorySettings from "./PhotoCategorySettings";
import ReceiptTemplateSettings from "./ReceiptTemplateSettings";

type SubTab =
  | "Currencies"
  | "Payroll"
  | "Session Types"
  | "Expense Categories"
  | "Equipment Categories"
  | "Photo Categories"
  | "Receipt Templates";

const OperationalSettings: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<SubTab>("Currencies");

  const SUB_TABS: { id: SubTab; label: string }[] = [
    { id: "Currencies", label: "Currencies" },
    { id: "Payroll", label: "Payroll" },
    { id: "Session Types", label: "Session Types" },
    { id: "Expense Categories", label: "Expense Categories" },
    { id: "Equipment Categories", label: "Equipment Categories" },
    { id: "Photo Categories", label: "Photo Categories" },
    { id: "Receipt Templates", label: "Receipt Templates" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight uppercase">
          Operational <span className="text-cyan-600">Management</span>
        </h2>
        <p className="text-slate-500 text-sm mt-1">
          Configure global financial entities and operational categories.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 p-1.5 bg-slate-100 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-inner text-slate-900 dark:text-white">
        {SUB_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id)}
            className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all ${
              activeSubTab === tab.id
                ? "bg-white dark:bg-slate-700 text-cyan-600 shadow-sm border border-slate-200 dark:border-slate-600"
                : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="animate-fadeIn">
        {activeSubTab === "Currencies" && <CurrencySettings />}
        {activeSubTab === "Payroll" && <PayrollSettings />}
        {activeSubTab === "Session Types" && <SessionTypesSettings />}
        {activeSubTab === "Expense Categories" && <ExpenseCategorySettings />}
        {activeSubTab === "Equipment Categories" && (
          <EquipmentCategorySettings />
        )}
        {activeSubTab === "Photo Categories" && <PhotoCategorySettings />}
        {activeSubTab === "Receipt Templates" && <ReceiptTemplateSettings />}
      </div>
    </div>
  );
};

export default OperationalSettings;
