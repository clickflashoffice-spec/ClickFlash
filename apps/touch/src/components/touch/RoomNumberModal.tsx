import React, { useState } from 'react';
import Modal from '../common/Modal.tsx';
import OnScreenKeyboard from './OnScreenKeyboard';

interface RoomNumberModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (roomNumber: string) => void;
}

const RoomNumberModal: React.FC<RoomNumberModalProps> = ({ isOpen, onClose, onConfirm }) => {
    const [roomNumber, setRoomNumber] = useState('');

    const handleConfirm = () => {
        if (roomNumber) {
            onConfirm(roomNumber);
        }
    };

    // Reset on close
    const handleClose = () => {
        setRoomNumber('');
        onClose();
    }

    return (
        <Modal isOpen={isOpen} onClose={handleClose} title="Enter Your Room Number" size="lg">
            <div className="flex flex-col items-center space-y-6">
                <input
                    id="room-number-input"
                    data-testid="room-number-input"
                    type="text"
                    readOnly
                    value={roomNumber}
                    placeholder="----"
                    aria-label="Enter your room number using the keyboard below"
                    className="w-full h-20 bg-slate-100 dark:bg-slate-900 rounded-lg text-center text-5xl font-bold tracking-widest text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 placeholder-slate-500 dark:placeholder-slate-600 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />

                <OnScreenKeyboard value={roomNumber} onChange={setRoomNumber} />

                <div className="w-full flex space-x-4 pt-6 border-t border-slate-200 dark:border-slate-700">
                    <button onClick={handleClose} className="flex-1 bg-slate-200 dark:bg-slate-600 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-white font-bold py-4 px-8 rounded-lg text-2xl transition-colors">
                        Cancel
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={!roomNumber}
                        data-testid="room-number-confirm-button"
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-8 rounded-lg text-2xl transition-colors disabled:bg-slate-500 disabled:cursor-not-allowed"
                    >
                        Find My Photos
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default RoomNumberModal;