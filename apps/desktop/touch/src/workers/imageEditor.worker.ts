/// <reference lib="webworker" />

type EditCommand = {
    type: 'PROCESS_IMAGE';
    payload: {
        imageData: ImageData;
        options: {
            brightness?: number; // -100 to 100
            contrast?: number;   // -100 to 100
            saturation?: number; // -100 to 100
            autoEnhance?: boolean;
        };
    };
};

self.addEventListener('message', (event: MessageEvent<EditCommand>) => {
    if (event.data.type === 'PROCESS_IMAGE') {
        const { imageData, options } = event.data.payload;
        
        // Ensure we actually got valid ImageData
        if (!imageData || !imageData.data) {
            self.postMessage({ type: 'ERROR', payload: 'Invalid image data' });
            return;
        }

        const resultImageData = processImageData(imageData, options);
        
        // Transfer the ArrayBuffer back to avoid memory copy
        self.postMessage(
            { type: 'PROCESS_COMPLETE', payload: { imageData: resultImageData } },
            [resultImageData.data.buffer]
        );
    }
});

function processImageData(imageData: ImageData, options: EditCommand['payload']['options']): ImageData {
    const data = imageData.data;
    const len = data.length;

    // Apply auto-enhance heuristics
    let brightness = options.brightness || 0;
    let contrast = options.contrast || 0;
    let saturation = options.saturation || 0;

    if (options.autoEnhance) {
        // Very basic auto-enhance logic (bump contrast, slightly bump brightness and saturation)
        brightness = Math.min(brightness + 10, 100);
        contrast = Math.min(contrast + 20, 100);
        saturation = Math.min(saturation + 20, 100);
    }

    // Pre-calculate factors
    const contrastFactor = (259 * (contrast + 255)) / (255 * (259 - contrast));
    
    // Saturation factor
    const saturationFactor = saturation > 0 ? (100 + saturation) / 100 : (100 + saturation) / 100;

    // Pixel processing loop
    for (let i = 0; i < len; i += 4) {
        let r = data[i];
        let g = data[i + 1];
        let b = data[i + 2];

        // 1. Contrast
        if (contrast !== 0) {
            r = contrastFactor * (r - 128) + 128;
            g = contrastFactor * (g - 128) + 128;
            b = contrastFactor * (b - 128) + 128;
        }

        // 2. Brightness
        if (brightness !== 0) {
            const bVal = (brightness / 100) * 255;
            r += bVal;
            g += bVal;
            b += bVal;
        }

        // 3. Saturation
        if (saturation !== 0) {
            // Luma approximation
            const luminance = 0.2989 * r + 0.5870 * g + 0.1140 * b;
            r = luminance + saturationFactor * (r - luminance);
            g = luminance + saturationFactor * (g - luminance);
            b = luminance + saturationFactor * (b - luminance);
        }

        // Clamp values 0-255
        data[i] = r > 255 ? 255 : (r < 0 ? 0 : r);
        data[i + 1] = g > 255 ? 255 : (g < 0 ? 0 : g);
        data[i + 2] = b > 255 ? 255 : (b < 0 ? 0 : b);
    }

    return imageData;
}
