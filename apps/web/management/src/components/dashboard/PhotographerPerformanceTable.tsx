import React, { useState, useEffect } from "react";
import { pb } from "../../services/pb";
import {Users,
  Search,
  ChevronUp,
  ChevronDown} from "lucide-react";
import { logger } from "../../utils/logger";

interface PhotographerMetric {
  id: string;
  name: string;
  total_revenue: number;
  order_count: number;
  total_session_seconds: number;
  session_count: number;
  basket_average: number;
  avg_session_duration: number; // calculated
  revenue_per_session: number; // calculated
  meetings_made: number;
  meetings_taken: number;
}

const PhotographerPerformanceTable: React.FC = () => {
  const [data, setData] = useState<PhotographerMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortField, setSortField] =
    useState<keyof PhotographerMetric>("total_revenue");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const records = await pb
          .collection("photographer_performance")
          .getFullList();

        const metrics: PhotographerMetric[] = records.map((r: Record<string, unknown>) => {
          const totalRev = (r.total_revenue as number) || 0;
          const orderCount = (r.order_count as number) || 0;
          const sessionSecs = (r.total_session_seconds as number) || 0;
          const sessionCount = (r.session_count as number) || 0;

          return {
            id: r.id as string,
            name: (r.photographer_name as string) || "Unknown",
            total_revenue: totalRev,
            order_count: orderCount,
            total_session_seconds: sessionSecs,
            session_count: sessionCount,
            basket_average: orderCount > 0 ? totalRev / orderCount : 0,
            avg_session_duration:
              sessionCount > 0 ? sessionSecs / sessionCount : 0,
            revenue_per_session: sessionCount > 0 ? totalRev / sessionCount : 0,
            meetings_made: (r.meetings_made as number) || 0,
            meetings_taken: (r.meetings_taken as number) || 0,
          };
        });

        setData(metrics);
      } catch (err: unknown) {
        logger.error("Failed to fetch photographer performance", err instanceof Error ? err : undefined);
        setError("Failed to load performance data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleSort = (field: keyof PhotographerMetric) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  const filteredData = data
    .filter((item) =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase()),
    )
    .sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortOrder === "asc" ? aVal - bVal : bVal - aVal;
      }
      return 0;
    });

  const formatDuration = (seconds: number) => {
    if (seconds === 0) return "0s";
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  if (loading)
    return (
      <div className="p-8 text-center text-slate-400">
        Loading performance data...
      </div>
    );
  if (error) return <div className="p-8 text-center text-red-500">{error}</div>;

  return (
    <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800 rounded-3xl overflow-hidden">
      <div className="p-6 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-black text-white flex items-center gap-2 uppercase tracking-tight">
            <Users className="w-5 h-5 text-cyan-400" />
            Team Performance
          </h3>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search team member..."
            className="bg-slate-950 border border-slate-800 rounded-2xl pl-10 pr-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 transition-all w-full md:w-64"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-left comparison-table">
          <thead>
            <tr className="bg-slate-900/50">
              <th className="px-6 py-4 font-bold">Photographer</th>
              <th
                className="px-6 py-4 font-bold cursor-pointer hover:text-white"
                onClick={() => handleSort("total_revenue")}
              >
                <div className="flex items-center gap-1">
                  REVENUE{" "}
                  {sortField === "total_revenue" &&
                    (sortOrder === "asc" ? (
                      <ChevronUp className="w-3 h-3" />
                    ) : (
                      <ChevronDown className="w-3 h-3" />
                    ))}
                </div>
              </th>
              <th className="px-6 py-4 font-bold text-center">MEETINGS</th>
              <th
                className="px-6 py-4 font-bold text-right cursor-pointer hover:text-white"
                onClick={() => handleSort("basket_average")}
              >
                <div className="flex items-center justify-end gap-1">
                  BASKET{" "}
                  {sortField === "basket_average" &&
                    (sortOrder === "asc" ? (
                      <ChevronUp className="w-3 h-3" />
                    ) : (
                      <ChevronDown className="w-3 h-3" />
                    ))}
                </div>
              </th>
              <th className="px-6 py-4 font-bold text-right">SESSION</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {filteredData.map((item) => (
              <tr
                key={item.id}
                className="hover:bg-slate-800/20 transition-colors group"
              >
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-[10px] font-black text-slate-400 group-hover:border-cyan-500 transition-colors">
                      {item.name.substring(0, 2).toUpperCase()}
                    </div>
                    <span className="text-white font-bold">{item.name}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="text-emerald-400 font-black">
                    €{item.total_revenue.toLocaleString()}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-center gap-4">
                    <div className="flex flex-col items-center">
                      <span className="text-[9px] text-slate-500 font-bold uppercase">
                        Made
                      </span>
                      <span className="text-sm font-black text-white">
                        {item.meetings_made}
                      </span>
                    </div>
                    <div className="w-px h-6 bg-slate-800"></div>
                    <div className="flex flex-col items-center">
                      <span className="text-[9px] text-slate-500 font-bold uppercase">
                        Sold
                      </span>
                      <span className="text-sm font-black text-amber-500">
                        {item.meetings_taken}
                      </span>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <span className="text-purple-400 font-black">
                    €{item.basket_average.toFixed(2)}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex flex-col items-end">
                    <span className="text-white font-bold">
                      {formatDuration(item.avg_session_duration)}
                    </span>
                    <span className="text-[9px] text-slate-500 font-bold">
                      €{item.revenue_per_session.toFixed(2)} / sess
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PhotographerPerformanceTable;
