import { exec } from 'child_process';
import path from 'path';

export interface PrintJob {
    filePath: string;
    printerName?: string;
    copies?: number;
}

export class PrintSpooler {
    
    /**
     * Executes a raw print command to the system's local receipt or photo printer
     */
    async printDocument(job: PrintJob): Promise<boolean> {
        return new Promise((resolve, reject) => {
            console.log(`[PrintSpooler] Spooling ${job.filePath} to printer ${job.printerName || 'DEFAULT'}`);
            
            // Normalize path for Windows
            const normalizedPath = path.resolve(job.filePath);
            
            // Windows-specific print command (using powershell for simplicity, 
            // though in production SumatraPDF or raw lpr is better)
            let command = `powershell -command "Start-Process -FilePath '${normalizedPath}' -Verb Print -PassThru | %{sleep 5;$_} | kill"`;
            
            if (process.platform !== 'win32') {
                // Linux/Mac fallback using lp
                command = `lp ${job.printerName ? `-d ${job.printerName}` : ''} -n ${job.copies || 1} "${normalizedPath}"`;
            }

            exec(command, (error, stdout, stderr) => {
                if (error) {
                    console.error(`[PrintSpooler] Print error: ${error.message}`);
                    return reject(error);
                }
                
                if (stderr) {
                    console.warn(`[PrintSpooler] Print stderr: ${stderr}`);
                }
                
                console.log(`[PrintSpooler] Print job sent successfully.`);
                resolve(true);
            });
        });
    }
}

export default new PrintSpooler();
