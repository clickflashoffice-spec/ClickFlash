import React, { useState, useEffect, useCallback } from 'react';
import { Photographer, Destination } from '../../../types';
import { apiService } from '../../../services/apiService';
import UserEditModal from '../../modals/UserEditModal';
import Spinner from '../../common/Spinner';
import { usePermissions } from '../../../hooks/usePermissions';

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
    
     const handleDeleteUser = async (userId: number, userName: string) => {
        if (window.confirm(`Are you sure you want to delete the user "${userName}"?`)) {
            try {
                await apiService.deleteUser(userId);
                fetchUsers(); // Refresh list
            } catch (err) {
                console.error("Failed to delete user", err);
            }
        }
    };

    if (loading) return <Spinner />;
    if (error) return <p className="text-red-500">{error}</p>;

    return (
        <div>
             <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">Manage Users & Roles</h2>
                {can('manageGlobalSettings') && (
                    <button onClick={() => handleOpenModal()} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg">Add User</button>
                )}
            </div>
            <div className="overflow-x-auto">
                 <table className="w-full text-left min-w-[720px]">
                    <thead className="border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400">
                        <tr>
                            <th className="p-4">Name</th>
                            <th className="p-4">Email</th>
                            <th className="p-4">Role</th>
                            <th className="p-4">Destination</th>
                            <th className="p-4 text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map(user => {
                            const destination = destinations.find(d => d.id === user.destinationId);
                            return (
                            <tr key={user.id} className="border-b border-slate-200 dark:border-slate-700/50">
                                <td className="p-4 flex items-center space-x-3">
                                    <img src={user.avatarUrl} alt={user.name} className="w-10 h-10 rounded-full" />
                                    <span>{user.name}</span>
                                </td>
                                <td className="p-4">{user.email}</td>
                                <td className="p-4">{user.role}</td>
                                <td className="p-4">{destination?.name || 'N/A'}</td>
                                <td className="p-4 text-center space-x-2">
                                    {can('manageGlobalSettings') && (
                                        <>
                                            <button onClick={() => handleOpenModal(user)} className="text-blue-500 hover:text-blue-400 font-semibold">Edit</button>
                                            <button onClick={() => handleDeleteUser(user.id, user.name)} className="text-red-500 hover:text-red-400 font-semibold">Delete</button>
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
                    availableRoles={['CEO', 'Manager', 'Team Leader']}
                />
            )}
        </div>
    );
};

export default UserManagement;
