export type WebRTCSignalingType = 'offer' | 'answer' | 'ice-candidate';

export interface BaseSignalingMessage {
  type: WebRTCSignalingType;
  senderId: string;
  targetId: string;
}

export interface SDPMessage extends BaseSignalingMessage {
  type: 'offer' | 'answer';
  sdp: RTCSessionDescriptionInit; // Built-in DOM type for WebRTC
}

export interface ICECandidateMessage extends BaseSignalingMessage {
  type: 'ice-candidate';
  candidate: RTCIceCandidateInit; // Built-in DOM type for WebRTC
}

export type WebRTCSignalingMessage = SDPMessage | ICECandidateMessage;
