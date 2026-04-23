import React from "react";

interface GaugeProps {
  value: number; // 0 to 100
  target?: number;
  label?: string;
  subLabel?: string;
  size?: number;
  strokeWidth?: number;
  color?: string;
  bgColor?: string;
}

const Gauge: React.FC<GaugeProps> = ({
  value,
  target,
  label,
  subLabel,
  size = 180,
  strokeWidth = 14,
  color = "#22c55e", // emerald-500
  bgColor = "#f1f5f9", // slate-100
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const semiCircumference = circumference / 2;

  // Constrain value
  const displayValue = Math.min(100, Math.max(0, value));
  const offset = semiCircumference - (displayValue / 100) * semiCircumference;

  // Target indicator position
  const targetAngle = target ? (target / 100) * 180 : null;

  return (
    <div className="flex flex-col items-center justify-center relative w-fit mx-auto">
      <svg
        width={size}
        height={size / 2 + 20}
        viewBox={`0 0 ${size} ${size / 2 + 20}`}
        className="transform -rotate-0"
      >
        {/* Background Track */}
        <path
          d={`M ${strokeWidth / 2},${size / 2} A ${radius},${radius} 0 0,1 ${size - strokeWidth / 2},${size / 2}`}
          fill="none"
          stroke={bgColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />

        {/* Progress Fill */}
        <path
          d={`M ${strokeWidth / 2},${size / 2} A ${radius},${radius} 0 0,1 ${size - strokeWidth / 2},${size / 2}`}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={semiCircumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />

        {/* Target Marker */}
        {targetAngle !== null && (
          <line
            x1={
              size / 2 +
              (radius + 8) * Math.cos((targetAngle + 180) * (Math.PI / 180))
            }
            y1={
              size / 2 +
              (radius + 8) * Math.sin((targetAngle + 180) * (Math.PI / 180))
            }
            x2={
              size / 2 +
              (radius - 8) * Math.cos((targetAngle + 180) * (Math.PI / 180))
            }
            y2={
              size / 2 +
              (radius - 8) * Math.sin((targetAngle + 180) * (Math.PI / 180))
            }
            stroke="#94a3b8"
            strokeWidth="3"
            strokeLinecap="round"
          />
        )}
      </svg>

      {/* Central Value Display */}
      <div className="absolute top-[35%] left-1/2 -translate-x-1/2 text-center w-full">
        <p className="text-2xl font-black text-slate-900 leading-none">
          {label || `${displayValue}%`}
        </p>
        {subLabel && (
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
            {subLabel}
          </p>
        )}
      </div>

      {/* Extreme Labels */}
      <div className="flex justify-between w-full px-2 -mt-4 text-[9px] font-black text-slate-300 uppercase tracking-tighter">
        <span>MIN</span>
        <span>MAX</span>
      </div>
    </div>
  );
};

export default Gauge;
