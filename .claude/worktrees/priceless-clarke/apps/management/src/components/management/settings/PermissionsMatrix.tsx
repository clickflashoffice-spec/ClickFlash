import React from 'react';
import { PERMISSIONS, ALL_PERMISSIONS } from '../../../permissions';
import { AppRole } from '../../../types';
import Card from '../../common/Card';

const MANAGEMENT_ROLES: AppRole[] = ['CEO', 'Admin', 'Manager', 'Team Leader'];

const PermissionsMatrix: React.FC = () => {
    return (
        <Card>
            <h2 className="text-2xl font-bold mb-4">Management Portal Role Permissions</h2>
            <p className="text-slate-400 mb-6">This is a read-only overview of what each management role can do.</p>
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-100">
                            <th className="p-3 border border-slate-200 font-semibold">Permission</th>
                            {MANAGEMENT_ROLES.map(role => (
                                <th key={role} className="p-3 border border-slate-200 text-center font-semibold">{role}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {ALL_PERMISSIONS.filter(p => p.includes('Management') || p.includes('Global') || p.includes('Payroll')).map(permission => (
                            <tr key={permission} className="border-b border-slate-200">
                                <td className="p-3 border border-slate-200 font-mono text-sm">{permission}</td>
                                {MANAGEMENT_ROLES.map(role => {
                                    const hasPerm = PERMISSIONS[role]?.includes(permission) || false;
                                    return (
                                        <td key={role + '-' + permission} className="p-3 border border-slate-200 text-center">
                                            {hasPerm ? (
                                                <span className="text-green-500">✓</span>
                                            ) : (
                                                <span className="text-red-500">✗</span>
                                            )}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </Card>
    );
};

export default PermissionsMatrix;
