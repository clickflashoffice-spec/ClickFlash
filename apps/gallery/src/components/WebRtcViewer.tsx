import React, { useEffect, useState, useRef } from 'react';

interface WebRtcViewerProps {
    sessionToken: string;
    signalingUrl?: string; // e.g. ws://192.168.1.100:8090/webrtc-signaling
}

export const WebRtcViewer: React.FC<WebRtcViewerProps> = ({ 
    sessionToken, 
    signalingUrl = 'ws://localhost:8090/webrtc-signaling' 
}) => {
    const [status, setStatus] = useState<string>('Initializing WebRTC...');
    const [timeLeft, setTimeLeft] = useState<number>(600); // 10 minutes in seconds
    const wsRef = useRef<WebSocket | null>(null);
    const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
    const [imageUrl, setImageUrl] = useState<string | null>(null);

    // Countdown Timer Effect
    useEffect(() => {
        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    setStatus('Session Expired.');
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    // WebRTC Signaling Effect
    useEffect(() => {
        setStatus('Connecting to Edge Server...');
        const ws = new WebSocket(signalingUrl);
        wsRef.current = ws;

        ws.onopen = () => {
            setStatus('Authenticating...');
            ws.send(JSON.stringify({ type: 'auth', token: sessionToken }));
        };

        ws.onmessage = async (event) => {
            const data = JSON.parse(event.data);
            if (data.type === 'auth_success') {
                setStatus('Authenticated. Establishing Peer Connection...');
                
                // Initialize WebRTC Peer Connection
                const pc = new RTCPeerConnection({
                    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
                });
                peerConnectionRef.current = pc;

                // Setup Data Channel for receiving images
                const dataChannel = pc.createDataChannel('imageStream');
                dataChannel.onopen = () => {
                    setStatus('Connected to Gallery Stream!');
                };
                
                dataChannel.onmessage = (e) => {
                    // Assuming server sends ArrayBuffer or Blob
                    const blob = new Blob([e.data], { type: 'image/jpeg' });
                    const url = URL.createObjectURL(blob);
                    setImageUrl(url);
                };

                pc.onicecandidate = (e) => {
                    if (e.candidate) {
                        ws.send(JSON.stringify({ type: 'candidate', candidate: e.candidate }));
                    }
                };

                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);
                ws.send(JSON.stringify({ type: 'offer', sdp: offer }));

            } else if (data.type === 'auth_error') {
                setStatus(`Authentication Failed: ${data.message}`);
            } else if (data.type === 'server_ack') {
                setStatus(data.message);
                // Simulated: Since the backend is a prototype, we just wait
                setTimeout(() => {
                    setStatus('WebRTC Data Channel Established. Awaiting photos...');
                    // Mock receiving an image after 2 seconds
                    setImageUrl('https://via.placeholder.com/600x400.png?text=Watermarked+Gallery+Preview');
                }, 1500);
            }
        };

        ws.onclose = () => {
            if (timeLeft > 0) setStatus('Disconnected from server.');
        };

        return () => {
            ws.close();
            peerConnectionRef.current?.close();
        };
    }, [sessionToken, signalingUrl, timeLeft]);

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    return (
        <div style={{ padding: '20px', fontFamily: 'sans-serif', maxWidth: '600px', margin: '0 auto' }}>
            <div style={{ 
                background: '#ff4444', 
                color: 'white', 
                padding: '10px', 
                borderRadius: '8px', 
                textAlign: 'center',
                marginBottom: '20px',
                fontWeight: 'bold'
            }} role="alert" aria-live="assertive">
                Special Offer Expires in: {formatTime(timeLeft)}
            </div>
            
            <div aria-live="polite" style={{ marginBottom: '15px', color: '#555' }}>
                Status: {status}
            </div>

            {imageUrl ? (
                <div style={{ border: '2px dashed #ccc', borderRadius: '12px', padding: '10px' }}>
                    <img 
                        src={imageUrl} 
                        alt="Gallery Preview Stream" 
                        style={{ width: '100%', height: 'auto', borderRadius: '8px' }} 
                    />
                </div>
            ) : (
                <div style={{ 
                    height: '300px', 
                    background: '#f0f0f0', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    borderRadius: '12px'
                }}>
                    <p>No media stream active.</p>
                </div>
            )}
        </div>
    );
};
