import React, { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { SDPMessage, ICECandidateMessage } from '@clickflash/types/webrtc';

export const WebRtcViewer: React.FC = () => {
  const [photos, setPhotos] = useState<string[]>([]);
  const [countdown, setCountdown] = useState<number>(600); // 10 minutes
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    // Connect to Master Node's signaling server
    const socket = io('http://localhost:8090', { transports: ['websocket'] });
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[WebRtcViewer] Connected to Master WebRTC signaling');
      socket.emit('register', { deviceId: 'gallery-viewer' });
    });

    const configuration = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };
    const pc = new RTCPeerConnection(configuration);
    pcRef.current = pc;

    pc.ondatachannel = (event) => {
      const channel = event.channel;
      channel.onmessage = (e) => {
        if (typeof e.data === 'string') {
          try {
            const parsed = JSON.parse(e.data);
            if (parsed.type === 'photo' && parsed.data) {
              setPhotos((prev) => [...prev, parsed.data]);
            }
          } catch (err) {
            if (e.data.startsWith('data:image')) {
              setPhotos((prev) => [...prev, e.data]);
            }
          }
        } else if (e.data instanceof Blob) {
          const url = URL.createObjectURL(e.data);
          setPhotos((prev) => [...prev, url]);
        }
      };
    };

    socket.on('INCOMING_CHECK_IN', async (data: { offer: RTCSessionDescriptionInit; senderId?: string }) => {
      await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      
      const msg: SDPMessage = {
        type: 'answer',
        senderId: 'gallery-viewer',
        targetId: data.senderId || 'master-node',
        sdp: answer as RTCSessionDescriptionInit
      };
      socket.emit('answer', msg);
    });

    socket.on('ice-candidate', async (data: ICECandidateMessage) => {
      if (data.candidate) {
        await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
      }
    });

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        const msg: ICECandidateMessage = {
          type: 'ice-candidate',
          senderId: 'gallery-viewer',
          targetId: 'master-node', // Assuming master-node is the sender
          candidate: event.candidate
        };
        socket.emit('ice-candidate', msg);
      }
    };

    return () => {
      pc.close();
      socket.disconnect();
    };
  }, []);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="relative w-full max-w-4xl mx-auto h-[500px] bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden shadow-2xl mt-8" role="region" aria-label="Live Photo Stream">
      <div className="absolute top-4 right-4 bg-red-600/90 backdrop-blur-sm text-white px-4 py-2 rounded-full font-bold shadow-lg z-10 flex items-center gap-2" role="timer" aria-live="off" aria-label="Cart Recovery Timer">
        <span className="w-2 h-2 rounded-full bg-white animate-pulse" aria-hidden="true" />
        Cart Recovery: {formatTime(countdown)}
      </div>
      
      <div className="p-6 h-full overflow-y-auto" aria-live="polite">
        {photos.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-4" role="status" aria-label="Waiting for photos">
            <div className="w-16 h-16 rounded-full border-4 border-slate-700 border-t-[var(--ui-primary)] animate-spin" aria-hidden="true" />
            <p>Waiting for live photo stream...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" role="list">
            {photos.map((photo, i) => (
              <div key={i} className="relative aspect-[3/4] bg-slate-800 rounded-xl overflow-hidden group shadow-lg border border-slate-700" role="listitem">
                <img src={photo} alt={`Watermarked photo ${i + 1}`} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                <div className="absolute inset-0 bg-black/20 flex items-center justify-center pointer-events-none" aria-hidden="true">
                  <span className="text-3xl font-black text-white/50 tracking-widest transform -rotate-45 drop-shadow-md">
                    WATERMARK
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
