
import React, { useState } from 'react';
import Card from '../common/Card';
import PayrollSettings from './settings/PayrollSettings';
import CurrencySettings from './settings/CurrencySettings';
import UserManagement from './settings/UserManagement';
import ExpenseCategorySettings from './settings/ExpenseCategorySettings';
import { Photographer } from '../../types';
import { usePermissions } from '../../hooks/usePermissions';
import PermissionsMatrix from './settings/PermissionsMatrix';
import ConnectionSettings from './settings/ConnectionSettings';
import CustomerPortalSettings from './settings/CustomerPortalSettings';
import SessionTypesSettings from './settings/SessionTypesSettings';
import EquipmentCategorySettings from './settings/EquipmentCategorySettings';
import GlobalFeatureSettings from './settings/GlobalFeatureSettings';

type SettingsTab = 'Connection' | 'Customer Portal' | 'Users' | 'Permissions' | 'Payroll' | 'Currencies' | 'Expense Categories' | 'Equipment Categories' | 'Session Types' | 'Feature Toggles';

interface ManagementSettingsPageProps {
    currentUser: Photographer;
}

const ManagementSettingsPage: React.FC<ManagementSettingsPageProps> = ({ currentUser }) => {
    const [activeTab, setActiveTab] = useState<SettingsTab>('Connection');
    const { can } = usePermissions(currentUser);

    const TAB_GROUPS = [
        {
            title: 'Portal & Branding',
            description: 'Configure server connections and customer-facing branding.',
            tabs: [
                { name: 'Connection', component: <ConnectionSettings />, permission: can('manageGlobalSettings') },
                { name: 'Customer Portal', component: <CustomerPortalSettings />, permission: can('manageGlobalSettings') },
                { name: 'Feature Toggles', component: <GlobalFeatureSettings />, permission: can('manageGlobalSettings') },
            ]
        },
        {
            title: 'Users & Permissions',
            description: 'Manage administrator accounts and role permissions.',
            tabs: [
                { name: 'Users', component: <UserManagement currentUser={currentUser} />, permission: can('manageGlobalSettings') },
                { name: 'Permissions', component: <PermissionsMatrix />, permission: true },
            ]
        },
        {
            title: 'Financial',
            description: 'Set up payroll types, commission rates, and accepted currencies.',
            tabs: [
                { name: 'Payroll', component: <PayrollSettings />, permission: can('manageGlobalSettings') },
                { name: 'Currencies', component: <CurrencySettings />, permission: can('manageGlobalSettings') },
            ]
        },
        {
            title: 'Operations',
            description: 'Define global categories for expenses, equipment, and sessions.',
            tabs: [
                { name: 'Expense Categories', component: <ExpenseCategorySettings />, permission: can('manageExpenseCategories') },
                { name: 'Equipment Categories', component: <EquipmentCategorySettings />, permission: can('manageEquipmentCategories') },
                { name: 'Session Types', component: <SessionTypesSettings />, permission: can('manageSessionTypes') },
            ]
        }
    ];
    
    const visibleGroups = TAB_GROUPS.map(group => ({
        ...group,
        tabs: group.tabs.filter(tab => tab.permission)
    })).filter(group => group.tabs.length > 0);

    const renderTabContent = () => {
        for (const group of visibleGroups) {
            const activeTabConfig = group.tabs.find(tab => tab.name === activeTab);
            if (activeTabConfig) return activeTabConfig.component;
        }
        return null;
    };

    return (
        <div>
            <h1 className="text-3xl font-bold mb-6">Global Settings</h1>
            <div className="flex flex-col md:flex-row gap-8">
                <nav className="md:w-64 flex-shrink-0 space-y-6">
                    {visibleGroups.map(group => (
                        <div key={group.title}>
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-3 mb-2">{group.title}</h3>
                            <div className="flex flex-col space-y-1">
                                {group.tabs.map(tab => (
                                    <TabButton key={tab.name} name={tab.name as SettingsTab} activeTab={activeTab} setActiveTab={setActiveTab} />
                                ))}
                            </div>
                        </div>
                    ))}
                </nav>
                <main className="flex-grow">
                    <Card className="animate-fadeIn">{renderTabContent()}</Card>
                </main>
            </div>
        </div>
    );
};

const TabButton: React.FC<{ name: SettingsTab, activeTab: SettingsTab, setActiveTab: (tab: SettingsTab) => void }> = ({ name, activeTab, setActiveTab }) => {
    const isActive = activeTab === name;
    return (
        <button 
            onClick={() => setActiveTab(name)}
            className={`w-full text-left px-3 py-2.5 font-semibold rounded-lg transition-colors text-sm ${
                isActive 
                    ? 'bg-blue-600 text-white shadow-md' 
                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/50 hover:text-slate-900 dark:hover:text-white'
            }`}
        >
            {name}
        </button>
    );
}

export default ManagementSettingsPage;
