import { useState, useEffect, useRef } from 'react';
import { Video, VideoOff, Maximize2, Battery, MapPin, Signal } from 'lucide-react';
import { io, Socket } from 'socket.io-client';

interface PhotographerFeed {
  id: string;
  name: string;
  location: string;
  status: 'live' | 'offline' | 'idle';
  batteryPercent: number;
  signalStrength: 'strong' | 'medium' | 'weak';
  photosTaken: number;
  lastActive: string;
  stream?: MediaStream | null;
}

const initialMockFeeds: PhotographerFeed[] = [
  { id: 'mobile-pro-1', name: 'Maria Santos (Pro 1)', location: 'Pool Area B', status: 'offline', batteryPercent: 72, signalStrength: 'strong', photosTaken: 184, lastActive: 'Now' },
  { id: 'p2', name: 'James Chen', location: 'Main Entrance', status: 'offline', batteryPercent: 45, signalStrength: 'medium', photosTaken: 92, lastActive: 'Now' },
  { id: 'p3', name: 'Aisha Nakamura', location: 'Waterpark Slide', status: 'idle', batteryPercent: 88, signalStrength: 'strong', photosTaken: 210, lastActive: '3 min ago' },
  { id: 'p4', name: 'David Oliveira', location: 'Restaurant Terrace', status: 'offline', batteryPercent: 31, signalStrength: 'weak', photosTaken: 67, lastActive: 'Now' },
  { id: 'p5', name: 'Sophie Laurent', location: 'Kids Club', status: 'offline', batteryPercent: 0, signalStrength: 'weak', photosTaken: 0, lastActive: '2 hours ago' },
  { id: 'p6', name: 'Marco Rossi', location: 'Beach Cabanas', status: 'offline', batteryPercent: 91, signalStrength: 'strong', photosTaken: 156, lastActive: 'Now' },
];

const signalColors = {
  strong: 'text-emerald-400',
  medium: 'text-amber-400',
  weak: 'text-rose-400',
};

