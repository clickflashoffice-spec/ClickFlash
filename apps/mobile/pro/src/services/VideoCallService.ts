import { RTCPeerConnection, RTCIceCandidate, RTCSessionDescription, mediaDevices } from 'react-native-webrtc';
import { io, Socket } from 'socket.io-client';
import { logger } from '@/utils/logger';

export class VideoCallService {
  private socket: Socket | null = null;
  private peerConnection: any = null;
  public localStream: any = null;
  private remoteStream: any = null;

  private onRemoteStreamUpdate: ((stream: any) => void) | null = null;
  private onCallActiveUpdate: ((active: boolean) => void) | null = null;

  constructor() {
    this.initializeSocket();
  }

  private initializeSocket() {
    // In production, this would connect to the Cloud WebSocket or Master LAN IP
    this.socket = io('http://master-local:8090', {
      transports: ['websocket'],
    });

    this.socket.on('connect', () => {
      logger.info('[VideoCall] Connected to signaling server');
      // Register device ID
      this.socket?.emit('register', { deviceId: 'mobile-pro-1' });
    });

    this.socket.on('INCOMING_CHECK_IN', async (data: { offer: any }) => {
      logger.warn('[VideoCall] Manager initiated an unexpected check-in!');
      await this.handleIncomingCall(data.offer);
    });

    this.socket.on('ice-candidate', async (data: { candidate: any }) => {
      if (this.peerConnection) {
        await this.peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
      }
    });
  }

  public setCallbacks(onRemoteStream: (stream: any) => void, onCallActive: (active: boolean) => void) {
    this.onRemoteStreamUpdate = onRemoteStream;
    this.onCallActiveUpdate = onCallActive;
  }

  private async handleIncomingCall(offer: any) {
    if (this.onCallActiveUpdate) this.onCallActiveUpdate(true);

    const configuration = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };
    this.peerConnection = new RTCPeerConnection(configuration);

    this.peerConnection.onicecandidate = (event: any) => {
      if (event.candidate) {
        this.socket?.emit('ice-candidate', { target: 'manager', candidate: event.candidate });
      }
    };

    this.peerConnection.ontrack = (event: any) => {
      this.remoteStream = event.streams[0];
      if (this.onRemoteStreamUpdate) this.onRemoteStreamUpdate(this.remoteStream);
    };

    // Automatically get camera/mic (Surveillance/Walkie-Talkie mode)
    const stream = await mediaDevices.getUserMedia({
      audio: true,
      video: { facingMode: 'user' }
    });
    this.localStream = stream;

    // Add local tracks to peer connection
    stream.getTracks().forEach((track: any) => {
      this.peerConnection.addTrack(track, stream);
    });

    await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await this.peerConnection.createAnswer();
    await this.peerConnection.setLocalDescription(answer);

    this.socket?.emit('answer', { target: 'manager', answer });
  }

  public endCall() {
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }
    if (this.localStream) {
      this.localStream.getTracks().forEach((t: any) => t.stop());
      this.localStream = null;
    }
    this.remoteStream = null;
    if (this.onCallActiveUpdate) this.onCallActiveUpdate(false);
  }
}

export const videoCallService = new VideoCallService();
