/**
 * hardwareTriggerService.ts
 * Integrates with high-speed hardware triggers (lasers, break-beams) often used on rides.
 * When triggered, it instantly instructs the connected DSLR array to fire.
 */

import { logger } from '../utils/logger';
import { z } from 'zod';
import { randomUUID } from 'crypto';

const HardwareTriggerSchema = z.object({
    sensorId: z.string().min(1, 'Sensor ID is required'),
    rideId: z.string().min(1, 'Ride ID is required'),
    timestamp: z.string().optional()
});

class HardwareTriggerService {
    /**
     * Handle incoming trigger pulse from a PLC or Arduino.
     */
    public async handleTrigger(payload: unknown) {
        try {
            const data = HardwareTriggerSchema.parse(payload);
            const captureId = randomUUID();
            const time = data.timestamp || new Date().toISOString();

            logger.info('HARDWARE_TRIGGER_RECEIVED', {
                sensorId: data.sensorId,
                rideId: data.rideId,
                captureId,
                time
            });

            // In reality, this would send an immediate signal over USB (PTP protocol) or Ethernet
            // to a DSLR camera (e.g. via gphoto2) to release the shutter.
            await this.fireCameraArray(data.rideId);

            return {
                success: true,
                captureId,
                message: 'Shutter triggered successfully'
            };

        } catch (error) {
            logger.error('HARDWARE_TRIGGER_FAILED', { error });
            throw new Error('Invalid hardware trigger payload');
        }
    }

    private async fireCameraArray(rideId: string) {
        // Mocking the high-speed capture delay
        logger.debug('FIRING_SHUTTER', { rideId });
        return new Promise(resolve => setTimeout(resolve, 10)); // 10ms hardware latency
    }
}

export const hardwareTriggerService = new HardwareTriggerService();
