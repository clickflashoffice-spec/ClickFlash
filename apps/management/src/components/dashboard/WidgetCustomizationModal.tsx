import React, { useState } from 'react';
import { 
  X, GripVertical, Check, EyeOff, RotateCcw, Save, 
  ArrowUp, ArrowDown, LayoutGrid 
} from 'lucide-react';

export interface WidgetConfig {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  order: number;
}

interface WidgetCustomizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (widgets: WidgetConfig[]) => void;
  initialWidgets?: WidgetConfig[];
}

const DEFAULT_WIDGETS: WidgetConfig[] = [
  { id: 'revenue-velocity', name: 'Revenue Velocity', description: 'Real-time sales pacing vs target', enabled: true, order: 0 },
  { id: 'active-kiosks', name: 'Active Kiosks', description: 'Live status of all resort kiosks', enabled: true, order: 1 },
  { id: 'photographer-conversion', name: 'Photographer Conversion', description: 'Capture-to-sale metrics by staff', enabled: true, order: 2 },
  { id: 'ai-insights', name: 'AI Insights', description: 'Automated business intelligence alerts', enabled: true, order: 3 },
  { id: 'recent-orders', name: 'Recent Orders', description: 'Latest transactions feed', enabled: true, order: 4 },
  { id: 'storage-usage', name: 'Storage Usage', description: 'Cloud storage capacity and sync status', enabled: false, order: 5 },
];

export default function WidgetCustomizationModal({ isOpen, onClose, onSave, initialWidgets }: WidgetCustomizationModalProps) {
  const [widgets, setWidgets] = useState<WidgetConfig[]>(
    initialWidgets && initialWidgets.length > 0 
      ? [...initialWidgets].sort((a, b) => a.order - b.order)
      : [...DEFAULT_WIDGETS]
  );

  if (!isOpen) return null;

  const handleToggle = (id: string) => {
    setWidgets(prev => prev.map(w => w.id === id ? { ...w, enabled: !w.enabled } : w));
  };

  const moveWidget = (index: number, direction: 'up' | 'down') => {
    if ((direction === 'up' && index === 0) || (direction === 'down' && index === widgets.length - 1)) {
      return;
    }
    
    const newWidgets = [...widgets];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    
    // Swap
    const temp = newWidgets[index];
    newWidgets[index] = newWidgets[swapIndex];
    newWidgets[swapIndex] = temp;
    
    // Reassign order
    const reordered = newWidgets.map((w, i) => ({ ...w, order: i }));
    setWidgets(reordered);
  };

  const handleReset = () => {
    setWidgets([...DEFAULT_WIDGETS]);
  };

  const handleSave = () => {
    onSave(widgets);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-gray-900/50 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-2xl bg-white rounded-xl shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
              <LayoutGrid className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Customize Dashboard</h2>
              <p className="text-sm text-gray-500">Enable and arrange widgets for your master overview.</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 hover:bg-gray-100 p-2 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
          <div className="space-y-3">
            {widgets.map((widget, index) => (
              <div 
                key={widget.id} 
                className={`flex items-center justify-between p-4 rounded-xl border bg-white shadow-sm transition-all ${widget.enabled ? 'border-gray-200' : 'border-dashed border-gray-300 opacity-60'}`}
              >
                <div className="flex items-center gap-4 flex-1">
                  <div className="flex flex-col gap-1">
                    <button 
                      onClick={() => moveWidget(index, 'up')}
                      disabled={index === 0}
                      className="text-gray-400 hover:text-blue-600 disabled:opacity-30 disabled:hover:text-gray-400 p-1"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => moveWidget(index, 'down')}
                      disabled={index === widgets.length - 1}
                      className="text-gray-400 hover:text-blue-600 disabled:opacity-30 disabled:hover:text-gray-400 p-1"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-gray-900">{widget.name}</h3>
                      {!widget.enabled && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600">
                          <EyeOff className="w-3 h-3" />
                          Hidden
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mt-0.5">{widget.description}</p>
                  </div>
                </div>

                <div className="ml-4">
                  <button
                    onClick={() => handleToggle(widget.id)}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 ${widget.enabled ? 'bg-blue-600' : 'bg-gray-200'}`}
                    role="switch"
                    aria-checked={widget.enabled}
                  >
                    <span className="sr-only">Toggle {widget.name}</span>
                    <span
                      aria-hidden="true"
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${widget.enabled ? 'translate-x-5' : 'translate-x-0'}`}
                    />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-white rounded-b-xl">
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <RotateCcw className="w-4 h-4" />
            Reset to Default
          </button>
          
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-sm"
            >
              <Save className="w-4 h-4" />
              Save Layout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
