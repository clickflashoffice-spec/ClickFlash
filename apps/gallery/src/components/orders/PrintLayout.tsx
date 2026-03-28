
import React from 'react';
import { Order } from '../../types';
import useLocalStorage from '../../hooks/useLocalStorage';
import { WatermarkSettingsType } from '../settings/WatermarkSettings';

interface PrintLayoutProps {
  order: Order;
}

const PrintLayout: React.FC<PrintLayoutProps> = ({ order }) => {
    // Watermark settings are kept in case the lab sheet is used as a proof sheet
    const [watermarkSettings] = useLocalStorage<WatermarkSettingsType>('watermarkSettings', {
        enabled: false,
        imageUrl: '',
        opacity: 50,
        scale: 30,
        position: 'center',
        dynamicProtection: false,
    });

    const getWatermarkStyle = () => {
        if (!watermarkSettings.enabled || !watermarkSettings.imageUrl) return {};

        const baseStyle: React.CSSProperties = {
            position: 'absolute',
            opacity: watermarkSettings.opacity / 100,
            width: `${watermarkSettings.scale}%`,
            height: 'auto',
            pointerEvents: 'none',
            zIndex: 10
        };

        switch (watermarkSettings.position) {
            case 'top-left': return { ...baseStyle, top: '10px', left: '10px' };
            case 'top-center': return { ...baseStyle, top: '10px', left: '50%', transform: 'translate(-50%, 0)' };
            case 'top-right': return { ...baseStyle, top: '10px', right: '10px' };
            case 'center-left': return { ...baseStyle, top: '50%', left: '10px', transform: 'translate(0, -50%)' };
            case 'center': return { ...baseStyle, top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
            case 'center-right': return { ...baseStyle, top: '50%', right: '10px', transform: 'translate(0, -50%)' };
            case 'bottom-left': return { ...baseStyle, bottom: '10px', left: '10px' };
            case 'bottom-center': return { ...baseStyle, bottom: '10px', left: '50%', transform: 'translate(-50%, 0)' };
            case 'bottom-right': return { ...baseStyle, bottom: '10px', right: '10px' };
            default: return { ...baseStyle, top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
        }
    };

    // Generate a simple barcode pattern based on ID length
    const renderBarcode = (text: string) => {
        return (
            <div className="flex h-12 items-end space-x-[2px]">
                {text.split('').map((char, i) => (
                    <div 
                        key={i} 
                        className={`bg-black ${i % 2 === 0 ? 'h-full' : 'h-3/4'}`} 
                        style={{ width: char.charCodeAt(0) % 3 + 2 + 'px' }}
                    ></div>
                ))}
            </div>
        );
    };

    return (
        <div className="printable-area p-8 bg-white text-black font-sans max-w-[210mm] mx-auto">
            <header className="border-b-4 border-black pb-6 mb-6 flex justify-between items-start">
                <div>
                    <h1 className="text-4xl font-extrabold uppercase tracking-tighter mb-2">Lab Sheet</h1>
                    <div className="flex items-center space-x-4">
                        <div className="text-3xl font-mono font-bold">{order.id}</div>
                        {renderBarcode(order.id)}
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-2xl font-bold">{order.clientName}</p>
                    <p className="text-lg text-gray-600">Room: <strong>{/* We don't have room in Order type directly easily accessible without join, assume Client Name context or add if available */} {order.email}</strong></p>
                    <p className="text-sm text-gray-500 mt-1">Date: {new Date(order.date).toLocaleDateString()} • {new Date().toLocaleTimeString()}</p>
                </div>
            </header>
            
            <div className="grid grid-cols-3 gap-4">
                {order.items.map((item, index) => (
                    <div key={item.id} className="break-inside-avoid border-2 border-gray-800 rounded-xl overflow-hidden flex flex-col shadow-sm relative">
                        {/* Checkbox for Operator */}
                        <div className="absolute top-2 left-2 z-20 w-6 h-6 border-2 border-black bg-white/80 rounded-sm"></div>

                        <div className="relative bg-gray-100 aspect-[4/3] flex items-center justify-center border-b-2 border-gray-800 overflow-hidden">
                            {item.photo ? (
                                <>
                                    <img src={item.photo.url} alt={item.photo.title} className="w-full h-full object-contain" />
                                    {watermarkSettings.enabled && watermarkSettings.imageUrl && (
                                        <img src={watermarkSettings.imageUrl} style={getWatermarkStyle()} alt="" />
                                    )}
                                </>
                            ) : (
                                <span className="text-gray-400 font-bold">No Preview</span>
                            )}
                             {/* Quantity Badge */}
                             {item.quantity > 1 && (
                                <div className="absolute bottom-2 right-2 bg-black text-white text-xl font-extrabold px-3 py-1 rounded-md shadow-md border-2 border-white">
                                    x{item.quantity}
                                </div>
                             )}
                        </div>
                        <div className="p-3 bg-white flex flex-col justify-between flex-grow">
                            <div className="flex justify-between items-center mb-1 border-b border-gray-200 pb-2">
                                <span className="font-extrabold text-lg uppercase leading-none">{item.format}</span>
                                {item.quantity === 1 && <span className="font-bold text-gray-500">x1</span>}
                            </div>
                            <div>
                                <p className="text-xs font-mono text-gray-500 truncate" title={item.photo?.title}>
                                    File: {item.photo?.title || item.name}
                                </p>
                                {item.name.toLowerCase().includes('ai') && (
                                    <p className="text-[10px] font-bold text-white bg-purple-600 inline-block px-1.5 rounded mt-1 uppercase tracking-wide">AI Edit</p>
                                )}
                            </div>
                            <div className="mt-2 text-[10px] text-right text-gray-400">
                                #{index + 1}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <footer className="mt-12 pt-6 border-t-4 border-black">
                <div className="flex justify-between items-end">
                    <div>
                        <p className="font-bold uppercase text-sm mb-8">Operator Signature:</p>
                        <div className="w-64 border-b-2 border-black"></div>
                    </div>
                    <div className="text-right">
                        <p className="text-3xl font-black">Total Items: {order.items.reduce((acc, item) => acc + item.quantity, 0)}</p>
                        <p className="text-gray-500 text-sm mt-1">Star Master OS • Fulfillment System</p>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default PrintLayout;
