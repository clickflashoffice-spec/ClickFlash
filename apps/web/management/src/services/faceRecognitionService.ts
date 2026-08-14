
import { Photo } from '../types.ts';
import { logger } from '@/utils/logger';

export interface IdentifiedUser {
    id: string;
    name: string;
    roomNumber: string;
}

export const faceRecognitionService = {
    isLoaded: false,

    async loadModels() {
        // Simulating model loading time (tensorflow/face-api)
        await new Promise(resolve => setTimeout(resolve, 1500));
        this.isLoaded = true;
        logger.info("Face Recognition Models Loaded (Simulated)");
    },

    async detectFace(_imageBlob: Blob): Promise<boolean> {
        // Simulate face detection processing
        await new Promise(resolve => setTimeout(resolve, 1200));
        // Assume face detected for demo
        return true;
    },

    async identifyUser(_imageBlob: Blob): Promise<IdentifiedUser | null> {
        if (!this.isLoaded) await this.loadModels();
        
        // Simulate processing biometric data
        await new Promise(resolve => setTimeout(resolve, 2000));

        // DEMO LOGIC: 80% chance of successful identification
        // In a real app, this would compare the face descriptor against the user database
        if (Math.random() > 0.2) {
            return {
                id: 'guest-vip-001',
                name: 'Valued Guest',
                roomNumber: '101' // Mock room for demo
            };
        }
        return null;
    },

    async findMatches(referencePhoto: Blob, allPhotos: Photo[]): Promise<Photo[]> {
        if (!this.isLoaded) await this.loadModels();
        
        // Simulate searching through the database (processing delay)
        // In a real app, this would generate a descriptor for the reference photo
        // and compare Euclidean distance with stored descriptors.
        const processingTime = Math.min(allPhotos.length * 50, 3000); 
        await new Promise(resolve => setTimeout(resolve, processingTime));

        // DEMO LOGIC: Randomly return 20-40% of photos as "matches" to simulate finding the person
        // In production, use face-api.js descriptors here.
        return allPhotos.filter(() => Math.random() > 0.7);
    }
};
