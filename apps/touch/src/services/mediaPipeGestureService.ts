// @ts-nocheck
import { logger } from '../utils/logger';

export type GestureType = 
  | 'OPEN_PALM'    // Pause / Hover
  | 'CLOSED_FIST'  // Select / Tap
  | 'THUMBS_UP'    // Favorite
  | 'SWIPE_LEFT'   // Next Page
  | 'SWIPE_RIGHT'  // Previous Page
  | 'PINCH'        // Zoom
  | 'UNKNOWN';

export type GestureCallback = (gesture: GestureType) => void;

class MediaPipeGestureService {
    private listeners: Set<GestureCallback> = new Set();
    private isRunning: boolean = false;
    private videoElement: HTMLVideoElement | null = null;
    // Mocking MediaPipe components since we don't have the actual library installed here
    // In a real scenario, this would use @mediapipe/hands and @mediapipe/camera_utils

    constructor() {
        logger.info("[MediaPipeGestureService] Initialized");
    }

    /**
     * Subscribe to gesture events
     */
    public onGesture(callback: GestureCallback): () => void {
        this.listeners.add(callback);
        return () => {
            this.listeners.delete(callback);
        };
    }

    /**
     * Start the touchless gesture detection
     */
    public async start(videoElement: HTMLVideoElement): Promise<void> {
        if (this.isRunning) return;
        
        this.videoElement = videoElement;
        this.isRunning = true;
        logger.info("[MediaPipeGestureService] Starting gesture detection...");
        
        // This is a stub for MediaPipe Hands initialization
        // To implement fully:
        // 1. Initialize Hands from @mediapipe/hands
        // 2. Initialize Camera from @mediapipe/camera_utils
        // 3. Set onResults callback to parse landmarks and emit gestures
        
        this._mockDetectionLoop();
    }

    /**
     * Stop the touchless gesture detection
     */
    public stop(): void {
        this.isRunning = false;
        if (this.videoElement) {
            // Stop camera stream in real implementation
            this.videoElement = null;
        }
        logger.info("[MediaPipeGestureService] Stopped gesture detection.");
    }

    /**
     * Emit a gesture to all listeners
     */
    private emit(gesture: GestureType): void {
        if (!this.isRunning) return;
        logger.debug(`[MediaPipeGestureService] Detected gesture: ${gesture}`);
        this.listeners.forEach(listener => listener(gesture));
    }

    /**
     * Simulated detection loop for development purposes
     */
    private _mockDetectionLoop(): void {
        if (!this.isRunning) return;

        // In reality, this would be analyzing frames from the camera
        // For now, we'll just log that it's "running"
        
        setTimeout(() => {
            if (this.isRunning) {
                // this.emit('OPEN_PALM');
                this._mockDetectionLoop();
            }
        }, 1000);
    }
    
    private lastWristX: number | null = null;
    private lastSwipeTimestamp: number = 0;

    /**
     * Parses MediaPipe 21 hand landmarks into robust touchless gestures
     * Landmarks index: 0=wrist, 4=thumb tip, 8=index tip, 12=middle tip, 16=ring tip, 20=pinky tip
     */
    public processLandmarks(landmarks: Array<{ x: number; y: number; z?: number }>): GestureType {
        if (!landmarks || landmarks.length < 21) return 'UNKNOWN';

        const wrist = landmarks[0];
        const thumbTip = landmarks[4];
        const indexTip = landmarks[8];
        const middleTip = landmarks[12];
        const ringTip = landmarks[16];
        const pinkyTip = landmarks[20];

        const indexPip = landmarks[6];
        const middlePip = landmarks[10];
        const ringPip = landmarks[14];
        const pinkyPip = landmarks[18];

        // 1. Check Pinch (Index Tip & Thumb Tip close together)
        const pinchDist = Math.hypot(indexTip.x - thumbTip.x, indexTip.y - thumbTip.y);
        if (pinchDist < 0.045) {
            return 'PINCH';
        }

        // 2. Check Finger Extensions (tip.y < pip.y in normal upright orientation)
        const indexExtended = indexTip.y < indexPip.y;
        const middleExtended = middleTip.y < middlePip.y;
        const ringExtended = ringTip.y < ringPip.y;
        const pinkyExtended = pinkyTip.y < pinkyPip.y;

        // 3. Check Thumbs Up (Thumb up, 4 fingers folded)
        const fourFingersCurled = !indexExtended && !middleExtended && !ringExtended && !pinkyExtended;
        if (fourFingersCurled && thumbTip.y < wrist.y - 0.1) {
            return 'THUMBS_UP';
        }

        // 4. Check Closed Fist (All fingers curled)
        if (fourFingersCurled && thumbTip.y >= landmarks[3].y) {
            return 'CLOSED_FIST';
        }

        // 5. Check Swipe Left / Right via horizontal velocity
        const now = Date.now();
        if (this.lastWristX !== null && now - this.lastSwipeTimestamp > 400) {
            const deltaX = wrist.x - this.lastWristX;
            if (deltaX > 0.15) {
                this.lastSwipeTimestamp = now;
                this.lastWristX = wrist.x;
                return 'SWIPE_RIGHT';
            } else if (deltaX < -0.15) {
                this.lastSwipeTimestamp = now;
                this.lastWristX = wrist.x;
                return 'SWIPE_LEFT';
            }
        }
        this.lastWristX = wrist.x;

        // 6. Open Palm (All 4 fingers extended)
        if (indexExtended && middleExtended && ringExtended && pinkyExtended) {
            return 'OPEN_PALM';
        }

        return 'UNKNOWN';
    }
}

export const mediaPipeGestureService = new MediaPipeGestureService();
