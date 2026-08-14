import { Card } from "@clickflash/ui";

import React, { useState, useEffect } from 'react';

import useSystemSetting from '../../hooks/useSystemSetting';
import { logger } from '@/utils/logger';

const DEFAULT_SETTINGS = {
    logoUrl: '/logo.png',
    companyName: 'Star Master Photography',
    addressLine1: '123 Hotel Avenue',
    addressLine2: 'Sousse, Tunisia',
    taxName: 'VAT',
    taxRate: 19,
    registrationNumber: 'RC: 12345678',
    thankYouMessage: 'Thank you for your purchase! We hope you enjoy your photos.',
    loginInstructions: 'To access your digital gallery, please visit our website and log in using the credentials below.',
    galleryUrl: 'https://starmaster.photo/gallery',
    footerText: 'For support, contact us at photos@example.com',
};

const CustomerReceiptSettings: React.FC = () => {
    const [settings, setSettings, loading] = useSystemSetting('receipt_config', DEFAULT_SETTINGS);
    const [logoPreview, setLogoPreview] = useState(settings.logoUrl);

    useEffect(() => {
        if (!loading) {
            setLogoPreview(settings.logoUrl);
        }
    }, [settings.logoUrl, loading]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        setSettings({
            ...settings,
            [name]: type === 'number' ? parseFloat(value) : value
        });
    };

    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = reader.result as string;
                setLogoPreview(base64String);
                setSettings({ ...settings, logoUrl: base64String });
            };
            reader.onerror = () => {
                logger.error('Failed to read logo image file');
            };
            reader.readAsDataURL(file);
        }
    };

    const inputStyles = "w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none";
    const labelStyles = "block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1";

    if (loading) return <div className="p-8 text-center text-slate-500">Loading receipt settings...</div>;

    return (
        <Card>
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">Customer Receipt & Invoicing</h2>
            </div>
            <p className="text-slate-400 mb-6">Customize the receipt that is printed for customers. Ensure tax and legal information is correct.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-6">
                    <div>
                        <label className={labelStyles + " mb-2"}>Company Logo</label>
                        <div className="flex items-center space-x-4">
                            <img src={logoPreview} alt="Logo Preview" className="w-20 h-20 rounded-lg bg-slate-200 dark:bg-slate-700 object-cover" />
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleLogoChange}
                                className="block w-full text-sm text-slate-500 dark:text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-100 file:text-blue-700 dark:file:bg-blue-900/50 dark:file:text-blue-300 hover:file:bg-blue-200 dark:hover:file:bg-blue-800/50"
                            />
                        </div>
                    </div>
                    <div>
                        <label htmlFor="companyName" className={labelStyles}>Company Name</label>
                        <input type="text" id="companyName" name="companyName" value={settings.companyName} onChange={handleChange} className={inputStyles} />
                    </div>
                    <div>
                        <label htmlFor="addressLine1" className={labelStyles}>Address Line 1</label>
                        <input type="text" id="addressLine1" name="addressLine1" value={settings.addressLine1} onChange={handleChange} className={inputStyles} placeholder="Street Address" />
                    </div>
                    <div>
                        <label htmlFor="addressLine2" className={labelStyles}>Address Line 2</label>
                        <input type="text" id="addressLine2" name="addressLine2" value={settings.addressLine2} onChange={handleChange} className={inputStyles} placeholder="City, Country, Zip" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="taxName" className={labelStyles}>Tax Name</label>
                            <input type="text" id="taxName" name="taxName" value={settings.taxName} onChange={handleChange} className={inputStyles} placeholder="VAT" />
                        </div>
                        <div>
                            <label htmlFor="taxRate" className={labelStyles}>Tax Rate (%)</label>
                            <input type="number" id="taxRate" name="taxRate" value={settings.taxRate} onChange={handleChange} className={inputStyles} />
                        </div>
                    </div>
                    <div>
                        <label htmlFor="registrationNumber" className={labelStyles}>Registration / VAT Number</label>
                        <input type="text" id="registrationNumber" name="registrationNumber" value={settings.registrationNumber} onChange={handleChange} className={inputStyles} />
                    </div>
                </div>

                <div className="space-y-6">
                    <div>
                        <label htmlFor="thankYouMessage" className={labelStyles}>Thank You Message</label>
                        <textarea id="thankYouMessage" name="thankYouMessage" value={settings.thankYouMessage} onChange={handleChange} className={`${inputStyles} h-20`} />
                    </div>
                    <div>
                        <label htmlFor="loginInstructions" className={labelStyles}>Login Instructions</label>
                        <textarea id="loginInstructions" name="loginInstructions" value={settings.loginInstructions} onChange={handleChange} className={`${inputStyles} h-24`} />
                    </div>
                    <div>
                        <label htmlFor="galleryUrl" className={labelStyles}>Customer Gallery URL</label>
                        <input type="text" id="galleryUrl" name="galleryUrl" value={settings.galleryUrl} onChange={handleChange} className={inputStyles} />
                    </div>
                    <div>
                        <label htmlFor="footerText" className={labelStyles}>Footer Text</label>
                        <input type="text" id="footerText" name="footerText" value={settings.footerText} onChange={handleChange} className={inputStyles} />
                    </div>
                </div>
            </div>
        </Card>
    );
};

export default CustomerReceiptSettings;
