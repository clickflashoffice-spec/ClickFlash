import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import { EcommerceExtension } from '../../types';

interface ExtensionConfigModalProps {
    isOpen: boolean;
    onClose: () => void;
    extension: EcommerceExtension;
    onSave: (id: string, config: Record<string, string>) => void;
}

const ExtensionConfigModal: React.FC<ExtensionConfigModalProps> = ({ isOpen, onClose, extension, onSave }) => {
    const [config, setConfig] = useState<Record<string, string>>({});

    useEffect(() => {
        if (extension) {
            setConfig((extension.config as Record<string, string>) || {});
        }
    }, [extension]);

    const handleChange = (key: string, value: string) => {
        setConfig(prev => ({ ...prev, [key]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(extension.id, config);
        onClose();
    };

    const inputStyles = "w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none";
    const labelStyles = "block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1 capitalize";

    if (!extension) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Configure ${extension.name}`}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg flex items-start space-x-3">
                    <div className="text-2xl">{extension.icon}</div>
                    <div>
                        <p className="text-sm text-blue-800 dark:text-blue-200">{extension.description}</p>
                    </div>
                </div>

                {Object.keys(config).length === 0 ? (
                    <p className="text-slate-500 italic">No configuration required for this extension.</p>
                ) : (
                    Object.keys(config).map((key) => (
                        <div key={key}>
                            <label htmlFor={key} className={labelStyles}>{key.replace(/([A-Z])/g, ' $1').trim()}</label>
                            <input
                                type={key.toLowerCase().includes('secret') || key.toLowerCase().includes('key') ? "password" : "text"}
                                id={key}
                                value={config[key]}
                                onChange={(e) => handleChange(key, e.target.value)}
                                className={inputStyles}
                                required
                            />
                        </div>
                    ))
                )}

                <div className="pt-4 flex justify-end space-x-3 border-t border-slate-200 dark:border-slate-700">
                    <button type="button" onClick={onClose} className="bg-slate-200 dark:bg-slate-600 hover:bg-slate-300 dark:hover:bg-slate-500 text-slate-800 dark:text-white font-semibold py-2 px-4 rounded-lg transition-colors">Cancel</button>
                    <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors">Save Configuration</button>
                </div>
            </form>
        </Modal>
    );
};

export default ExtensionConfigModal;