export function TeamLiveWidget() {
  const [expandedFeed, setExpandedFeed] = useState<string | null>(null);
  const [feeds, setFeeds] = useState<PhotographerFeed[]>(initialMockFeeds);
  
  const socketRef = useRef<Socket | null>(null);
  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
  const videoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());

  useEffect(() => {
    // Connect to Master Node for WebRTC Signaling
    const socket = io('http://localhost:8090', { transports: ['websocket'] });
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[Management] Connected to Master WebRTC signaling');
      socket.emit('register', { deviceId: 'manager' });
    });

    socket.on('device_status', (data: { deviceId: string, status: 'live' | 'offline' }) => {
      setFeeds(prev => prev.map(f => f.id === data.deviceId ? { ...f, status: data.status } : f));
      if (data.status === 'offline') {
        const pc = peerConnections.current.get(data.deviceId);
        if (pc) {
          pc.close();
          peerConnections.current.delete(data.deviceId);
        }
        setFeeds(prev => prev.map(f => f.id === data.deviceId ? { ...f, stream: null } : f));
      }
    });

    socket.on('answer', async (data: { answer: RTCSessionDescriptionInit, from: string }) => {
      const pc = peerConnections.current.get(data.from);
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
      }
    });

    socket.on('ice-candidate', async (data: { candidate: RTCIceCandidateInit, from: string }) => {
      const pc = peerConnections.current.get(data.from);
      if (pc && data.candidate) {
        await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
      }
    });

    return () => {
      socket.disconnect();
      peerConnections.current.forEach(pc => pc.close());
      peerConnections.current.clear();
    };
  }, []);

  const requestCheckIn = async (deviceId: string) => {
    if (!socketRef.current) return;

    const configuration = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };
    const pc = new RTCPeerConnection(configuration);
    peerConnections.current.set(deviceId, pc);

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socketRef.current?.emit('ice-candidate', { target: deviceId, candidate: event.candidate });
      }
    };

    pc.ontrack = (event) => {
      console.log('[Management] Received remote track from', deviceId);
      setFeeds(prev => prev.map(f => f.id === deviceId ? { ...f, stream: event.streams[0] } : f));
      
      setTimeout(() => {
        const videoEl = videoRefs.current.get(deviceId);
        if (videoEl && event.streams[0]) {
          videoEl.srcObject = event.streams[0];
        }
      }, 100);
    };

    const offer = await pc.createOffer({ offerToReceiveVideo: true, offerToReceiveAudio: true });
    await pc.setLocalDescription(offer);

    socketRef.current.emit('request_check_in', { target: deviceId, offer });
  };

  const liveCount = feeds.filter(f => f.status === 'live').length;
  const idleCount = feeds.filter(f => f.status === 'idle').length;
  const offlineCount = feeds.filter(f => f.status === 'offline').length;

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-800 shadow-sm overflow-hidden">
      <div className="p-5 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
            <Video className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Team Live — WebRTC Feeds</h3>
            <p className="text-xs text-slate-500">Real-time photographer monitoring via video check-in</p>
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs font-medium">
          <span className="text-emerald-400">{liveCount} Live</span>
          <span className="text-amber-400">{idleCount} Idle</span>
          <span className="text-slate-500">{offlineCount} Off</span>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-px bg-slate-800/50">
        {feeds.map(feed => (
          <div
            key={feed.id}
            className={`relative bg-slate-950 p-3 group cursor-pointer hover:bg-slate-900 transition-colors ${
              expandedFeed === feed.id ? 'ring-2 ring-cyan-500/50 ring-inset' : ''
            }`}
            onClick={() => setExpandedFeed(expandedFeed === feed.id ? null : feed.id)}
          >
            {/* Video placeholder or actual video */}
            <div className="aspect-video rounded-lg bg-slate-800 border border-slate-700/50 flex items-center justify-center mb-2 overflow-hidden relative">
              {feed.stream ? (
                <>
                  <video 
                    ref={el => { if (el) videoRefs.current.set(feed.id, el); }}
                    autoPlay 
                    playsInline 
                    muted 
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-1.5 left-1.5 flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-600 text-white text-[9px] font-bold z-10">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                    LIVE
                  </div>
                  <button className="absolute top-1.5 right-1.5 w-6 h-6 rounded bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    <Maximize2 className="w-3 h-3 text-white" />
                  </button>
                </>
              ) : feed.status === 'live' ? (
                <>
                  <div className="absolute inset-0 bg-gradient-to-br from-slate-700 to-slate-900" />
                  <span className="relative text-xs text-slate-400 font-medium">Device Online (Ready)</span>
                  <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-emerald-600 text-white text-[9px] font-bold">ONLINE</div>
                </>
              ) : feed.status === 'idle' ? (
                <>
                  <VideoOff className="w-6 h-6 text-amber-500/50" />
                  <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-amber-600/80 text-white text-[9px] font-bold">IDLE</div>
                </>
              ) : (
                <>
                  <VideoOff className="w-6 h-6 text-slate-600" />
                  <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-slate-700 text-slate-400 text-[9px] font-bold">OFFLINE</div>
                </>
              )}
            </div>

            {/* Info */}
            <div className="flex items-start justify-between gap-1">
              <div className="min-w-0">
                <p className="text-xs font-bold text-white truncate">{feed.name}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                  <p className="text-[10px] text-slate-500 truncate">{feed.location}</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <div className="flex items-center gap-0.5" title={`Battery: ${feed.batteryPercent}%`}>
                  <Battery className={`w-3 h-3 ${feed.batteryPercent > 50 ? 'text-emerald-400' : feed.batteryPercent > 20 ? 'text-amber-400' : 'text-rose-400'}`} />
                  <span className="text-[9px] text-slate-500">{feed.batteryPercent}%</span>
                </div>
                <Signal className={`w-3 h-3 ${signalColors[feed.signalStrength]}`} />
              </div>
            </div>

            {/* Expanded details */}
            {expandedFeed === feed.id && (
              <div className="mt-2 pt-2 border-t border-slate-800 grid grid-cols-2 gap-2" onClick={e => e.stopPropagation()}>
                <div className="text-center">
                  <p className="text-lg font-bold text-white">{feed.photosTaken}</p>
                  <p className="text-[9px] text-slate-500 uppercase tracking-wider">Photos</p>
                </div>
                <div className="text-center">
                  <p className="text-xs font-bold text-slate-300">{feed.lastActive}</p>
                  <p className="text-[9px] text-slate-500 uppercase tracking-wider">Last Active</p>
                </div>
                {feed.status === 'live' && !feed.stream && (
                  <button 
                    onClick={() => requestCheckIn(feed.id)}
                    className="col-span-2 mt-1 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-[10px] font-bold uppercase tracking-wider transition-colors"
                  >
                    Request Video Check-In
                  </button>
                )}
                {feed.stream && (
                  <button 
                    onClick={() => {
                      const pc = peerConnections.current.get(feed.id);
                      if (pc) pc.close();
                      peerConnections.current.delete(feed.id);
                      setFeeds(prev => prev.map(f => f.id === feed.id ? { ...f, stream: null } : f));
                    }}
                    className="col-span-2 mt-1 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-bold uppercase tracking-wider transition-colors"
                  >
                    End Video Check-In
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
