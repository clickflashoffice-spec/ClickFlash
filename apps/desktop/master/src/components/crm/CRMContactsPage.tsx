import React, { useState, useMemo } from 'react';
import { Card, Button, Input, Modal } from '@clickflash/ui';
import { Download, Search, UserPlus, Edit, Mail, Phone, Calendar, Camera } from 'lucide-react';
import PageHeader from '../common/PageHeader';
import { useDebounce } from '../../hooks/useDebounce';

interface SessionHistory {
    id: string;
    date: string;
    photographer: string;
    package: string;
    photosPurchased: number;
    amountSpent: number;
}

interface CRMContact {
    id: string;
    name: string;
    roomNumber: string;
    email: string;
    phone: string;
    lastVisit: string;
    totalSpend: number;
    faceThumbnailUrl?: string;
    visits: number;
    notes: string;
    sessionHistory: SessionHistory[];
}

// Mock Data
const MOCK_CONTACTS: CRMContact[] = [
    {
        id: '1',
        name: 'Sarah Johnson',
        roomNumber: '402',
        email: 'sarah.j@example.com',
        phone: '+1 (555) 123-4567',
        lastVisit: '2026-08-01',
        totalSpend: 450.00,
        faceThumbnailUrl: 'https://i.pravatar.cc/150?u=sarah',
        visits: 2,
        notes: 'VIP guest. Prefers sunset sessions.',
        sessionHistory: [
            { id: 's1', date: '2026-08-01', photographer: 'Alex M.', package: 'Sunset Couple', photosPurchased: 15, amountSpent: 300 },
            { id: 's2', date: '2025-07-15', photographer: 'Jamie T.', package: 'Beach Mini', photosPurchased: 5, amountSpent: 150 }
        ]
    },
    {
        id: '2',
        name: 'Michael Chen',
        roomNumber: '1105',
        email: 'mchen@example.com',
        phone: '+1 (555) 987-6543',
        lastVisit: '2026-08-05',
        totalSpend: 120.00,
        faceThumbnailUrl: 'https://i.pravatar.cc/150?u=michael',
        visits: 1,
        notes: 'Family of 4.',
        sessionHistory: [
            { id: 's3', date: '2026-08-05', photographer: 'Sam R.', package: 'Family Resort Experience', photosPurchased: 5, amountSpent: 120 }
        ]
    }
];

