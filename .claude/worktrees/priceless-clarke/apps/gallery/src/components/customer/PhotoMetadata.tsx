import React, { useState, useEffect } from 'react';
import { Photo } from '../../types';
import { extractMetadata, getImageFileSize, formatMetadataForDisplay } from '../../utils/metadataUtils';

interface PhotoMetadataProps {
    photo: Photo;
}

const PhotoMetadata: React.FC<PhotoMetadataProps> = ({ photo }) => {
    const [metadata, setMetadata] = useState(photo.metadata);
    const [loading, setLoading] = useState(!photo.metadata);
    const [expanded, setExpanded] = useState(false);
    
    useEffect(() => {
        const loadMetadata = async () => {
            if (!photo.metadata && photo.url) {
                setLoading(true);
                try {
                    const extracted = await extractMetadata(photo.url);
                    const fileSize = await getImageFileSize(photo.url);
                    
                    if (extracted) {
                        setMetadata({
                            ...extracted,
                            fileSize: fileSize || extracted.fileSize,
                        });
                    }
                } catch (error) {
                    console.error('Error loading metadata:', error);
                } finally {
                    setLoading(false);
                }
            }
        };
        
        loadMetadata();
    }, [photo]);
    
    if (loading) {
        return (
            <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-lg">
                <div className="text-sm text-slate-500">Loading metadata...</div>
            </div>
        );
    }
    
    if (!metadata) {
        return (
            <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-lg">
                <div className="text-sm text-slate-500">No metadata available</div>
            </div>
        );
    }
    
    const metadataLines = formatMetadataForDisplay(metadata);
    
    return (
        <div className="bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden">
            <button
                onClick={() => setExpanded(!expanded)}
                className="w-full p-4 flex justify-between items-center hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
                <h3 className="font-semibold text-slate-900 dark:text-white">Photo Information</h3>
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className={`h-5 w-5 text-slate-500 transition-transform ${expanded ? 'transform rotate-180' : ''}`}
                    viewBox="0 0 20 20"
                    fill="currentColor"
                >
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
            </button>
            
            {expanded && (
                <div className="p-4 border-t border-slate-200 dark:border-slate-700">
                    {metadataLines.length > 0 ? (
                        <dl className="space-y-2">
                            {metadataLines.map((line, index) => {
                                const [label, value] = line.split(': ');
                                return (
                                    <div key={index} className="flex justify-between">
                                        <dt className="text-sm font-medium text-slate-600 dark:text-slate-400">
                                            {label}
                                        </dt>
                                        <dd className="text-sm text-slate-900 dark:text-white">
                                            {value}
                                        </dd>
                                    </div>
                                );
                            })}
                        </dl>
                    ) : (
                        <div className="text-sm text-slate-500">
                            Basic information only. EXIF data not available.
                        </div>
                    )}
                    
                    {metadata.dimensions && (
                        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                            <div className="text-xs text-slate-500">
                                Resolution: {metadata.dimensions.width} × {metadata.dimensions.height} pixels
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default PhotoMetadata;

