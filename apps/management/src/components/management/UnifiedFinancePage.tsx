import React, { useState } from "react";
import {DollarSign,
  ArrowDownRight,
  Users} from "lucide-react";
import ExpensesPage from "./ExpensesPage";
import CapitalPage from "./CapitalPage";
import PayrollPage from "./PayrollPage";
import { Photographer } from "../../types";

type FinanceTab =
  | "payroll"
  | "expenses"
  | "adjustments"
  | "bonuses"
  | "capital";

interface UnifiedFinancePageProps {
  currentUser: Photographer;
  context: string;
}

const UnifiedFinancePage: React.FC<UnifiedFinancePageProps> = ({
  currentUser,
  context,
}) => {
  const [activeTab, setActiveTab] = useState<FinanceTab>("payroll");

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">
          Financials & HR
        </h1>
        <p className="text-slate-500 mt-1">
          Manage payroll, expenses, and capital
        </p>
      </div>

      {/* Navigation Tabs */}
      <div className="flex space-x-1 p-1 bg-slate-100 rounded-xl overflow-x-auto w-full lg:w-fit">
        <button
          onClick={() => setActiveTab("payroll")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
            activeTab === "payroll"
              ? "bg-white text-blue-600 shadow-sm"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
          }`}
        >
          <Users className="w-4 h-4" />
          Compensation
        </button>
        <button
          onClick={() => setActiveTab("expenses")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
            activeTab === "expenses"
              ? "bg-white text-blue-600 shadow-sm"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
          }`}
        >
          <ArrowDownRight className="w-4 h-4" />
          Expenses
        </button>
        <button
          onClick={() => setActiveTab("capital")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
            activeTab === "capital"
              ? "bg-white text-blue-600 shadow-sm"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
          }`}
        >
          <DollarSign className="w-4 h-4" />
          Capital
        </button>
      </div>

      {/* Content Area */}
      <div className="bg-white border border-slate-200 rounded-2xl min-h-[600px] overflow-hidden p-6 md:p-8">
        {activeTab === "payroll" && (
          <PayrollPage currentUser={currentUser} context={context} />
        )}
        {activeTab === "expenses" && <ExpensesPage context={context} />}
        {activeTab === "capital" && <CapitalPage context={context} />}
      </div>
    </div>
  );
};

export default UnifiedFinancePage;
