import React, { useState, useEffect } from 'react';
import { Photographer } from '../../types';
import { apiService } from '../../services/apiService';
import FaceEnrollmentSection from './FaceEnrollmentSection';
import { User, Mail, Camera, Shield } from 'lucide-react';

interface AccountSettingsProps {
    currentUser: Photographer;
    onCurrentUserUpdate: (user?: Photographer) => void;
    showToast: (message: string) => void;
}

const AccountSettings: React.FC<AccountSettingsProps> = ({
    currentUser,
    onCurrentUserUpdate,
    showToast
}) => {
    const [hasFaceRegistered, setHasFaceRegistered] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const checkFaceStatus = async () => {
            try {
                const userData = await apiService.getUser(currentUser.id);
                setHasFaceRegistered(!!userData.faceDescriptor);
            } catch (err) {
                console.error('Failed to check face status:', err);
            } finally {
                setIsLoading(false);
            }
        };

        checkFaceStatus();
    }, [currentUser.id]);

    const handleEnrollmentComplete = () => {
        setHasFaceRegistered(true);
        showToast('Face enrolled successfully! You can now log in with Face ID.');
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">My Account</h2>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">
                        Manage your profile and authentication settings
                    </p>
                </div>
            </div>

            {/* Profile Card */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center">
                    <User className="w-5 h-5 mr-2 text-blue-500" />
                    Profile Information
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex items-center space-x-4">
                        <img
                            src={currentUser.avatarUrl || 'https://i.imgur.com/3Y2j2s2.png'}
                            alt={currentUser.name}
                            className="w-16 h-16 rounded-full object-cover border-2 border-slate-200 dark:border-slate-700"
                        />
                        <div>
                            <p className="font-medium text-slate-900 dark:text-white">{currentUser.name}</p>
                            <p className="text-sm text-slate-500 dark:text-slate-400 capitalize">{currentUser.role}</p>
                        </div>
                    </div>
                    
                    <div className="space-y-3">
                        <div className="flex items-center text-slate-700 dark:text-slate-300">
                            <Mail className="w-4 h-4 mr-2 text-slate-400" />
                            <span>{currentUser.email}</span>
                        </div>
                        <div className="flex items-center text-slate-700 dark:text-slate-300">
                            <Camera className="w-4 h-4 mr-2 text-slate-400" />
                            <span>{currentUser.specialty || 'No specialty set'}</span>
                        </div>
                    </div>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        To update your profile information, contact an administrator.
                    </p>
                </div>
            </div>

            {/* Face Enrollment Section */}
            {isLoading ? (
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
                    <div className="flex items-center justify-center py-8">
                        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                        <span className="ml-3 text-slate-600 dark:text-slate-400">Loading...</span>
                    </div>
                </div>
            ) : (
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
                    <FaceEnrollmentSection
                        userId={currentUser.id}
                        userName={currentUser.name}
                        hasFaceRegistered={hasFaceRegistered}
                        onEnrollmentComplete={handleEnrollmentComplete}
                    />
                </div>
            )}

            {/* Security Note */}
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800 p-4">
                <div className="flex items-start space-x-3">
                    <Shield className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                    <div>
                        <h4 className="font-medium text-blue-900 dark:text-blue-200">Security Information</h4>
                        <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                            Your face data is stored securely using facial recognition descriptors. 
                            The actual images are not stored - only mathematical representations that 
                            cannot be reverse-engineered to recreate your photo.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AccountSettings;
