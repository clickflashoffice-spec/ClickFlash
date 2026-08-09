import { Card } from "@clickflash/ui";
import React from 'react';
import { ImageDown, ScanSearch, Tags } from 'lucide-react';

const LocalIntelligenceSettings: React.FC = () => (
    <div className="space-y-6 animate-fadeIn">
        <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Local Intelligence &amp; Processing</h2>
            <p className="text-slate-500 dark:text-slate-400">
                Offline-first photo analysis. No provider account or external model key is required.
            </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
                <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
                    <ScanSearch className="h-5 w-5 text-purple-500" />
                    Smart Culling
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                    Uses local sharpness, exposure, face, and duplicate analysis. A person must review selections before applying them.
                </p>
            </Card>

            <Card>
                <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
                    <Tags className="h-5 w-5 text-green-500" />
                    Analysis Tags
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                    Derives orientation, exposure, sharpness, and portrait signals on this station without uploading images.
                </p>
            </Card>

            <Card>
                <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
                    <ImageDown className="h-5 w-5 text-blue-500" />
                    Generative Editing
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                    Not available in the local pipeline. Standard non-generative editor tools remain available.
                </p>
            </Card>
        </div>
    </div>
);

export default LocalIntelligenceSettings;
