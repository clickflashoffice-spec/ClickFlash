
import React from 'react';
import { PERMISSIONS, ALL_PERMISSIONS } from '../../permissions';
import { AppRole, Permission } from '../../types';
import Card from '../common/Card';

const MASTER_PORTAL_ROLES: AppRole[] = ['Admin', 'Team Leader', 'Photographer'];

const PERMISSION_GROUPS: { title: string; filter: (p: string) => boolean }[] = [
    { 
        title: 'Core Access & Navigation', 
        filter: p => p.startsWith('view') && !p.includes('Orders') && !p.includes('Albums') && !p.includes('Photographers') && !p.includes('Bookings') && !p.includes('Settings') 
    },
    { 
        title: 'Albums & Photos', 
        filter: p => p.includes('Albums') 
    },
    { 
        title: 'Orders & Sales', 
        filter: p => p.includes('Orders') 
    },
    { 
        title: 'Team & Bookings', 
        filter: p => p.includes('Photographers') || p.includes('Bookings') 
    },
    { 
        title: 'System Configuration', 
        filter: p => p.includes('Settings') || p.includes('SessionTypes') 
    }
];

const PermissionsMatrix: React.FC = () => {
    const relevantPermissions = ALL_PERMISSIONS.filter(p => 
        !p.startsWith('viewManagement') && 
        !p.startsWith('manage') && // Exclude general manage if not specific
        p !== 'manageAdjustments' && // Management portal specific
        p !== 'manageEquipmentCategories' && // Management portal specific
        p !== 'manageExpenseCategories' && // Management portal specific
        p !== 'manageGlobalSettings' && // Management portal specific
        p !== 'runPayroll' // Management portal specific
    );
    
    // Include specific management permissions relevant to master if needed, but filtering keeps it clean for now

    return (
        <Card>
            <div className="flex justify-between items-end mb-6">
                <div>
                    <h2 className="text-2xl font-bold">Role Capability Matrix</h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                        Overview of access rights for each role within the Master Portal.
                    </p>
                </div>
                 <div className="text-xs text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-2 rounded border border-slate-200 dark:border-slate-700">
                    <span className="font-bold">Note:</span> Permissions are defined in system code. <br/>Contact developer to modify.
                </div>
            </div>

            <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-lg">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300">
                            <th className="p-4 border-b border-r border-slate-200 dark:border-slate-700 font-bold w-1/3">Permission</th>
                            {MASTER_PORTAL_ROLES.map(role => (
                                <th key={role} className="p-4 border-b border-slate-200 dark:border-slate-700 text-center font-bold w-1/6">
                                    <span className={`px-2 py-1 rounded-md text-xs uppercase tracking-wide
                                        ${role === 'Admin' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300' : 
                                          role === 'Team Leader' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300' : 
                                          'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'}`}>
                                        {role}
                                    </span>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {PERMISSION_GROUPS.map(group => {
                            const groupPerms = relevantPermissions.filter(group.filter);
                            if (groupPerms.length === 0) return null;

                            return (
                                <React.Fragment key={group.title}>
                                    <tr className="bg-slate-100 dark:bg-slate-900/50">
                                        <td colSpan={MASTER_PORTAL_ROLES.length + 1} className="p-2 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                                            {group.title}
                                        </td>
                                    </tr>
                                    {groupPerms.map(permission => (
                                        <tr key={permission} className="border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                            <td className="p-3 px-4 border-r border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-300">
                                                {formatPermissionName(permission)}
                                                <div className="text-[10px] text-slate-400 font-mono mt-0.5">{permission}</div>
                                            </td>
                                            {MASTER_PORTAL_ROLES.map(role => {
                                                const hasPerm = PERMISSIONS[role]?.includes(permission as Permission) || false;
                                                return (
                                                    <td key={`${role}-${permission}`} className="p-3 text-center">
                                                        {hasPerm ? (
                                                            <div className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400">
                                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                                                            </div>
                                                        ) : (
                                                            <div className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-300 dark:text-slate-600">
                                                                <span className="text-xs">•</span>
                                                            </div>
                                                        )}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))}
                                </React.Fragment>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </Card>
    );
};

function formatPermissionName(perm: string): string {
    return perm
        .replace(/([A-Z])/g, ' $1') // Insert space before capital letters
        .replace(/^./, str => str.toUpperCase()) // Capitalize first letter
        .replace('Own', ' Own')
        .replace('All', ' All');
}

export default PermissionsMatrix;
