import { logger } from '../utils/logger';
import * as tf from '@tensorflow/tfjs';
import * as handPoseDetection from '@tensorflow-models/hand-pose-detection';

/**
 * Explains how the Kiosk interfaces with a local webcam and a lightweight 
 * computer vision model (like MediaPipe or TensorFlow.js) to detect gestures.
 */
export type RecognizedGesture = 'PEACE_SIGN' | 'WAVE' | 'THUMBS_UP' | 'NONE';

export class GestureCaptureService {
    private isTracking = false;
    private captureCallback: (() => void) | null = null;
    private detector: handPoseDetection.HandDetector | null = null;
    private videoElement: HTMLVideoElement | null = null;

    /**
     * Initializes the local webcam feed and loads the lightweight hand-tracking model.
     */
    async initialize(): Promise<void> {
        logger.info('[GestureCapture] Initializing lightweight hand-tracking model...');
        try {
            await tf.ready();
            
            const model = handPoseDetection.SupportedModels.MediaPipeHands;
            const detectorConfig: handPoseDetection.MediaPipeHandsTfjsModelConfig = {
                runtime: 'tfjs',
                modelType: 'lite',
                maxHands: 1,
            };
            this.detector = await handPoseDetection.createDetector(model, detectorConfig);
            
            logger.info('[GestureCapture] Model loaded. Detector ready.');
        } catch (error) {
            logger.error('[GestureCapture] Failed to initialize model:', error);
        }
    }

    /**
     * Starts monitoring the video feed for specific gestures.
     * When a gesture is detected and held for the required duration, it triggers the callback.
     */
    async startTracking(onCaptureTriggered: () => void) {
        if (!this.detector) {
            logger.error('[GestureCapture] Detector not initialized! Attempting initialization...');
            await this.initialize();
            if (!this.detector) return;
        }

        this.isTracking = true;
        this.captureCallback = onCaptureTriggered;
        logger.info('[GestureCapture] Tracking started. Waiting for peace sign...');
        
        if (!this.videoElement) {
            this.videoElement = document.createElement('video');
            this.videoElement.style.display = 'none';
            document.body.appendChild(this.videoElement);
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
            this.videoElement.srcObject = stream;
            this.videoElement.play();
            
            this.videoElement.onloadedmetadata = () => {
                this.detectionLoop();
            };
        } catch (error) {
            logger.error('[GestureCapture] Failed to access webcam for gesture tracking:', error);
            this.isTracking = false;
        }
    }

    stopTracking() {
        this.isTracking = false;
        logger.info('[GestureCapture] Tracking stopped.');
        if (this.videoElement && this.videoElement.srcObject) {
            const stream = this.videoElement.srcObject as MediaStream;
            stream.getTracks().forEach(track => track.stop());
            this.videoElement.srcObject = null;
        }
    }

    private async detectionLoop() {
        if (!this.isTracking || !this.detector || !this.videoElement) return;

        if (this.videoElement.readyState >= 2) {
            try {
                const hands = await this.detector.estimateHands(this.videoElement, {flipHorizontal: false});
                const detectedGesture = this.analyzeHands(hands);

                if (detectedGesture === 'PEACE_SIGN') {
                    logger.info('[GestureCapture] ✌️ Peace Sign detected! Initiating countdown...');
                    if (this.captureCallback) {
                        this.captureCallback();
                    }
                    this.stopTracking(); 
                    return;
                }
            } catch (err) {
                logger.error('[GestureCapture] Error during prediction', err);
            }
        }

        if (this.isTracking) {
            requestAnimationFrame(() => this.detectionLoop());
        }
    }

    private analyzeHands(hands: handPoseDetection.Hand[]): RecognizedGesture {
        if (hands.length === 0) return 'NONE';

        const hand = hands[0];
        if (!hand.keypoints) return 'NONE';
        
        const indexTip = hand.keypoints.find(k => k.name === 'index_finger_tip');
        const indexPip = hand.keypoints.find(k => k.name === 'index_finger_pip');
        
        const middleTip = hand.keypoints.find(k => k.name === 'middle_finger_tip');
        const middlePip = hand.keypoints.find(k => k.name === 'middle_finger_pip');
        
        const ringTip = hand.keypoints.find(k => k.name === 'ring_finger_tip');
        const ringPip = hand.keypoints.find(k => k.name === 'ring_finger_pip');
        
        const pinkyTip = hand.keypoints.find(k => k.name === 'pinky_finger_tip');
        const pinkyPip = hand.keypoints.find(k => k.name === 'pinky_finger_pip');

        if (indexTip && indexPip && middleTip && middlePip && ringTip && ringPip && pinkyTip && pinkyPip) {
            const isIndexUp = indexTip.y < indexPip.y;
            const isMiddleUp = middleTip.y < middlePip.y;
            const isRingDown = ringTip.y > ringPip.y;
            const isPinkyDown = pinkyTip.y > pinkyPip.y;

            if (isIndexUp && isMiddleUp && isRingDown && isPinkyDown) {
                return 'PEACE_SIGN';
            }
        }

        return 'NONE';
    }
}

export default new GestureCaptureService();
