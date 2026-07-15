import React, { useState, useEffect } from "react";
import {
  TrendingUp,
  Users,
  Camera,
  BarChart3,
  Search,
  CheckCircle2,
  AlertTriangle,
  Bot,
} from "lucide-react";
import { cloudApiService } from "../../../services/cloudApiService";
import { apiService } from "../../../services/apiService";
import Spinner from "../../common/Spinner";
import type { Expense } from "../../../types";
import { logger } from "@/utils/logger";

interface PhotographerAudit {
  id: string;
  photographer_id: string;
  date: string;
  total_customers: number;
  imported_photos: number;
  sold_photos: number;
  bad_quality_photos: number;
  sales_revenue: number;
  ai_audit_description: string;
  sold_percent: number;
  sales_rate: number;
  assigned_expenses?: number;
  net_income?: number;
}

interface HotelAudit {
  desk_id: string;
  hotel_name: string;
  date: string;
  total_customers: number;
  imported_photos: number;
  sold_photos: number;
  bad_quality_photos: number;
  sales_revenue: number;
  photographer_audits: PhotographerAudit[];
  sold_percent: number;
  sales_rate: number;
}

const InsightsPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hotels, setHotels] = useState<HotelAudit[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0],
  );

  useEffect(() => {
    const fetchAudits = async () => {
      try {
        setLoading(true);
        setError(null);
        // Call the new Phase 70 API and fetch expenses
        const [response, expenses] = await Promise.all([
          cloudApiService.getLocationAudits(selectedDate),
          apiService.getExpenses(),
        ]);

        // Match expenses either by exact date, or if they just want month-to-date they can adjust.
        // We'll filter for expenses logged exactly on the selected date for the daily audit view
        const dailyExpenses = expenses.filter((e) =>
          e.date.startsWith(selectedDate),
        );

        if (response.success && response.audits) {
          const enhancedAudits = response.audits.map((hotel: HotelAudit) => {
            const enhancedPhotographers = hotel.photographer_audits.map(
              (pa: PhotographerAudit) => {
                // Calculate assigned expenses
                let myExpenses = 0;
                dailyExpenses.forEach((exp) => {
                  const pIds = ((exp as any).photographerId as string[]) || [];
                // Handle older records that might still have `photographerId` string
                const legacyId = typeof (exp as any).photographerId === 'string' ? (exp as any).photographerId : null;

                if (Array.isArray(pIds) && pIds.includes(pa.photographer_id) && pIds.length > 0) {
                    myExpenses += exp.cost / pIds.length;
                  } else if (legacyId && legacyId === pa.photographer_id) {
                    myExpenses += exp.cost;
                  }
                });

                return {
                  ...pa,
                  assigned_expenses: myExpenses,
                  net_income: pa.sales_revenue - myExpenses,
                };
              },
            );

            return {
              ...hotel,
              photographer_audits: enhancedPhotographers,
            };
          });
          setHotels(enhancedAudits);
        } else {
          setHotels([]);
        }
      } catch (err: unknown) {
        logger.error("Failed to fetch location audits", err);
        setError(err instanceof Error ? err.message : "Failed to load location audits.");
      } finally {
        setLoading(false);
      }
    };

    fetchAudits();
  }, [selectedDate]);

  const filteredHotels = hotels.filter((h) =>
    h.hotel_name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="space-y-8 max-w-7xl mx-auto p-6 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase flex items-center gap-3">
            <BarChart3 className="w-8 h-8 text-cyan-500" />
            Ecosystem <span className="text-cyan-600">Audits</span>
          </h1>
          <p className="text-slate-500 text-sm mt-1 font-medium">
            Daily hotel health & photographer performance analysis powered by
            AI.
          </p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-cyan-500/20 outline-none"
            max={new Date().toISOString().split("T")[0]}
          />
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search hotels..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-cyan-500/20 outline-none"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="p-20 flex justify-center">
          <Spinner />
        </div>
      ) : error ? (
        <div className="p-6 bg-rose-50 border border-rose-200 rounded-2xl text-rose-600 text-center font-medium">
          {error}
        </div>
      ) : filteredHotels.length === 0 ? (
        <div className="p-12 bg-white border border-slate-200 rounded-3xl text-center">
          <h3 className="text-lg font-bold text-slate-800">No Audits Found</h3>
          <p className="text-slate-500 mt-2">
            No master apps synced daily metrics for {selectedDate}.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {filteredHotels.map((hotel) => (
            <div
              key={hotel.desk_id}
              className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden"
            >
              {/* Hotel Header */}
              <div className="p-6 border-b border-slate-100 bg-slate-50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h2 className="text-xl font-black text-slate-900 tracking-tight uppercase">
                    {hotel.hotel_name}
                  </h2>
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-widest mt-1">
                    {hotel.photographer_audits.length} Active Photographers
                  </p>
                </div>
                <div className="flex gap-4">
                  <div className="text-right">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                      Network Revenue
                    </p>
                    <p className="text-lg font-black text-emerald-600">
                      ${hotel.sales_revenue}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                      Hotel Sales Rate
                    </p>
                    <p className="text-lg font-black text-indigo-600">
                      {hotel.sales_rate}%
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                      Photos Uploaded
                    </p>
                    <p className="text-lg font-black text-slate-700">
                      {hotel.imported_photos}
                    </p>
                  </div>
                </div>
              </div>

              {/* AI Ecosystem Overview for Hotel (Mocked combination using Gemini idea, here just aggregated summary) */}
              <div className="p-5 bg-indigo-50/50 border-b border-indigo-100 flex gap-3">
                <div className="p-2 bg-indigo-100 text-indigo-600 rounded-xl h-fit">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-indigo-900 mb-1">
                    AI Site Audit Summary
                  </h4>
                  <p className="text-sm text-indigo-800/80 leading-relaxed">
                    {hotel.hotel_name} processed {hotel.imported_photos} photos
                    across {hotel.photographer_audits.length} staff resulting in{" "}
                    {hotel.total_customers} interactions. The overall sales rate
                    is {hotel.sales_rate}%, with a total photo conversion rate
                    of {hotel.sold_percent}%.
                    {hotel.bad_quality_photos > 10
                      ? ` Warning: ${hotel.bad_quality_photos} poor quality photos were flagged across the site, requiring immediate attention to lens or camera settings.`
                      : ` Image quality remains within acceptable thresholds.`}
                  </p>
                </div>
              </div>

              {/* Granular Photographer Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-white border-b border-slate-100">
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Photographer
                      </th>
                      <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">
                        Customers
                      </th>
                      <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">
                        Quality
                      </th>
                      <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">
                        Sales Rate
                      </th>
                      <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">
                        Sold %
                      </th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">
                        Revenue
                      </th>
                      <th className="px-6 py-4 text-[10px] font-black text-rose-400 uppercase tracking-widest text-right">
                        Expenses
                      </th>
                      <th className="px-6 py-4 text-[10px] font-black text-emerald-500 uppercase tracking-widest text-right">
                        Net Income
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {hotel.photographer_audits.map((pa) => (
                      <React.Fragment key={pa.id}>
                        <tr className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                                <Camera className="w-4 h-4 text-slate-400" />
                              </div>
                              <span className="font-bold text-slate-900">
                                {pa.photographer_id}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-center">
                            <div className="flex items-center justify-center gap-1.5 text-slate-600">
                              <Users className="w-3.5 h-3.5" />
                              <span className="text-sm font-bold">
                                {pa.total_customers}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-center">
                            {pa.bad_quality_photos > 0 ? (
                              <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-amber-50 text-amber-700 rounded-lg text-xs font-bold border border-amber-200">
                                <AlertTriangle className="w-3.5 h-3.5" />
                                {pa.bad_quality_photos} Flagged
                              </div>
                            ) : (
                              <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-bold border border-emerald-200">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Clean
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center justify-center gap-2">
                              <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-indigo-500 rounded-full"
                                  style={{ width: pa.sales_rate + "%" }}
                                />
                              </div>
                              <span className="text-xs font-mono font-bold text-slate-700">
                                {pa.sales_rate}%
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center justify-center gap-2">
                              <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-cyan-500 rounded-full"
                                  style={{ width: pa.sold_percent + "%" }}
                                />
                              </div>
                              <span className="text-xs font-mono font-bold text-slate-700">
                                {pa.sold_percent}%
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <span className="text-sm font-black text-slate-600">
                              ${pa.sales_revenue}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <span className="text-sm font-black text-rose-500">
                              {pa.assigned_expenses && pa.assigned_expenses > 0
                                ? `-$${pa.assigned_expenses.toFixed(2)}`
                                : "$0"}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <span
                              className={`text-sm font-black ${(pa.net_income || 0) >= 0 ? "text-emerald-600" : "text-rose-600"}`}
                            >
                              ${(pa.net_income || 0).toFixed(2)}
                            </span>
                          </td>
                        </tr>
                        {/* AI Review Row */}
                        <tr className="bg-slate-50/30">
                          <td
                            colSpan={8}
                            className="px-6 py-3 border-b-2 border-slate-100"
                          >
                            <div className="flex items-start gap-2 max-w-4xl">
                              <TrendingUp className="w-4 h-4 text-indigo-400 mt-0.5 shrink-0" />
                              <p className="text-xs text-slate-600 italic font-medium">
                                "{pa.ai_audit_description}"
                              </p>
                            </div>
                          </td>
                        </tr>
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default InsightsPage;
