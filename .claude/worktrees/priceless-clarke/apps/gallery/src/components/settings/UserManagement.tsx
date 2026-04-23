
import React, { useState, useEffect, useCallback } from 'react';
import { Photographer, Destination } from '../../types.ts';
import { apiService } from '../../services/apiService.ts';
import UserEditModal from '../modals/UserEditModal.tsx';
import Spinner from '../common/Spinner.tsx';
import { usePermissions } from '../../hooks/usePermissions.ts';

interface UserManagementProps {
    currentUser: Photographer;
}

const UserManagement: React.FC<UserManagementProps> = ({ currentUser }) => {
    const [users, setUsers] = useState<Photographer[]>([]);
    const [destinations, setDestinations] = useState<Destination[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [userToEdit, setUserToEdit] = useState<Photographer | Omit<Photographer, 'id'> | null>(null);
    const { can } = usePermissions(currentUser);

    const fetchUsers = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const [usersData, destData] = await Promise.all([
                apiService.getUsers(),
                apiService.getDestinations()
            ]);
            setUsers(usersData);
            setDestinations(destData);
        } catch (err) {
            setError("Failed to fetch users.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);
    
    const handleOpenModal = (user: Photographer | null = null) => {
        setUserToEdit(user);
        setIsModalOpen(true);
    };

    const handleDataChange = () => {
        fetchUsers();
    };
    
     const handleDeleteUser = async (userId: string | number, userName: string) => {
        if (window.confirm(`Are you sure you want to delete the user "${userName}"?`)) {
            try {
                await apiService.deleteUser(userId);
                fetchUsers(); // Refresh list
            } catch (err) {
                console.error("Failed to delete user", err);
            }
        }
    };
    
    const getRoleBadgeColor = (role: string) => {
        switch(role) {
            case 'Admin': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 border-purple-200 dark:border-purple-800';
            case 'Team Leader': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border-blue-200 dark:border-blue-800';
            case 'Manager': return 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300 border-orange-200 dark:border-orange-800';
            case 'CEO': return 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 border-red-200 dark:border-red-800';
            default: return 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-600';
        }
    };

    if (loading) return <Spinner />;
    if (error) return <p className="text-red-500">{error}</p>;

    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
             <div className="flex justify-between items-center p-6 border-b border-slate-200 dark:border-slate-700">
                <div>
                    <h2 className="text-xl font-bold">System Users</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Manage team members and their access roles.</p>
                </div>
                {can('managePhotographers') && (
                    <button onClick={() => handleOpenModal()} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg flex items-center space-x-2 shadow-md transition-transform active:scale-95">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" /></svg>
                        <span>Add User</span>
                    </button>
                )}
            </div>
            
            <div className="overflow-x-auto">
                 <table className="w-full text-left min-w-[720px]">
                    <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">
                        <tr>
                            <th className="p-4 font-semibold">User</th>
                            <th className="p-4 font-semibold">Access Role</th>
                            <th className="p-4 font-semibold">Destination</th>
                            <th className="p-4 text-center font-semibold">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                        {users.map(user => {
                            const destination = destinations.find(d => d.id === user.destinationId);
                            return (
                            <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                <td className="p-4">
                                    <div className="flex items-center space-x-3">
                                        <img src={user.avatarUrl} alt={user.name} className="w-10 h-10 rounded-full border border-slate-200 dark:border-slate-600" />
                                        <div>
                                            <p className="font-bold text-slate-900 dark:text-white">{user.name}</p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">{user.email}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="p-4">
                                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${getRoleBadgeColor(user.role)}`}>
                                        {user.role}
                                    </span>
                                </td>
                                <td className="p-4 text-sm text-slate-600 dark:text-slate-300">
                                    {destination ? (
                                        <div className="flex items-center space-x-1">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 21l-4.95-6.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" /></svg>
                                            <span>{destination.name}</span>
                                        </div>
                                    ) : (
                                        <span className="text-slate-400 italic">Unassigned</span>
                                    )}
                                </td>
                                <td className="p-4 text-center space-x-2">
                                    {can('managePhotographers') && (
                                        <>
                                            <button onClick={() => handleOpenModal(user)} className="px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/30 rounded-md transition-colors">Edit</button>
                                            <button onClick={() => handleDeleteUser(user.id, user.name)} className="px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30 rounded-md transition-colors">Delete</button>
                                        </>
                                    )}
                                </td>
                            </tr>
                        )})}
                    </tbody>
                 </table>
            </div>
            {isModalOpen && (
                <UserEditModal 
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onDataChange={handleDataChange}
                    userToEdit={userToEdit}
                    availableRoles={['Admin', 'Team Leader', 'Photographer']}
                />
            )}
        </div>
    );
};

export default UserManagement;