export const CRMContactsPage: React.FC = () => {
    const [contacts, setContacts] = useState<CRMContact[]>(MOCK_CONTACTS);
    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearch = useDebounce(searchTerm, 300);
    const [selectedContact, setSelectedContact] = useState<CRMContact | null>(null);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingContact, setEditingContact] = useState<Partial<CRMContact>>({});

    const filteredContacts = useMemo(() => {
        const term = debouncedSearch.toLowerCase();
        return contacts.filter(c => 
            c.name.toLowerCase().includes(term) || 
            c.email.toLowerCase().includes(term) || 
            c.roomNumber.includes(term)
        );
    }, [contacts, debouncedSearch]);

    const handleExportCSV = () => {
        const headers = ['Name', 'Room', 'Email', 'Phone', 'Visits', 'Total Spend', 'Last Visit'];
        const csvContent = [
            headers.join(','),
            ...filteredContacts.map(c => `"${c.name}","${c.roomNumber}","${c.email}","${c.phone}",${c.visits},${c.totalSpend},"${c.lastVisit}"`)
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'crm_contacts.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleSaveContact = () => {
        if (editingContact.id) {
            setContacts(contacts.map(c => c.id === editingContact.id ? { ...c, ...editingContact } as CRMContact : c));
        } else {
            const newContact: CRMContact = {
                id: Math.random().toString(36).substr(2, 9),
                name: editingContact.name || '',
                roomNumber: editingContact.roomNumber || '',
                email: editingContact.email || '',
                phone: editingContact.phone || '',
                lastVisit: new Date().toISOString().split('T')[0],
                totalSpend: 0,
                visits: 0,
                notes: editingContact.notes || '',
                sessionHistory: []
            };
            setContacts([...contacts, newContact]);
        }
        setIsEditModalOpen(false);
    };

    const openDetails = (contact: CRMContact) => {
        setSelectedContact(contact);
        setIsDetailsModalOpen(true);
    };

    const openEdit = (contact?: CRMContact) => {
        if (contact) {
            setEditingContact(contact);
        } else {
            setEditingContact({});
        }
        setIsEditModalOpen(true);
    };

    return (
        <div className="w-full h-full p-6 flex flex-col">
            <PageHeader
                title="Guest CRM Contacts"
                subtitle="Manage and view guest history, preferences, and total lifetime value."
                actions={
                    <>
                        <Button variant="secondary" onClick={handleExportCSV} className="flex items-center gap-2">
                            <Download size={16} /> Export CSV
                        </Button>
                        <Button variant="primary" onClick={() => openEdit()} className="flex items-center gap-2">
                            <UserPlus size={16} /> Add Contact
                        </Button>
                    </>
                }
            />

            <Card className="flex-1 flex flex-col min-h-0 overflow-hidden">
                <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
                    <div className="relative max-w-md w-full">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
                        <Input
                            placeholder="Search by name, email, or room number..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 w-full"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="sticky top-0 bg-slate-50 dark:bg-slate-900 shadow-sm z-10">
                            <tr>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Guest</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Room</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Contact</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">History</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">LTV</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                            {filteredContacts.map(contact => (
                                <tr key={contact.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center gap-3">
                                            {contact.faceThumbnailUrl ? (
                                                <img src={contact.faceThumbnailUrl} alt={contact.name} className="w-10 h-10 rounded-full object-cover" />
                                            ) : (
                                                <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                                                    <Camera size={16} className="text-slate-400" />
                                                </div>
                                            )}
                                            <div className="font-medium text-slate-900 dark:text-white">{contact.name}</div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300">
                                        {contact.roomNumber || '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300">
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center gap-1"><Mail size={12}/> {contact.email}</div>
                                            <div className="flex items-center gap-1"><Phone size={12}/> {contact.phone}</div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300">
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center gap-1"><Calendar size={12}/> {contact.lastVisit}</div>
                                            <div className="text-xs text-slate-500">{contact.visits} visits</div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-white">
                                        ${contact.totalSpend.toFixed(2)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                        <div className="flex items-center gap-2">
                                            <Button variant="ghost" size="sm" onClick={() => openDetails(contact)}>View</Button>
                                            <Button variant="ghost" size="sm" onClick={() => openEdit(contact)}><Edit size={16} /></Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredContacts.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                                        No contacts found matching your search.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Guest Details Modal */}
            <Modal isOpen={isDetailsModalOpen} onClose={() => setIsDetailsModalOpen(false)} title="Guest Details">
                {selectedContact && (
                    <div className="flex flex-col gap-6">
                        <div className="flex items-start gap-4">
                            {selectedContact.faceThumbnailUrl && (
                                <img src={selectedContact.faceThumbnailUrl} alt={selectedContact.name} className="w-16 h-16 rounded-full object-cover" />
                            )}
                            <div>
                                <h3 className="text-xl font-bold">{selectedContact.name}</h3>
                                <p className="text-sm text-slate-500">Room: {selectedContact.roomNumber} | LTV: ${selectedContact.totalSpend.toFixed(2)}</p>
                            </div>
                        </div>
                        
                        <div>
                            <h4 className="font-semibold mb-2">Contact Information</h4>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div><span className="text-slate-500">Email:</span> {selectedContact.email}</div>
                                <div><span className="text-slate-500">Phone:</span> {selectedContact.phone}</div>
                            </div>
                        </div>

                        {selectedContact.notes && (
                            <div>
                                <h4 className="font-semibold mb-2">Notes</h4>
                                <p className="text-sm text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 p-3 rounded">{selectedContact.notes}</p>
                            </div>
                        )}

                        <div>
                            <h4 className="font-semibold mb-3">Session History</h4>
                            {selectedContact.sessionHistory.length > 0 ? (
                                <div className="space-y-3">
                                    {selectedContact.sessionHistory.map(session => (
                                        <Card key={session.id} className="p-3 text-sm flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
                                            <div>
                                                <div className="font-medium">{session.package}</div>
                                                <div className="text-slate-500 text-xs">{session.date} • with {session.photographer}</div>
                                            </div>
                                            <div className="text-right">
                                                <div className="font-semibold text-green-600 dark:text-green-400">${session.amountSpent.toFixed(2)}</div>
                                                <div className="text-xs text-slate-500">{session.photosPurchased} photos</div>
                                            </div>
                                        </Card>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-slate-500">No session history found.</p>
                            )}
                        </div>
                    </div>
                )}
            </Modal>

            {/* Add / Edit Contact Modal */}
            <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title={editingContact.id ? "Edit Contact" : "Add Contact"}>
                <div className="flex flex-col gap-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1">
                            <label className="text-sm font-medium">Name</label>
                            <Input 
                                value={editingContact.name || ''} 
                                onChange={(e) => setEditingContact({...editingContact, name: e.target.value})} 
                                placeholder="Full Name"
                            />
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="text-sm font-medium">Room #</label>
                            <Input 
                                value={editingContact.roomNumber || ''} 
                                onChange={(e) => setEditingContact({...editingContact, roomNumber: e.target.value})} 
                                placeholder="Room Number"
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1">
                            <label className="text-sm font-medium">Email</label>
                            <Input 
                                type="email"
                                value={editingContact.email || ''} 
                                onChange={(e) => setEditingContact({...editingContact, email: e.target.value})} 
                                placeholder="Email Address"
                            />
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="text-sm font-medium">Phone</label>
                            <Input 
                                value={editingContact.phone || ''} 
                                onChange={(e) => setEditingContact({...editingContact, phone: e.target.value})} 
                                placeholder="Phone Number"
                            />
                        </div>
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-sm font-medium">Notes</label>
                        <textarea 
                            className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            rows={3}
                            value={editingContact.notes || ''} 
                            onChange={(e) => setEditingContact({...editingContact, notes: e.target.value})} 
                            placeholder="Preferences, special requests..."
                        />
                    </div>
                    
                    <div className="flex justify-end gap-3 mt-4">
                        <Button variant="ghost" onClick={() => setIsEditModalOpen(false)}>Cancel</Button>
                        <Button variant="primary" onClick={handleSaveContact}>Save Contact</Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default CRMContactsPage;
