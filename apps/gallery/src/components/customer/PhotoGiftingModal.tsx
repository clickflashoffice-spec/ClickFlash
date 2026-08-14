import { Modal } from '@clickflash/ui';
import React, { useState } from 'react';

interface PhotoGiftingModalProps {
    isOpen: boolean;
    onClose: () => void;
    galleryTitle?: string;
    onAddToCart: (giftPackage: any) => void;
}

const GIFT_PACKAGES = [
    { id: 'full-gallery', name: 'Full Gallery Access', price: 149.99, description: 'Unlock all high-res digital downloads.' },
    { id: 'digital-5', name: 'Digital 5-Pack', price: 49.99, description: 'Allows recipient to choose their top 5 photos.' },
    { id: 'custom', name: 'Gift Card Amount', price: 50.00, description: 'Give store credit towards prints and downloads.', isVariable: true }
];

const PhotoGiftingModal: React.FC<PhotoGiftingModalProps> = ({ 
    isOpen, 
    onClose, 
    galleryTitle = 'Your Memories',
    onAddToCart 
}) => {
    const [recipientName, setRecipientName] = useState('');
    const [recipientEmail, setRecipientEmail] = useState('');
    const [deliveryDate, setDeliveryDate] = useState('');
    const [giftMessage, setGiftMessage] = useState('Hope you enjoy these memories!');
    const [selectedPackage, setSelectedPackage] = useState(GIFT_PACKAGES[0]);
    const [customAmount, setCustomAmount] = useState('50');

    const handleAddToCart = () => {
        if (!recipientName || !recipientEmail) {
            alert('Please fill out the recipient name and email.');
            return;
        }
        
        onAddToCart({
            type: 'gift',
            packageId: selectedPackage.id,
            price: selectedPackage.isVariable ? parseFloat(customAmount) : selectedPackage.price,
            recipientName,
            recipientEmail,
            deliveryDate,
            giftMessage
        });
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Send Photos as a Gift" size="xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Configuration Form */}
                <div className="space-y-6">
                    <section>
                        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-4">Select Gift Package</h3>
                        <div className="space-y-3">
                            {GIFT_PACKAGES.map(pkg => (
                                <div 
                                    key={pkg.id}
                                    onClick={() => setSelectedPackage(pkg)}
                                    className={`p-4 border rounded-xl cursor-pointer transition-all ${
                                        selectedPackage.id === pkg.id 
                                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 ring-2 ring-blue-500/20' 
                                        : 'border-slate-200 dark:border-slate-700 hover:border-blue-300'
                                    }`}
                                >
                                    <div className="flex justify-between items-center mb-1">
                                        <h4 className="font-semibold text-slate-800 dark:text-slate-200">{pkg.name}</h4>
                                        <span className="font-bold text-blue-600 dark:text-blue-400">
                                            {pkg.isVariable ? 'Custom' : `$${pkg.price.toFixed(2)}`}
                                        </span>
                                    </div>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">{pkg.description}</p>
                                    
                                    {pkg.isVariable && selectedPackage.id === pkg.id && (
                                        <div className="mt-3 flex items-center gap-2" onClick={e => e.stopPropagation()}>
                                            <span className="text-slate-600 dark:text-slate-400">$</span>
                                            <input 
                                                type="number" 
                                                min="10"
                                                step="5"
                                                value={customAmount}
                                                onChange={e => setCustomAmount(e.target.value)}
                                                className="w-24 px-2 py-1 border rounded bg-white dark:bg-slate-800"
                                            />
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </section>

                    <section className="space-y-4">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">Recipient Details</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Recipient Name</label>
                                <input 
                                    type="text" 
                                    value={recipientName}
                                    onChange={e => setRecipientName(e.target.value)}
                                    className="w-full px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-800 dark:border-slate-700" 
                                    placeholder="Jane Doe"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Delivery Date</label>
                                <input 
                                    type="date" 
                                    value={deliveryDate}
                                    onChange={e => setDeliveryDate(e.target.value)}
                                    className="w-full px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-800 dark:border-slate-700" 
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Recipient Email</label>
                            <input 
                                type="email" 
                                value={recipientEmail}
                                onChange={e => setRecipientEmail(e.target.value)}
                                className="w-full px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-800 dark:border-slate-700" 
                                placeholder="jane@example.com"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Gift Message</label>
                            <textarea 
                                value={giftMessage}
                                onChange={e => setGiftMessage(e.target.value)}
                                rows={3}
                                className="w-full px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-800 dark:border-slate-700 resize-none" 
                            />
                        </div>
                    </section>
                </div>

                {/* Preview Card */}
                <div className="bg-slate-50 dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 flex flex-col">
                    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Email Preview</h3>
                    <div className="flex-1 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden flex flex-col">
                        <div className="h-32 bg-gradient-to-br from-blue-500 to-cyan-400 relative">
                            <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-4xl">🎁</span>
                            </div>
                        </div>
                        <div className="p-6 text-center space-y-4">
                            <h4 className="text-xl font-serif text-slate-800 dark:text-slate-100">
                                You've received a gift!
                            </h4>
                            <p className="text-slate-600 dark:text-slate-400">
                                Hi {recipientName || 'Friend'}, you've been sent the <strong className="text-slate-800 dark:text-slate-200">{selectedPackage.name}</strong> for "{galleryTitle}".
                            </p>
                            <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg italic text-slate-600 dark:text-slate-400">
                                "{giftMessage}"
                            </div>
                            <button className="w-full py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-lg font-bold opacity-50 cursor-not-allowed">
                                Redeem Gift
                            </button>
                        </div>
                    </div>
                    
                    <div className="mt-6">
                        <button 
                            onClick={handleAddToCart}
                            className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-colors shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2"
                        >
                            <span>Add to Cart</span>
                            <span>•</span>
                            <span>${selectedPackage.isVariable ? parseFloat(customAmount || '0').toFixed(2) : selectedPackage.price.toFixed(2)}</span>
                        </button>
                    </div>
                </div>
            </div>
        </Modal>
    );
};

export default PhotoGiftingModal;
