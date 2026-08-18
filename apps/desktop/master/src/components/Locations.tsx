import { Card, Button, Modal, Input } from "@clickflash/ui";
import React, { useState, useEffect } from 'react';
import { destinationService } from '../services/api/destinationService';
import { Destination } from '../types';

import { TableRowSkeleton } from './common/AppSkeletons';

import FormField from './common/FormField';

import { logger } from '../utils/logger';

const Locations: React.FC = () => {
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDestination, setEditingDestination] = useState<Partial<Destination> | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadDestinations();
  }, []);

  const loadDestinations = async () => {
    setLoading(true);
    try {
      const data = await destinationService.getDestinations();
      setDestinations(data);
    } catch (err) {
      logger.error('Failed to load destinations', err instanceof Error ? err : undefined);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingDestination({
      name: '',
      country: '',
      type: 'Resort',
      licenseKey: '',
      features: { ai: true, face: true, watermark: true }
    });
    setIsModalOpen(true);
  };

  const handleEdit = (dest: Destination) => {
    setEditingDestination(dest);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this location?')) {
      try {
        await destinationService.deleteDestination(id);
        loadDestinations();
      } catch (err) {
        alert('Failed to delete destination');
      }
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDestination) return;

    setSaving(true);
    try {
      if (editingDestination.id) {
        await destinationService.updateDestination(editingDestination.id, editingDestination);
      } else {
        await destinationService.createDestination(editingDestination);
      }
      setIsModalOpen(false);
      loadDestinations();
    } catch (err: any) {
      alert(err.message || 'Failed to save destination');
    } finally {
      setSaving(false);
    }
  };

  if (loading && destinations.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div className="h-8 w-64 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
            <div className="h-10 w-32 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
            <table className="w-full text-left">
                <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                        <th className="px-6 py-4">Location Name</th>
                        <th className="px-6 py-4">Timezone</th>
                        <th className="px-6 py-4">Printers</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                    {[...Array(5)].map((_, i) => (
                        <TableRowSkeleton key={i} columns={5} />
                    ))}
                </tbody>
            </table>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Locations & Destinations</h1>
          <p className="text-slate-500 dark:text-slate-400">Manage resort and city locations for your Master OS network.</p>
        </div>
        <Button
          variant="primary"
          onClick={handleCreate}
          leftIcon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>}
        >
          Add Location
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {destinations.map((dest) => (
          <Card key={dest.id} className="overflow-hidden group">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className={`p-2 rounded-lg ${dest.type === 'Resort' ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'}`}>
                  {dest.type === 'Resort' ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 002 2 2 2 0 012 2v.654M5.64 20c.186.11.37.214.574.306M15.91 18.11l-1.243-1.113M10.01 19.06l.142.015" /></svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                  )}
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => handleEdit(dest)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md text-slate-400 hover:text-blue-600 transition-colors" title="Edit location">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                  </button>
                  <button onClick={() => handleDelete(dest.id)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md text-slate-400 hover:text-red-600 transition-colors" title="Delete location">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-1">{dest.name}</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">{dest.country}</p>

              <div className="flex flex-wrap gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                {dest.features?.ai && <span className="px-2 py-1 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 text-[10px] font-bold uppercase rounded tracking-wider">AI Enabled</span>}
                {dest.features?.face && <span className="px-2 py-1 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 text-[10px] font-bold uppercase rounded tracking-wider">Face Recognition</span>}
                {dest.features?.watermark && <span className="px-2 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-[10px] font-bold uppercase rounded tracking-wider">Watermarking</span>}
              </div>
            </div>
            {dest.licenseKey && (
              <div className="px-6 py-3 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800">
                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">License Key</p>
                <p className="font-mono text-xs text-slate-600 dark:text-slate-300 truncate">{dest.licenseKey}</p>
              </div>
            )}
          </Card>
        ))}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingDestination?.id ? 'Edit Location' : 'Add New Location'}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <FormField label="Location Name" required>
            <Input
              value={editingDestination?.name || ''}
              onChange={e => setEditingDestination({ ...editingDestination!, name: e.target.value })}
              placeholder="e.g. Grand Paradise Resort"
            />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Country">
              <Input
                value={editingDestination?.country || ''}
                onChange={e => setEditingDestination({ ...editingDestination!, country: e.target.value })}
                placeholder="e.g. Mexico"
              />
            </FormField>
            <FormField label="Type">
              <select
                title="Location Type"
                className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                value={editingDestination?.type || 'Resort'}
                onChange={e => setEditingDestination({ ...editingDestination!, type: e.target.value as any })}
              >
                <option value="Resort">Resort</option>
                <option value="City">City</option>
              </select>
            </FormField>
          </div>
          <FormField label="License Key">
            <Input
              value={editingDestination?.licenseKey || ''}
              onChange={e => setEditingDestination({ ...editingDestination!, licenseKey: e.target.value })}
              placeholder="Enter system license key"
            />
          </FormField>

          <div className="pt-4 space-y-3">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Enabled Features</p>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                <input
                  type="checkbox"
                  checked={editingDestination?.features?.ai ?? true}
                  onChange={e => setEditingDestination({ ...editingDestination!, features: { ...editingDestination!.features!, ai: e.target.checked } })}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="text-sm text-slate-700 dark:text-slate-300">AI Processing</span>
              </label>
              <label className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                <input
                  type="checkbox"
                  checked={editingDestination?.features?.face ?? true}
                  onChange={e => setEditingDestination({ ...editingDestination!, features: { ...editingDestination!.features!, face: e.target.checked } })}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="text-sm text-slate-700 dark:text-slate-300">Face Recognition</span>
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-slate-100 dark:border-slate-800">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary" isLoading={saving}>
              {editingDestination?.id ? 'Update Location' : 'Create Location'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Locations;
