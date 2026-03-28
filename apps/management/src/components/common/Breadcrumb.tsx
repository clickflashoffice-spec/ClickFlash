import React from "react";
import { ManagementView } from "../../constants";
import { ChevronRight } from "lucide-react";

// ============================================================================
// Breadcrumb — Dynamic nav trail based on current active view
// Format: Tab Label > Page Name
// ============================================================================

const VIEW_META: Record<ManagementView, { tab: string; page: string }> = {
  executive_dashboard: { tab: "Dashboard", page: "Executive Overview" },
  stations_overview:   { tab: "Operations", page: "Stations Overview" },
  orders_sales:        { tab: "Operations", page: "Orders & Sales" },
  assets_inventory:    { tab: "Operations", page: "Assets & Inventory" },
  sync_logs:           { tab: "Operations", page: "Sync & Logs" },
  revenue_income:      { tab: "Finance", page: "Revenue & Income" },
  expenses_payroll:    { tab: "Finance", page: "Expenses & Payroll" },
  capital_treasury:    { tab: "Finance", page: "Capital & Treasury" },
  general_settings:    { tab: "Settings", page: "General Settings" },
  staff_management:    { tab: "Settings", page: "Staff Management" },
  session_types:       { tab: "Settings", page: "Session Types" },
  reports_insights:    { tab: "Settings", page: "Reports & Insights" },
};

interface BreadcrumbProps {
  currentView: ManagementView;
  onNavigate?: (view: ManagementView) => void;
}

export const Breadcrumb: React.FC<BreadcrumbProps> = ({ currentView, onNavigate }) => {
  const meta = VIEW_META[currentView] ?? { tab: "Dashboard", page: "Overview" };
  const isDashboard = currentView === "executive_dashboard";

  return (
    <nav
      aria-label="Breadcrumb"
      className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 select-none"
    >
      <span
        onClick={() => onNavigate?.("executive_dashboard")}
        className={`cursor-pointer transition-colors ${
          isDashboard ? "text-slate-300" : "hover:text-slate-300"
        }`}
      >
        {meta.tab}
      </span>

      {!isDashboard && (
        <>
          <ChevronRight className="w-3 h-3 text-slate-700 flex-shrink-0" />
          <span className="text-slate-300">{meta.page}</span>
        </>
      )}
    </nav>
  );
};

export default Breadcrumb;
