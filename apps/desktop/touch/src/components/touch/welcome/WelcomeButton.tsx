import React from "react";

export const WelcomeButton: React.FC<{
  title: string;
  description: string;
  icon: React.ReactNode;
  onClick: () => void;
  gradient: string;
  highlight?: boolean;
  delay?: number;
}> = ({
  title,
  description,
  icon,
  onClick,
  gradient,
  highlight,
  delay = 0,
}) => (
  <button
    onClick={onClick}
    className={`relative w-full h-auto min-h-[220px] max-h-[280px] ${gradient} rounded-3xl flex flex-col items-center justify-center text-center p-5 cursor-pointer transition-all duration-500 hover:scale-[1.03] active:scale-95 shadow-xl hover:shadow-2xl border border-white/10 group overflow-hidden animate-fadeInUp`}
    style={{ animationDelay: `${delay}ms` }}
  >
    {/* Background Decorator */}
    <div className="absolute top-0 left-0 w-full h-full bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
    <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>

    {highlight && (
      <div className="absolute inset-0 ring-4 ring-white/30 rounded-3xl animate-pulse z-0"></div>
    )}

    <div className="relative z-10 text-white mb-3 p-4 bg-white/20 rounded-full group-hover:bg-white/30 transition-colors backdrop-blur-md shadow-lg">
      {React.cloneElement(icon as React.ReactElement<{ className?: string }>, {
        className:
          "w-10 h-10 transform group-hover:rotate-6 transition-transform duration-300",
      })}
    </div>
    <h2 className="relative z-10 text-xl font-bold text-white mb-2 drop-shadow-md whitespace-nowrap">
      {title}
    </h2>
    <p className="relative z-10 text-white/90 text-xs font-medium max-w-[90%] leading-relaxed line-clamp-2">
      {description}
    </p>
  </button>
);
