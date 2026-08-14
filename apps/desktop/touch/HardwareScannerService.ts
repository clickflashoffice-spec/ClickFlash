import { SerialPort } from 'serialport';
import { ReadlineParser } from '@serialport/parser-readline';
import { BrowserWindow } from 'electron';
import { logger } from '@clickflash/logger';

export class HardwareScannerService {
  private port: SerialPort | null = null;
  private parser: ReadlineParser | null = null;
  private mainWindow: BrowserWindow | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private vendorId?: string;
  private productId?: string;

  constructor(mainWindow: BrowserWindow, vendorId?: string, productId?: string) {
    this.mainWindow = mainWindow;
    this.vendorId = vendorId;
    this.productId = productId;
  }

  public async initialize() {
    logger.info('[HardwareScanner] Initializing...');
    await this.connectToScanner();
  }

  private async connectToScanner() {
    try {
      const ports = await SerialPort.list();
      
      // Attempt to find a specific scanner by VID/PID, or just grab the first available generic barcode scanner
      let targetPort = ports.find(p => p.vendorId === this.vendorId && p.productId === this.productId);
      
      if (!targetPort && ports.length > 0) {
        // Fallback: Just grab the first likely candidate if we don't have strict VID/PID
        // Often COM ports with manufacturer names like "Symbol" or "Honeywell" are scanners
        targetPort = ports.find(p => p.manufacturer?.toLowerCase().includes('scanner') || p.manufacturer?.toLowerCase().includes('barcode'));
      }

      if (!targetPort) {
        logger.warn('[HardwareScanner] No suitable scanner found on COM ports.');
        this.scheduleReconnect();
        return;
      }

      logger.info(`[HardwareScanner] Connecting to ${targetPort.path}...`);

      this.port = new SerialPort({
        path: targetPort.path,
        baudRate: 9600, // Standard baud rate for most barcode/RFID scanners
        autoOpen: true
      });

      this.parser = this.port.pipe(new ReadlineParser({ delimiter: '\r\n' }));

      this.port.on('open', () => {
        logger.info(`[HardwareScanner] Connected successfully to ${targetPort!.path}`);
      });

      this.parser.on('data', (data: string) => {
        const scanData = data.trim();
        logger.debug(`[HardwareScanner] Scan received: ${scanData}`);
        if (this.mainWindow) {
          this.mainWindow.webContents.send('scanner:data', scanData);
        }
      });

      this.port.on('error', (err) => {
        logger.error(`[HardwareScanner] Error: ${err.message}`);
        this.scheduleReconnect();
      });

      this.port.on('close', () => {
        logger.info('[HardwareScanner] Connection closed. Attempting to reconnect...');
        this.scheduleReconnect();
      });

    } catch (error) {
      logger.error('[HardwareScanner] Failed to list or connect to ports', error instanceof Error ? error : { error: String(error) });
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    // Attempt to reconnect every 5 seconds
    this.reconnectTimer = setTimeout(() => {
      this.connectToScanner();
    }, 5000);
  }

  public close() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    if (this.port && this.port.isOpen) {
      this.port.close();
    }
  }
}
