import React from 'react';
import Spinner from '../../common/Spinner';

interface EditingOverlayProps {
    inProgress: boolean;
    message: string;
}

const EditingOverlay: React.FC<EditingOverlayProps> = ({ inProgress, message }) => {
    if (!inProgress) return null;

    return (
        <div className="absolute inset-0 z-50 bg-black/60 flex flex-col items-center justify-center backdrop-blur-sm">
            <Spinner />
            <p className="text-white font-bold mt-4 animate-pulse">{message}</p>
        </div>
    );
};

export default EditingOverlay;
