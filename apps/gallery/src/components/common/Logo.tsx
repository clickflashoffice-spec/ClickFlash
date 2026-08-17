import React from 'react';
import { Camera } from 'lucide-react';

interface LogoProps {
  className?: string;
  size?: number | 'sm' | 'md' | 'lg' | 'xl';
}

export const Logo: React.FC<LogoProps> = ({ className = '', size = 28 }) => {
  let pixelSize = 28;
  if (typeof size === 'number') {
    pixelSize = size;
  } else if (size === 'sm') pixelSize = 20;
  else if (size === 'md') pixelSize = 28;
  else if (size === 'lg') pixelSize = 36;
  else if (size === 'xl') pixelSize = 48;

  return (
    <div className={`flex items-center gap-2.5 font-bold ${className}`}>
      <div
        style={{ width: `${pixelSize * 1.3}px`, height: `${pixelSize * 1.3}px` }}
        className="rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/20"
      >
        <Camera className="text-white" size={pixelSize * 0.65} />
      </div>
      <span className="text-xl font-extrabold bg-gradient-to-r from-white via-slate-100 to-cyan-200 bg-clip-text text-transparent">
        ClickFlash
      </span>
    </div>
  );
};

export default Logo;
