import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal.tsx';
import { Photographer, WorkingHours, DayOfWeek, DayWorkingHours } from '../../types.ts';

interface WorkingTimeModalProps {
    isOpen: boolean;
    onClose: () => void;
    photographer: Photographer;
    onSave: (photographerId: string, hours: WorkingHours) => Promise<void>;
}

const ShiftControls: React.FC<{
    shift: 'shift1' | 'shift2';
    day: DayOfWeek;
    data: { start: string; end: string; enabled: boolean };
    onChange: (day: DayOfWeek, shift: 'shift1' | 'shift2', field: 'start' | 'end' | 'enabled', value: any) => void;
}> = ({ shift, day, data, onChange }) => (
    <div className="flex flex-col space-y-2 bg-slate-100 dark:bg-slate-800/50 p-3 rounded-lg">
        <div className="flex items-center space-x-2">
            <label className="relative inline-flex items-center cursor-pointer">
                <input
                    type="checkbox"
                    checked={data.enabled}
                    onChange={(e) => onChange(day, shift, 'enabled', e.target.checked)}
                    className="sr-only peer"
                    aria-label={`Enable ${shift} for ${day}`}
                />
                <div className="w-11 h-6 bg-slate-200 dark:bg-slate-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
            <span className="text-sm text-slate-500 dark:text-slate-400">Enabled</span>
        </div>
        <div className="flex items-center gap-2">
            <input
                type="time"
                value={data.start}
                disabled={!data.enabled}
                onChange={(e) => onChange(day, shift, 'start', e.target.value)}
                className="w-full bg-white dark:bg-slate-700 rounded p-2 text-sm disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-500"
                aria-label={`${shift} start time for ${day}`}
            />
            <input
                type="time"
                value={data.end}
                disabled={!data.enabled}
                onChange={(e) => onChange(day, shift, 'end', e.target.value)}
                className="w-full bg-white dark:bg-slate-700 rounded p-2 text-sm disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-500"
                aria-label={`${shift} end time for ${day}`}
            />
        </div>
    </div>
);

const DayRow: React.FC<{
    day: string;
    hours: DayWorkingHours;
    onChange: (day: DayOfWeek, shift: 'shift1' | 'shift2', field: 'start' | 'end' | 'enabled', value: any) => void;
}> = ({ day, hours, onChange }) => (
    <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr_2fr] items-start gap-x-6 gap-y-2 py-4 border-b border-slate-200 dark:border-slate-700 last:border-b-0">
        <div className="capitalize font-semibold pt-2">{day}</div>
        <ShiftControls shift="shift1" day={day as DayOfWeek} data={hours.shift1} onChange={onChange} />
        <ShiftControls shift="shift2" day={day as DayOfWeek} data={hours.shift2} onChange={onChange} />
    </div>
);


