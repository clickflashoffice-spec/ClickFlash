import React, { useState } from 'react';
import { X, Box, Check, Cpu, Eye, Printer, Truck } from 'lucide-react';

export interface FigureOrderOptions {
  style: 'realistic' | 'cartoon' | 'chibi';
  size: '10cm' | '15cm' | '20cm';
  material: 'pla' | 'resin' | 'fullcolor';
}

interface FigurePreview3DProps {
  isOpen: boolean;
  onClose: () => void;
  photoUrl: string;
  photoId: string;
  onOrder: (options: FigureOrderOptions) => void;
}

const MATERIAL_PRICES = {
  pla: 29,
  resin: 49,
  fullcolor: 79,
};

const SIZE_MULTIPLIERS = {
  '10cm': 1,
  '15cm': 1.5,
  '20cm': 2.5,
};

export default function FigurePreview3D({
  isOpen,
  onClose,
  photoUrl,
  photoId,
  onOrder,
}: FigurePreview3DProps) {
  const [style, setStyle] = useState<FigureOrderOptions['style']>('realistic');
  const [size, setSize] = useState<FigureOrderOptions['size']>('10cm');
  const [material, setMaterial] = useState<FigureOrderOptions['material']>('resin');

  if (!isOpen) return null;

  const basePrice = MATERIAL_PRICES[material];
  const sizeMultiplier = SIZE_MULTIPLIERS[size];
  const totalPrice = Math.round(basePrice * sizeMultiplier);

  const handleOrder = () => {
    onOrder({ style, size, material });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl flex flex-col my-8">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Box className="w-6 h-6 text-cyan-500" />
            3D Figure Studio
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white transition-colors rounded-full hover:bg-slate-800"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col lg:flex-row min-h-0">
          {/* Left: Preview Area */}
          <div className="w-full lg:w-1/2 p-8 flex flex-col items-center justify-center bg-slate-900 border-r border-slate-800">
            <div className="relative w-full max-w-md aspect-square flex items-center justify-center perspective-[1000px]">
              <div
                className="relative w-3/4 h-3/4 animate-[spin_8s_linear_infinite]"
                style={{ transformStyle: 'preserve-3d' }}
              >
                {/* Simulated 3D object using the photo */}
                <div
                  className="absolute inset-0 bg-cover bg-center rounded-xl shadow-2xl border-4 border-slate-800/50"
                  style={{
                    backgroundImage: `url(${photoUrl || 'https://via.placeholder.com/400'})`,
                    transform: 'translateZ(20px)',
                  }}
                />
                <div
                  className="absolute inset-0 bg-cyan-500/10 rounded-xl blur-xl"
                  style={{ transform: 'translateZ(-20px)' }}
                />
              </div>
            </div>
            <p className="mt-6 text-slate-400 text-sm flex items-center gap-2">
              <Eye className="w-4 h-4" />
              Interactive Turntable Preview
            </p>
          </div>

          {/* Right: Configuration Panel */}
          <div className="w-full lg:w-1/2 p-6 lg:p-8 flex flex-col gap-8 overflow-y-auto">
            {/* Style Selector */}
            <div className="space-y-3">
              <label className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
                Art Style
              </label>
              <div className="grid grid-cols-3 gap-3">
                {(['realistic', 'cartoon', 'chibi'] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setStyle(s)}
                    className={`relative p-3 rounded-xl border transition-all text-sm capitalize font-medium ${
                      style === s
                        ? 'border-cyan-500 bg-cyan-500/10 text-white'
                        : 'border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    {style === s && (
                      <Check className="absolute top-2 right-2 w-4 h-4 text-cyan-500" />
                    )}
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Size Selector */}
            <div className="space-y-3">
              <label className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
                Figure Size
              </label>
              <div className="flex flex-wrap gap-3">
                {(['10cm', '15cm', '20cm'] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setSize(s)}
                    className={`px-6 py-2.5 rounded-full border transition-all text-sm font-medium ${
                      size === s
                        ? 'border-cyan-500 bg-cyan-500 text-slate-950'
                        : 'border-slate-800 bg-slate-900 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Material Selector */}
            <div className="space-y-3">
              <label className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
                Material & Finish
              </label>
              <div className="grid grid-cols-1 gap-3">
                {[
                  { id: 'pla', name: 'Standard PLA', price: 29, desc: 'Durable, single color base' },
                  { id: 'resin', name: 'High-Detail Resin', price: 49, desc: 'Ultra-smooth surface finish' },
                  { id: 'fullcolor', name: 'Full-Color Sandstone', price: 79, desc: 'Photorealistic colored prints' },
                ].map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setMaterial(m.id as any)}
                    className={`flex items-center justify-between p-4 rounded-xl border text-left transition-all ${
                      material === m.id
                        ? 'border-cyan-500 bg-cyan-500/10'
                        : 'border-slate-800 bg-slate-900 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className={`font-semibold ${material === m.id ? 'text-white' : 'text-slate-200'}`}>
                        {m.name}
                      </div>
                      <div className="text-sm text-slate-400 mt-1">{m.desc}</div>
                    </div>
                    <div className="text-right">
                      <div className={`font-bold ${material === m.id ? 'text-cyan-400' : 'text-slate-300'}`}>
                        €{m.price}
                      </div>
                      <div className="text-xs text-slate-500">base</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Total and CTA */}
            <div className="mt-auto pt-6 border-t border-slate-800">
              <div className="flex items-end justify-between mb-6">
                <div>
                  <div className="text-sm text-slate-400">Total Price</div>
                  <div className="text-3xl font-bold text-white">€{totalPrice}</div>
                </div>
              </div>
              <button
                onClick={handleOrder}
                className="w-full py-4 px-6 bg-pink-500 hover:bg-pink-600 text-white font-bold rounded-xl transition-colors shadow-[0_0_20px_rgba(236,72,153,0.3)] flex items-center justify-center gap-2"
              >
                <Printer className="w-5 h-5" />
                Order My 3D Figure
              </button>
            </div>
          </div>
        </div>

        {/* Processing Steps Footer */}
        <div className="p-4 bg-slate-900 border-t border-slate-800 rounded-b-2xl">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-6 text-xs font-medium text-slate-400">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-cyan-500" />
              1. AI Mesh Generation
            </div>
            <span className="hidden sm:inline text-slate-600">→</span>
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-cyan-500" />
              2. Quality Check
            </div>
            <span className="hidden sm:inline text-slate-600">→</span>
            <div className="flex items-center gap-2">
              <Printer className="w-4 h-4 text-cyan-500" />
              3. 3D Printing
            </div>
            <span className="hidden sm:inline text-slate-600">→</span>
            <div className="flex items-center gap-2">
              <Truck className="w-4 h-4 text-cyan-500" />
              4. Shipping
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
