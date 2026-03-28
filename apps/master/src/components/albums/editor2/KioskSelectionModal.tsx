import React from 'react';

interface Kiosk {
    id: string;
    name: string;
    status?: string;
}

interface KioskSelectionModalProps {
    isOpen: boolean;
    kiosks: Kiosk[];
    selectedKioskIds: Set<string>;
    selectedPhotoCount: number;
    onToggleKiosk: (kioskId: string) => void;
    onSelectAll: () => void;
    onClearAll: () => void;
    onConfirm: () => void;
    onCancel: () => void;
}

export const KioskSelectionModal: React.FC<KioskSelectionModalProps> = ({
    isOpen,
    kiosks,
    selectedKioskIds,
    selectedPhotoCount,
    onToggleKiosk,
    onSelectAll,
    onClearAll,
    onConfirm,
    onCancel,
}) => {
    if (!isOpen) return null;
    
    const theme = {
        overlay: 'bg-black/50',
        modal: 'bg-white border-gray-200',
        text: 'text-gray-900',
        subtext: 'text-gray-500',
        buttonSecondary: 'bg-gray-100 hover:bg-gray-200 text-gray-700',
    };
    
    return (
        <div className={`fixed inset-0 ${theme.overlay} backdrop-blur-sm z-50 flex items-center justify-center p-4`}>
            <div className={`${theme.modal} border rounded-xl shadow-2xl max-w-md w-full p-6`}>
                <h2 className={`text-xl font-bold ${theme.text} mb-4`}>Send to Kiosk</h2>
                
                <p className={`${theme.subtext} text-sm mb-4`}>
                    Select target kiosk(s) for {selectedPhotoCount} photo(s)
                </p>
                
                {/* Actions */}
                <div className="flex gap-2 mb-4">
                    <button
                        onClick={onSelectAll}
                        className={`px-3 py-1 text-xs rounded ${theme.buttonSecondary}`}
                    >
                        Select All
                    </button>
                    <button
                        onClick={onClearAll}
                        className={`px-3 py-1 text-xs rounded ${theme.buttonSecondary}`}
                    >
                        Clear
                    </button>
                </div>
                
                {/* Kiosk List */}
                <div className={`max-h-48 overflow-y-auto border rounded-lg p-2 mb-4 border-gray-200 bg-gray-50`}>
                    {kiosks.length === 0 ? (
                        <p className={`text-sm ${theme.subtext} p-2`}>No kiosks found. Please pair a kiosk first.</p>
                    ) : (
                        <div className="space-y-2">
                            {kiosks.map(kiosk => (
                                <label
                                    key={kiosk.id}
                                    className="flex items-center space-x-3 p-2 rounded cursor-pointer transition-colors hover:bg-gray-100"
                                >
                                    <input
                                        type="checkbox"
                                        checked={selectedKioskIds.has(kiosk.id)}
                                        onChange={() => onToggleKiosk(kiosk.id)}
                                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    <span className={`text-sm ${theme.text}`}>{kiosk.name}</span>
                                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                                        kiosk.status === 'Connected'
                                            ? 'bg-green-100 text-green-700'
                                            : 'bg-gray-200 text-gray-600'
                                    }`}>
                                        {kiosk.status || 'Offline'}
                                    </span>
                                </label>
                            ))}
                        </div>
                    )}
                </div>
                
                <p className={`text-xs ${theme.subtext} mb-6`}>
                    Selected: <strong>{selectedKioskIds.size}</strong> kiosk(s)
                </p>
                
                {/* Buttons */}
                <div className="flex gap-3">
                    <button
                        onClick={onCancel}
                        className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium ${theme.buttonSecondary}`}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={selectedKioskIds.size === 0}
                        className="flex-1 py-2 px-4 rounded-lg text-sm font-medium bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white transition-colors"
                    >
                        Send to Kiosk
                    </button>
                </div>
            </div>
        </div>
    );
};

export default KioskSelectionModal;
