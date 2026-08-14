import { BrowserWindow, IpcMainEvent } from "electron";
import { exec } from "child_process";
import path from "path";
import os from "os";
import fs from "fs";

export class TetherManager {
  private isTethering: boolean = false;
  private mockInterval: NodeJS.Timeout | null = null;
  private spoolDir: string;

  constructor(private emitToWindow: (channel: string, payload: any) => void) {
    this.spoolDir = path.join(os.tmpdir(), "clickflash-tether-spool");
    if (!fs.existsSync(this.spoolDir)) {
      fs.mkdirSync(this.spoolDir, { recursive: true });
    }
  }

  public startTethering() {
    if (this.isTethering) return { success: false, error: "Already tethering" };
    
    this.isTethering = true;
    this.emitToWindow("tether:status", { status: "connected", camera: "Mock Camera (Sony A7IV)" });
    
    // Simulate high-speed capture for load testing (1 photo every 2 seconds)
    this.mockInterval = setInterval(() => {
      this.simulateCapture();
    }, 2000);

    return { success: true };
  }

  public stopTethering() {
    this.isTethering = false;
    if (this.mockInterval) {
      clearInterval(this.mockInterval);
      this.mockInterval = null;
    }
    this.emitToWindow("tether:status", { status: "disconnected" });
    return { success: true };
  }

  public getStatus() {
    return {
      isTethering: this.isTethering,
      camera: this.isTethering ? "Mock Camera (Sony A7IV)" : null
    };
  }

  private simulateCapture() {
    const fileName = `DSC_${Date.now()}.jpg`;
    const filePath = path.join(this.spoolDir, fileName);
    
    // Create a dummy 1MB file to simulate a photo
    const dummyBuffer = Buffer.alloc(1024 * 1024, "MOCK_PHOTO_DATA");
    fs.writeFileSync(filePath, dummyBuffer);

    this.emitToWindow("tether:photo-captured", {
      fileName,
      filePath,
      size: dummyBuffer.length,
      timestamp: new Date().toISOString()
    });
  }
}
