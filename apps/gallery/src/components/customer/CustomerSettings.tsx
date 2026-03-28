import React, { useState } from 'react';
import Card from '../common/Card.tsx';
import { Order } from '../../types';
import ConfirmationModal from '../common/ConfirmationModal.tsx';

interface CustomerSettingsProps {
    order: Order;
    onLogout: () => void;
}

const CustomerSettings: React.FC<CustomerSettingsProps> = ({ order, onLogout }) => {
    const [phone, setPhone] = useState('');
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    const handleRequestDeletion = () => {
        setIsDeleteModalOpen(false);
        // In a real app, this would trigger a backend process for GDPR compliance.
        alert("Your data deletion request has been submitted. You will be logged out and your data will be anonymized within 30 days.");
        onLogout();
    };
    
    const inputStyles = "w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none";
    const buttonStyles = "bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg text-sm";


    return (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <h1 className="text-3xl font-bold mb-8">My Account</h1>
            <div className="space-y-8">
                {/* Account Information */}
                <Card>
                    <h2 className="text-xl font-bold mb-4">Account Information</h2>
                    <div className="space-y-4 max-w-md">
                        <InfoRow label="Client Name" value={order.clientName} />
                        <InfoRow label="Email Address" value={order.email} />
                        <div>
                            <label htmlFor="contact-phone" className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Contact Phone (Optional)</label>
                            <div className="flex items-center space-x-2">
                                <input id="contact-phone" type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="Add your phone number" className={inputStyles} />
                                <button onClick={() => alert('Phone number updated!')} className={buttonStyles}>Save</button>
                            </div>
                        </div>
                    </div>
                </Card>

                {/* Account Security */}
                <Card>
                    <h2 className="text-xl font-bold mb-4">Account Security</h2>
                    <div className="space-y-4 max-w-md">
                        <InfoRow label="Active Order ID" value={order.id} isMono={true} />
                        <div>
                            <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Password</label>
                            <button onClick={() => alert('A password reset link would be sent to your email.')} className={buttonStyles}>
                                Change Password
                            </button>
                        </div>
                    </div>
                </Card>

                {/* Data & Privacy */}
                 <Card>
                    <h2 className="text-xl font-bold mb-4">Data & Privacy</h2>
                    <div className="space-y-4 max-w-md">
                        <p className="text-sm text-slate-500 dark:text-slate-400">You have the right to request the deletion of your personal data associated with this order.</p>
                         <button onClick={() => setIsDeleteModalOpen(true)} className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg text-sm">
                            Request Data Deletion
                        </button>
                    </div>
                </Card>
            </div>
            <ConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleRequestDeletion}
                title="Confirm Data Deletion Request"
                message="Are you sure you want to request the permanent deletion of your data? This action cannot be undone."
                confirmButtonText="Yes, Delete My Data"
                confirmButtonVariant="danger"
            />
        </div>
    );
};

const InfoRow: React.FC<{label: string; value: string; isMono?: boolean}> = ({ label, value, isMono }) => (
    <div>
        <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</h3>
        <p className={`text-lg ${isMono ? 'font-mono' : ''}`}>{value}</p>
    </div>
);


export default CustomerSettings;