import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal.tsx';
import { Photographer, WorkingHours, DayOfWeek, DayWorkingHours } from '../../types.ts';

interface WorkingTimeModalProps {
  isOpen: boolean;
  onClose: () => void;
  photographer: Photographer;
}

const ShiftControls: React.FC<{
    shift: 'shift1' | 'shift2';
    day: DayOfWeek;
    data: { start: string; end: string; enabled: boolean };
    onChange: (day: DayOfWeek, shift: 'shift1' | 'shift2', field: string, value: any) => void;
}> = ({ shift, day, data, onChange }) => (
    <div className="flex flex-col space-y-2 bg-slate-100 dark:bg-slate-800/50 p-3 rounded-lg">
        <div className="flex items-center space-x-2">
            <label className="relative inline-flex items-center cursor-pointer">
                <input 
                    type="checkbox" 
                    checked={data.enabled}
                    onChange={(e) => onChange(day, shift, 'enabled', e.target.checked)}
                    className="sr-only peer" 
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
            />
            <input 
                type="time" 
                value={data.end}
                disabled={!data.enabled}
                onChange={(e) => onChange(day, shift, 'end', e.target.value)}
                className="w-full bg-white dark:bg-slate-700 rounded p-2 text-sm disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-500"
            />
        </div>
    </div>
);

const DayRow: React.FC<{ 
    day: string; 
    hours: DayWorkingHours;
    onChange: (day: DayOfWeek, shift: 'shift1' | 'shift2', field: string, value: any) => void;
}> = ({ day, hours, onChange }) => (
    <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr_2fr] items-start gap-x-6 gap-y-2 py-4 border-b border-slate-200 dark:border-slate-700 last:border-b-0">
        <div className="capitalize font-semibold pt-2">{day}</div>
        <ShiftControls shift="shift1" day={day as DayOfWeek} data={hours.shift1} onChange={onChange} />
        <ShiftControls shift="shift2" day={day as DayOfWeek} data={hours.shift2} onChange={onChange} />
    </div>
);


const WorkingTimeModal: React.FC<WorkingTimeModalProps> = ({ isOpen, onClose, photographer }) => {
    const [workingHours, setWorkingHours] = useState<WorkingHours | undefined>(photographer.workingHours);

    useEffect(() => {
        setWorkingHours(photographer.workingHours);
    }, [photographer]);

    const handleHoursChange = (day: DayOfWeek, shift: 'shift1' | 'shift2', field: string, value: any) => {
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
    
    const handleSave = () => {
        // In a real app, this would call an API service to save the hours
        console.log("Saving working hours for", photographer.name, workingHours);
        onClose();
    };

    if (!workingHours) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Working Time: ${photographer.name}`} size="xl">
            <div>
                <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr_2fr] gap-x-6 gap-y-2 px-2 pb-2 text-slate-500 dark:text-slate-400 font-bold">
                    <span>Day</span>
                    <span>Shift 1 (e.g., Morning)</span>
                    <span>Shift 2 (e.g., Afternoon)</span>
                </div>
                {Object.entries(workingHours).map(([day, hours]) => (
                    <DayRow key={day} day={day} hours={hours} onChange={handleHoursChange} />
                ))}
            </div>
            <div className="pt-6 flex justify-end space-x-3 border-t border-slate-200 dark:border-slate-700 mt-6">
                <button type="button" onClick={onClose} className="bg-slate-200 hover:bg-slate-300 text-slate-800 dark:bg-slate-600 dark:hover:bg-slate-500 dark:text-white font-semibold py-2 px-4 rounded-lg">Cancel</button>
                <button type="button" onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg">Save Changes</button>
            </div>
        </Modal>
    );
};

export default WorkingTimeModal;