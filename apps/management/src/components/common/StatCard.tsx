import React from "react";
import Card from "./Card.tsx";

interface StatCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  colorClass?: string;
  className?: string;
  sub?: string;
  trend?: "up" | "down" | "neutral";
  valueClassName?: string;
  centered?: boolean;
}

/**
 * A standardized StatCard for displaying key metrics across dashboards.
 * Supports icons, trends, custom styling, and optional centering.
 */
const StatCard: React.FC<StatCardProps> = React.memo(
  ({
    title,
    value,
    icon,
    colorClass = "bg-cyan-50 text-cyan-600 dark:bg-cyan-900/20 dark:text-cyan-400",
    className = "",
    sub,
    trend,
    valueClassName = "text-slate-900 dark:text-white",
    centered = false,
  }) => {
    return (
      <Card
        className={`${centered ? "flex flex-col items-center text-center" : "flex items-start space-x-4"} ${className}`}
      >
        {icon && (
          <div
            className={`p-3 rounded-lg flex-shrink-0 ${colorClass} ${centered ? "mb-3" : ""}`}
          >
            {icon}
          </div>
        )}
        <div className={`flex-grow min-w-0 ${centered ? "w-full" : ""}`}>
          <p
            className="text-sm text-slate-500 dark:text-slate-400 truncate"
            title={title}
          >
            {title}
          </p>
          <p
            className={`text-2xl font-bold truncate ${valueClassName}`}
            title={String(value)}
          >
            {value}
          </p>
          {sub && (
            <p
              className={`text-xs mt-1 flex items-center ${centered ? "justify-center" : ""} gap-1 ${
                trend === "up"
                  ? "text-emerald-500"
                  : trend === "down"
                    ? "text-rose-500"
                    : "text-slate-400"
              }`}
            >
              {trend === "up" && (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-3 w-3"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
              {trend === "down" && (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-3 w-3"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
              {sub}
            </p>
          )}
        </div>
      </Card>
    );
  },
);

StatCard.displayName = "StatCard";

export default StatCard;
