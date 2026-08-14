import React, { useState, useRef, useEffect } from 'react';

interface TooltipProps {
    content: string;
    children: React.ReactElement;
    position?: 'top' | 'bottom' | 'left' | 'right';
}

export const Tooltip: React.FC<TooltipProps> = ({ 
    content, 
    children, 
    position = 'top' 
}) => {
    const [isVisible, setIsVisible] = useState(false);
    const [coords, setCoords] = useState({ x: 0, y: 0 });
    const triggerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isVisible && triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            let x = rect.left + rect.width / 2;
            let y = rect.top;

            switch (position) {
                case 'top':
                    y = rect.top - 8;
                    break;
                case 'bottom':
                    y = rect.bottom + 8;
                    break;
                case 'left':
                    x = rect.left - 8;
                    y = rect.top + rect.height / 2;
                    break;
                case 'right':
                    x = rect.right + 8;
                    y = rect.top + rect.height / 2;
                    break;
            }

            setCoords({ x, y });
        }
    }, [isVisible, position]);

    const positionClasses = {
        top: '-translate-x-1/2 -translate-y-full',
        bottom: '-translate-x-1/2 translate-y-2',
        left: '-translate-x-full -translate-y-1/2',
        right: 'translate-x-2 -translate-y-1/2',
    };

    return (
        <div
            ref={triggerRef}
            className="inline-block"
            onMouseEnter={() => setIsVisible(true)}
            onMouseLeave={() => setIsVisible(false)}
        >
            {children}
            {isVisible && (
                <div
                    className={`fixed z-50 px-2 py-1 text-xs text-white bg-slate-800 rounded shadow-lg pointer-events-none ${positionClasses[position]}`}
                    style={{ left: coords.x, top: coords.y }}
                >
                    {content}
                    <div className={`absolute w-2 h-2 bg-slate-800 transform rotate-45 ${
                        position === 'top' ? 'bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2' :
                        position === 'bottom' ? 'top-0 left-1/2 -translate-x-1/2 -translate-y-1/2' :
                        position === 'left' ? 'right-0 top-1/2 translate-x-1/2 -translate-y-1/2' :
                        'left-0 top-1/2 -translate-x-1/2 -translate-y-1/2'
                    }`} />
                </div>
            )}
        </div>
    );
};

export default Tooltip;
