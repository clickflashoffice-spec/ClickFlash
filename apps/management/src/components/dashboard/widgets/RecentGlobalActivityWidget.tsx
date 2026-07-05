import React, { useMemo } from "react";
import { Order, Album, View } from "../../../types.ts";

interface RecentGlobalActivityWidgetProps {
  orders: Order[];
  albums: Album[];
  onNavigate: (view: View) => void;
  showAll?: boolean;
}

interface Activity {
  id: string;
  type: "order" | "album" | "photo";
  title: string;
  description: string;
  timestamp: string;
  metadata: {
    status?: string;
    amount?: number;
    photographer?: string;
    destination?: string;
  };
}

/**
 * RecentGlobalActivityWidget Component
 *
 * Displays a feed of recent activity across all destinations.
 *
 * @param {RecentGlobalActivityWidgetProps} props - Component props
 */
const RecentGlobalActivityWidget: React.FC<RecentGlobalActivityWidgetProps> = ({
  orders,
  albums,
  onNavigate,
  showAll = false,
}) => {
  const activities = useMemo(() => {
    const allActivities: Activity[] = [];

    // Add order activities
    orders.slice(0, 20).forEach((order) => {
      allActivities.push({
        id: `order-${order.id}`,
        type: "order",
        title: `Order ${order.id}`,
        description: `${order.clientName || "Unknown"} - ${order.items?.length || 0} items`,
        timestamp: order.date,
        metadata: {
          status: order.status,
          amount: order.total,
          photographer: order.photographerId?.toString(),
        },
      });
    });

    // Add album activities
    albums.slice(0, 20).forEach((album) => {
      allActivities.push({
        id: `album-${album.id}`,
        type: "album",
        title: album.title || "Untitled Album",
        description: `${album.photos?.length || 0} photos • ${album.status}`,
        timestamp: album.date,
        metadata: {
          status: album.status,
          photographer: album.photographerId?.toString(),
          destination: album.destinationId?.toString(),
        },
      });
    });

    // Sort by timestamp (newest first)
    return allActivities
      .sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      )
      .slice(0, showAll ? 50 : 10);
  }, [orders, albums, showAll]);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "order":
        return (
          <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center">
            <svg
              className="w-5 h-5 text-green-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
              />
            </svg>
          </div>
        );
      case "album":
        return (
          <div className="w-10 h-10 rounded-full bg-cyan-50 flex items-center justify-center">
            <svg
              className="w-5 h-5 text-cyan-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
        );
      default:
        return (
          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
            <svg
              className="w-5 h-5 text-slate-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
        );
    }
  };

  const getStatusBadge = (status?: string) => {
    if (!status) return null;

    const colors: Record<string, string> = {
      Completed: "bg-green-100 text-green-700",
      Pending: "bg-amber-100 text-amber-700",
      Processing: "bg-cyan-100 text-cyan-700",
      Finalized: "bg-purple-100 text-purple-700",
      Draft: "bg-slate-100 text-slate-700",
    };

    return (
      <span
        className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[status] || colors["Draft"]}`}
      >
        {status}
      </span>
    );
  };

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-slate-900">Recent Activity</h3>
          <p className="text-sm text-slate-500">Latest orders and albums</p>
        </div>
        {!showAll && (
          <button
            onClick={() => onNavigate("Orders")}
            className="text-sm text-cyan-600 hover:text-cyan-700 hover:underline font-medium"
          >
            View All
          </button>
        )}
      </div>

      <div
        className={`space-y-4 ${showAll ? "max-h-96 overflow-y-auto pr-2" : ""}`}
      >
        {activities.map((activity) => (
          <div
            key={activity.id}
            className="flex items-start space-x-4 p-3 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-slate-100"
            onClick={() =>
              onNavigate(activity.type === "order" ? "Orders" : "Albums")
            }
          >
            {getActivityIcon(activity.type)}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-900 truncate">
                  {activity.title}
                </p>
                <span className="text-xs text-slate-400 whitespace-nowrap ml-2">
                  {formatRelativeTime(activity.timestamp)}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {activity.description}
              </p>
              <div className="flex items-center space-x-2 mt-2">
                {getStatusBadge(activity.metadata.status)}
                {activity.metadata.amount && (
                  <span className="text-xs font-medium text-green-600">
                    ${activity.metadata.amount.toFixed(2)}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}

        {activities.length === 0 && (
          <div className="text-center py-8 text-slate-500">
            <svg
              className="w-12 h-12 mx-auto mb-3 opacity-50"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p>No recent activity</p>
          </div>
        )}
      </div>
    </div>
  );
};

RecentGlobalActivityWidget.displayName = 'RecentGlobalActivityWidget';
export default React.memo(RecentGlobalActivityWidget);

