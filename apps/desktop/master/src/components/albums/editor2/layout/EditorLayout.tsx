import React from 'react';

interface EditorLayoutProps {
    toolbar: React.ReactNode;
    sidebar: React.ReactNode;
    canvas: React.ReactNode;
    filmstrip?: React.ReactNode;
    navigation?: React.ReactNode; // Arrows
}

export const EditorLayout: React.FC<EditorLayoutProps> = ({
    toolbar,
    sidebar,
    canvas,
    filmstrip,
    navigation
}) => {
    return (
        <div className="flex flex-col h-screen bg-gray-50 overflow-hidden">
            {/* Toolbar Area */}
            <div className="flex-shrink-0 z-50 shadow-md">
                {toolbar}
            </div>

            {/* Main Content Area */}
            <div className="flex flex-1 min-h-0 relative">
                {/* Sidebar */}
                <div className="w-80 flex-shrink-0 z-40 h-full border-r border-gray-200 bg-white shadow-xl overflow-hidden relative">
                    {sidebar}
                </div>

                {/* Canvas Area */}
                <div className="flex-1 relative z-10 bg-gray-100 min-w-0 overflow-hidden">
                    {canvas}

                    {/* Navigation layer on top of canvas */}
                    {navigation && (
                        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-between px-4 pointer-events-none">
                            {/* Children of navigation should have pointer-events-auto */}
                            {navigation}
                        </div>
                    )}
                </div>
            </div>

            {/* Filmstrip Area */}
            {filmstrip && (
                <div className="flex-shrink-0 h-32 border-t border-gray-200 bg-white z-50">
                    {filmstrip}
                </div>
            )}
        </div>
    );
};
