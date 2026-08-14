// backend/shared/thermalService.ts
import { spawn } from 'child_process';
import { Logger } from '../utils/logger';
import * as si from 'systeminformation';

export enum ThermalStatus {
    NOMINAL = 'NOMINAL',
    WARNING = 'WARNING',
    CRITICAL = 'CRITICAL',
    EMERGENCY = 'EMERGENCY'
}

export class ThermalService {
    private logger: Logger;
    private maxTempC = 85;      // EMERGENCY: Strong throttle
    private criticalTempC = 78; // CRITICAL: Skip tasks
    private warningTempC = 72;  // WARNING: Reduce concurrency

    private currentStatus: ThermalStatus = ThermalStatus.NOMINAL;
    private currentTemp: number = 0;

    constructor(logger: Logger) {
        this.logger = logger;
        this.logger.info('[ThermalService] Initialized hardware sentinel.');
    }


    /**
     * Reads temperature using systeminformation (Modern)
     * with a quick fallback to WMIC (Legacy/Reliable)
     */
    public async getTemperature(): Promise<number | null> {
        try {
            // Attempt SystemInfo with a timeout
            const siTemp = await Promise.race([
                si.cpuTemperature(),
                new Promise<any>((_, reject) => setTimeout(() => reject('SI Timeout'), 1500))
            ]);

            if (siTemp && siTemp.main !== null && siTemp.main !== -1) {
                this.currentTemp = siTemp.main;
                return siTemp.main;
            }
        } catch (e) {
            // SI failed or timed out, fallback to legacy WMIC
        }

        return this.getTempLegacy();
    }

    private async getTempLegacy(): Promise<number | null> {
        return new Promise((resolve) => {
            if (process.platform !== 'win32') return resolve(null);

            const child = spawn('wmic', [
                '/namespace:\\\\root\\wmi',
                'PATH',
                'MSAcpi_ThermalZoneTemperature',
                'get',
                'CurrentTemperature'
            ]);

            let stdout = '';
            child.stdout.on('data', (data) => { stdout += data.toString(); });

            const timeout = setTimeout(() => {
                child.kill();
                resolve(null);
            }, 2000);

            child.on('close', () => {
                clearTimeout(timeout);
                try {
                    const lines = stdout.split('\n').filter(line => line.trim().length > 0 && !isNaN(parseInt(line.trim())));
                    if (lines.length > 0) {
                        const tempDK = parseInt(lines[lines.length - 1].trim()); // Last line is usually the value
                        const celsius = (tempDK - 2732) / 10.0;
                        this.currentTemp = celsius;
                        return resolve(celsius);
                    }
                } catch (e) { 
                    this.logger.warn('[ThermalService] Failed to parse temperature output:', { error: e instanceof Error ? e.message : String(e) });
                }
                resolve(null);
            });
            child.on('error', () => resolve(null));
        });
    }

    public async getThrottleDelay(): Promise<number> {
        const temp = await this.getTemperature();
        if (temp === null) return 0;

        if (temp >= this.maxTempC) {
            this.currentStatus = ThermalStatus.EMERGENCY;
            return 8000; // Strong 8s pause
        }
        if (temp >= this.criticalTempC) {
            this.currentStatus = ThermalStatus.CRITICAL;
            return 3000; // 3s pause
        }
        if (temp >= this.warningTempC) {
            this.currentStatus = ThermalStatus.WARNING;
            return 500; // Micro-pause
        }

        this.currentStatus = ThermalStatus.NOMINAL;
        return 0;
    }

    /**
     * Suggests the number of workers based on current temperature
     */
    public async getSuggestedConcurrency(max: number): Promise<number> {
        const temp = await this.getTemperature();
        if (temp === null) return max;

        if (temp >= this.criticalTempC) return 1; // Minimum workers
        if (temp >= this.warningTempC) return Math.max(1, Math.floor(max / 2)); // Half capacity

        return max;
    }

    public getStatus() {
        return { temp: this.currentTemp, status: this.currentStatus };
    }
}
