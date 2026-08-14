import path from 'path';
import sharp from 'sharp';
import fs from 'fs';

/**
 * Applies a heavy diagonal watermark grid over images to protect unpurchased assets.
 */
export class WatermarkWorker {
    private watermarkImagePath: string;

    constructor() {
        this.watermarkImagePath = path.join(process.cwd(), 'assets', 'watermark-grid.png');
    }

    /**
     * Initializes the watermark grid image if it doesn't exist
     */
    public async initialize(): Promise<void> {
        const dir = path.dirname(this.watermarkImagePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        if (!fs.existsSync(this.watermarkImagePath)) {
            // Generate a basic SVG text grid to use as a watermark overlay
            const svgText = `
            <svg width="800" height="800" viewBox="0 0 800 800" xmlns="http://www.w3.org/2000/svg">
                <style>
                    .text {
                        font-family: Arial, sans-serif;
                        font-size: 48px;
                        fill: rgba(255, 255, 255, 0.4);
                        font-weight: bold;
                        transform: rotate(-45deg);
                        text-anchor: middle;
                    }
                </style>
                <text x="200" y="400" class="text">CLICKFLASH PROTECTED</text>
                <text x="600" y="100" class="text">CLICKFLASH PROTECTED</text>
                <text x="-200" y="700" class="text">CLICKFLASH PROTECTED</text>
                <text x="400" y="800" class="text">CLICKFLASH PROTECTED</text>
                <text x="800" y="500" class="text">CLICKFLASH PROTECTED</text>
            </svg>
            `;
            
            await sharp(Buffer.from(svgText))
                .png()
                .toFile(this.watermarkImagePath);
                
            console.log(`[WatermarkWorker] Initialized watermark asset at ${this.watermarkImagePath}`);
        }
    }

    /**
     * Applies the watermark to a given image buffer and returns the watermarked buffer.
     */
    public async applyWatermark(inputBuffer: Buffer): Promise<Buffer> {
        await this.initialize();
        
        // Load the image to get dimensions
        const image = sharp(inputBuffer);
        const metadata = await image.metadata();
        
        if (!metadata.width || !metadata.height) {
             throw new Error('Invalid image buffer');
        }

        // Create a repeating tile of the watermark that covers the image
        const watermarkTile = await sharp(this.watermarkImagePath)
            .resize(metadata.width, metadata.height, {
                fit: 'cover',
                position: 'center'
            })
            .png()
            .toBuffer();

        // Composite the original image with the watermark tile
        const watermarkedImage = await image
            .composite([{ input: watermarkTile, blend: 'over' }])
            .jpeg({ quality: 75 }) // Lower quality for previews
            .toBuffer();

        return watermarkedImage;
    }
}

export const watermarkWorker = new WatermarkWorker();