const WorkingTimeModal: React.FC<WorkingTimeModalProps> = ({ isOpen, onClose, photographer, onSave }) => {
    const [loading, setLoading] = useState(false);
    const [workingHours, setWorkingHours] = useState<WorkingHours | undefined>(() => {
        // Correctly handle both 'workingHours' (object) and 'workingHoursJSON' (string/object)
        const directHours = (photographer as any).workingHours;
        if (directHours && typeof directHours === 'object') return directHours;

        if (photographer.workingHoursJSON) {
            try {
                return typeof photographer.workingHoursJSON === 'string'
                    ? JSON.parse(photographer.workingHoursJSON)
                    : photographer.workingHoursJSON;
            } catch (e) {
                console.error("Failed to parse workingHoursJSON:", e);
                return undefined;
            }
        }
        return undefined;
    });

    useEffect(() => {
        const directHours = (photographer as any).workingHours;
        if (directHours && typeof directHours === 'object') {
            setWorkingHours(directHours);
            return;
        }

        if (photographer.workingHoursJSON) {
            try {
                const parsed = typeof photographer.workingHoursJSON === 'string'
                    ? JSON.parse(photographer.workingHoursJSON)
                    : photographer.workingHoursJSON;
                setWorkingHours(parsed);
            } catch (e) {
                console.error("Failed to parse workingHoursJSON in useEffect:", e);
                setWorkingHours(undefined);
            }
        } else {
            setWorkingHours(undefined);
        }
    }, [photographer]);

    const handleHoursChange = (day: DayOfWeek, shift: 'shift1' | 'shift2', field: 'start' | 'end' | 'enabled', value: any) => {
        setWorkingHours(prev => {
            if (!prev) return prev;
            return {
                ...prev,
                [day]: {
                    ...prev[day],
                    [shift]: {
                        ...prev[day][shift],
                        [field]: value
                    }
                }
            };
        });
    };

    const handleSave = async () => {
        if (!workingHours) return;
        setLoading(true);
        try {
            await onSave(photographer.id, workingHours);
            onClose();
        } catch (error) {
            console.error("Failed to save working hours:", error);
            // Optionally add error state/notification here
        } finally {
            setLoading(false);
        }
    };

    if (!workingHours) {
        // Show a placeholder or initialization button if no hours defined
        return (
            <Modal isOpen={isOpen} onClose={onClose} title={`Working Time: ${photographer.name}`} size="md">
                <div className="p-4 text-center">
                    <p className="text-slate-500 mb-4">No working hours configured.</p>
                    <p className="text-sm text-slate-400">Initialize default schedule?</p>
                    {/* Could add logic here to init defaults */}
                    <div className="mt-6 flex justify-center gap-3">
                        <button onClick={onClose} className="bg-slate-200 hover:bg-slate-300 text-slate-800 px-4 py-2 rounded-lg transition-colors">Close</button>
                        <button
                            onClick={() => {
                                const defaultHours: WorkingHours = {
                                    monday: { shift1: { start: '10:00', end: '13:00', enabled: true }, shift2: { start: '17:00', end: '22:00', enabled: true } },
                                    tuesday: { shift1: { start: '10:00', end: '13:00', enabled: true }, shift2: { start: '17:00', end: '22:00', enabled: true } },
                                    wednesday: { shift1: { start: '10:00', end: '13:00', enabled: true }, shift2: { start: '17:00', end: '22:00', enabled: true } },
                                    thursday: { shift1: { start: '10:00', end: '13:00', enabled: true }, shift2: { start: '17:00', end: '22:00', enabled: true } },
                                    friday: { shift1: { start: '10:00', end: '13:00', enabled: true }, shift2: { start: '17:00', end: '22:00', enabled: true } },
                                    saturday: { shift1: { start: '10:00', end: '13:00', enabled: true }, shift2: { start: '17:00', end: '22:00', enabled: true } },
                                    sunday: { shift1: { start: '10:00', end: '13:00', enabled: true }, shift2: { start: '17:00', end: '22:00', enabled: true } },
                                };
                                setWorkingHours(defaultHours);
                            }}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2 rounded-lg shadow-lg shadow-blue-600/20 transition-all hover:-translate-y-0.5"
                        >
                            Initialize Default Schedule
                        </button>
                    </div>
                </div>
            </Modal>
        )
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Working Time: ${photographer.name}`} size="xl">
            <div className="max-h-[60vh] overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr_2fr] gap-x-6 gap-y-2 px-2 pb-2 text-slate-500 dark:text-slate-400 font-bold sticky top-0 bg-white dark:bg-slate-900 z-10 pt-2">
                    <span>Day</span>
                    <span>Shift 1 (e.g., Morning)</span>
                    <span>Shift 2 (e.g., Afternoon)</span>
                </div>
                {Object.entries(workingHours).map(([day, hours]) => (
                    <DayRow key={day} day={day} hours={hours} onChange={handleHoursChange} />
                ))}
            </div>
            <div className="pt-6 flex justify-end space-x-3 border-t border-slate-200 dark:border-slate-700 mt-6">
                <button type="button" onClick={onClose} disabled={loading} className="bg-slate-200 hover:bg-slate-300 text-slate-800 dark:bg-slate-600 dark:hover:bg-slate-500 dark:text-white font-semibold py-2 px-4 rounded-lg transition-colors">Cancel</button>
                <button type="button" onClick={handleSave} disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg flex items-center transition-colors disabled:opacity-50">
                    {loading && (
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                    )}
                    {loading ? 'Saving...' : 'Save Changes'}
                </button>
            </div>
        </Modal>
    );
};

export default WorkingTimeModal;