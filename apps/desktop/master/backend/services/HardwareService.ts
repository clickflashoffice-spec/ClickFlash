import { execFile } from 'child_process';
import { promisify } from 'util';
import { Logger } from '../utils/logger';
import DatabaseManager from '../database/db';
import { InventoryService } from './InventoryService';
import * as ptp from 'pdf-to-printer';
import fs from 'fs';

const execFileAsync = promisify(execFile);

/**
 * Run a PowerShell script safely by passing it via -EncodedCommand.
 * This avoids shell interpretation of the script content entirely.
 */
function runPowerShell(script: string): Promise<{ stdout: string; stderr: string }> {
  const encoded = Buffer.from(script, 'utf16le').toString('base64');
  return execFileAsync('powershell', ['-NoProfile', '-NonInteractive', '-EncodedCommand', encoded]);
}

/**
 * Validate a printer name contains only safe characters.
 * Rejects names with PowerShell metacharacters that could escape string context.
 */
function validatePrinterName(name: string): boolean {
  // Allow alphanumeric, spaces, hyphens, underscores, dots, parens, #
  return /^[\w\s\-.()\/#]+$/.test(name) && name.length <= 200;
}

export interface PrinterInfo {
    name: string;
    status: string;
    jobCount: number;
    driver: string;
    isDefault: boolean;
}

export interface PrintJob {
    id: string;
    photoPath: string;
    printerName: string;
    priority: number;
    addedAt: number;
}

export class HardwareService {
    private logger: Logger;
    private inventoryService: InventoryService;
    private queue: PrintJob[] = [];
    private isProcessing: boolean = false;
    private clockAltered: boolean = false;
    private lastCheckedTime: number = Date.now();
    private clockInterval: NodeJS.Timeout | null = null;

    constructor(logger: Logger, _db: DatabaseManager, inventoryService: InventoryService) {
        this.logger = logger;
        this.inventoryService = inventoryService;
        this.startClockMonitor();
    }

    private startClockMonitor() {
        this.clockInterval = setInterval(() => {
            const now = Date.now();
            // If time jumped backwards by more than 5 seconds or forwards by more than 5 minutes unexpectedly
            if (now < this.lastCheckedTime - 5000 || now > this.lastCheckedTime + 300000) {
                this.clockAltered = true;
                this.logger.warn('[HardwareService] System clock alteration detected (Time Jump)!');
            }
            this.lastCheckedTime = now;
        }, 10000);
    }

    public hasClockAltered(): boolean {
        return this.clockAltered;
    }

    public resetTamperFlags(): void {
        this.clockAltered = false;
    }

    /**
     * Get detailed printer information using PowerShell
     */
    public async getPrinters(): Promise<PrinterInfo[]> {
        try {
            const { stdout } = await runPowerShell('Get-Printer | Select-Object Name, PrinterStatus, JobCount, DriverName | ConvertTo-Json');
            if (!stdout.trim()) return [];

            const rawPrinters = JSON.parse(stdout);
            const printerArray = Array.isArray(rawPrinters) ? rawPrinters : [rawPrinters];

            // Get default printer
            const { stdout: defaultPrinterName } = await runPowerShell("(Get-WmiObject -Query 'SELECT Name FROM Win32_Printer WHERE Default = True').Name");
            const trimmedDefault = defaultPrinterName.trim();

            return printerArray.map(p => ({
                name: p.Name,
                status: this.mapStatus(p.PrinterStatus),
                jobCount: p.JobCount,
                driver: p.DriverName,
                isDefault: p.Name === trimmedDefault
            }));
        } catch (error: any) {
            this.logger.error('[HardwareService] Failed to enum printers', { error: error.message });
            // Fallback to pdf-to-printer basic list if PS fails
            try {
                const ptpPrinters = await ptp.getPrinters();
                return ptpPrinters.map((p: any) => ({
                    name: p.name,
                    status: 'Unknown',
                    jobCount: 0,
                    driver: '',
                    isDefault: false
                }));
            } catch (e) {
                return [];
            }
        }
    }

    /**
     * Enqueue a new print job
     */
    public async enqueuePrint(photoPath: string, printerName?: string, priority: number = 0): Promise<string> {
        const jobId = Math.random().toString(36).substring(7);

        if (!fs.existsSync(photoPath)) {
            throw new Error(`File not found: ${photoPath}`);
        }

        const resolvedPrinter = printerName || (await this.getDefaultPrinterName());

        // SECURITY: Validate printer name to prevent command injection
        if (!validatePrinterName(resolvedPrinter)) {
            throw new Error(`Invalid printer name: contains disallowed characters`);
        }

        const job: PrintJob = {
            id: jobId,
            photoPath,
            printerName: resolvedPrinter,
            priority,
            addedAt: Date.now()
        };

        this.queue.push(job);
        this.queue.sort((a, b) => b.priority - a.priority || a.addedAt - b.addedAt);

        this.logger.info(`[HardwareService] Job enqueued`, { jobId, photoPath, printer: job.printerName });

        // Start processing if not already running
        this.processQueue();

        return jobId;
    }

    private async processQueue() {
        if (this.isProcessing || this.queue.length === 0) return;

        this.isProcessing = true;
        const job = this.queue.shift();

        if (job) {
            try {
                this.logger.info(`[HardwareService] Printing JPEG job ${job.id}`, { printer: job.printerName, path: job.photoPath });

                /**
                 * Rule 1.9: High-Fidelity Photo Production
                 * We use a specialized PowerShell script that utilizes System.Drawing for direct GDI printing.
                 * This ensures proper scaling, color accuracy, and pixel-perfect output for photo printers (e.g., HiTi 525L).
                 */
                // SECURITY: Use -EncodedCommand to avoid shell injection.
                // Printer name and file path are passed as PowerShell string literals
                // with single-quotes (no variable expansion) after validation.
                const safeFilePath = job.photoPath.replace(/'/g, "''");
                const safePrinterName = job.printerName.replace(/'/g, "''");
                const psScript = `
                    Add-Type -AssemblyName System.Drawing
                    $printerName = '${safePrinterName}'
                    $filePath = '${safeFilePath}'
                    $doc = New-Object System.Drawing.Printing.PrintDocument
                    $doc.PrinterSettings.PrinterName = $printerName
                    $doc.DefaultPageSettings.PrinterResolution = $doc.PrinterSettings.PrinterResolutions | Where-Object { $_.Kind -eq 'Custom' -or $_.Kind -eq 'High' } | Select-Object -First 1
                    $doc.add_PrintPage({
                        param($sender, $e)
                        $img = [System.Drawing.Image]::FromFile($filePath)
                        $destRect = $e.MarginBounds
                        $destRect.X = 0
                        $destRect.Y = 0
                        $destRect.Width = $e.PageSettings.PrintableArea.Width
                        $destRect.Height = $e.PageSettings.PrintableArea.Height
                        $e.Graphics.DrawImage($img, $destRect)
                        $img.Dispose()
                    })
                    $doc.Print()
                `;

                await runPowerShell(psScript);
                this.logger.info(`[HardwareService] Job ${job.id} sent successfully to ${job.printerName}`);

                // Automated stock reduction (Phase 34)
                await this.inventoryService.deductStock('Ribbon', 1);

            } catch (error: any) {
                this.logger.error(`[HardwareService] Job ${job.id} failed`, { error: error.message });

                // Fallback to pdf-to-printer if GDI approach fails
                try {
                    this.logger.warn(`[HardwareService] Falling back to generic print for job ${job.id}`);
                    await ptp.print(job.photoPath, { printer: job.printerName });

                    // Deduct stock even on fallback success
                    await this.inventoryService.deductStock('Ribbon', 1);
                } catch (fallbackErr: any) {
                    this.logger.error(`[HardwareService] Fallback print also failed`, { error: fallbackErr.message });
                }
            }
        }

        this.isProcessing = false;
        // Check for next job
        setImmediate(() => this.processQueue());
    }

    private async getDefaultPrinterName(): Promise<string> {
        try {
            const { stdout } = await runPowerShell("(Get-WmiObject -Query 'SELECT Name FROM Win32_Printer WHERE Default = True').Name");
            return stdout.trim();
        } catch (e) {
            return '';
        }
    }

    private mapStatus(statusCode: number): string {
        const statuses: Record<number, string> = {
            0: 'Ready',
            1: 'Paused',
            2: 'Error',
            3: 'Pending Deactivation',
            4: 'Paper Jam',
            5: 'Paper Out',
            6: 'Manual Feed Required',
            7: 'Paper Problem',
            8: 'Offline',
            9: 'I/O Active',
            10: 'Busy'
        };
        return statuses[statusCode] || `Code ${statusCode}`;
    }
}
