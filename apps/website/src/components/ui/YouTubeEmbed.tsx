"use client";

import { useState } from "react";
import { Play } from "lucide-react";

interface YouTubeEmbedProps {
    videoId: string;
    previewImage: string;
    title?: string;
}

export function YouTubeEmbed({ videoId, previewImage, title = "YouTube Video" }: YouTubeEmbedProps) {
    const [isPlaying, setIsPlaying] = useState(false);

    return (
        <div className="relative aspect-video max-w-4xl mx-auto rounded-[3.5rem] overflow-hidden shadow-2xl group cursor-pointer mb-14 bg-white/10">
            {!isPlaying ? (
                // Preview State
                <div onClick={() => setIsPlaying(true)} className="relative w-full h-full">
                    <img
                        src={previewImage}
                        alt={title}
                        className="object-cover w-full h-full transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-slate-900/40 flex items-center justify-center transition-colors group-hover:bg-slate-900/20">
                        <div className="w-24 h-24 bg-[#0B111F] rounded-full flex items-center justify-center shadow-2xl transition-transform duration-500 group-hover:scale-110">
                            <Play className="fill-red-600 text-red-600 w-8 h-8 ml-1" />
                        </div>
                    </div>
                </div>
            ) : (
                // Video State
                <iframe
                    src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`}
                    title={title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="absolute inset-0 w-full h-full"
                />
            )}
        </div>
    );
}
