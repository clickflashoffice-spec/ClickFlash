import { parentPort } from 'worker_threads';
import { geminiService } from '../services/geminiService';
import sharp from 'sharp';

if (!parentPort) {
  throw new Error("This file must be run as a worker thread");
}

parentPort.on('message', async (message: { type: 'analyze' | 'edit' | 'thumbnail'; payload: any; taskId: string }) => {
  try {
    let result;
    switch (message.type) {
      case 'analyze':
        // Ensure geminiService is initialized or ready if needed, here we assume it's ready or will throw
        result = await geminiService.analyzePhotoForCulling(
          message.payload.buffer,
          message.payload.mimeType
        );
        break;

      case 'edit': {
        const { buffer, editParams } = message.payload;
        let image = sharp(buffer);

        if (editParams) {
          const modulateOptions: any = {};
          
          if (editParams.exposure !== undefined) {
             modulateOptions.brightness = Math.max(0.1, 1 + (editParams.exposure / 100)); 
          }
          if (editParams.saturation !== undefined) {
             modulateOptions.saturation = Math.max(0, 1 + (editParams.saturation / 100));
          }
          if (editParams.hue !== undefined) {
             modulateOptions.hue = editParams.hue;
          }
          
          if (Object.keys(modulateOptions).length > 0) {
             image = image.modulate(modulateOptions);
          }

          if (editParams.contrast !== undefined) {
             const c = (editParams.contrast + 100) / 100;
             image = image.linear(c, -(128 * c) + 128);
          }

          if (editParams.noiseReduction) {
              image = image.median(Math.max(3, editParams.noiseReduction));
          }

          if (editParams.sharpen) {
              image = image.sharpen();
          }

          if (editParams.cropSuggestion) {
             image = image.extract({
               left: Math.max(0, Math.round(editParams.cropSuggestion.x)),
               top: Math.max(0, Math.round(editParams.cropSuggestion.y)),
               width: Math.max(1, Math.round(editParams.cropSuggestion.width)),
               height: Math.max(1, Math.round(editParams.cropSuggestion.height))
             });
          }
        }
        
        result = await image.toBuffer();
        break;
      }

      case 'thumbnail': {
        const { buffer: thumbBuffer } = message.payload;
        const sizes = [200, 400, 800];
        
        result = await Promise.all(
          sizes.map(async (size) => {
            const buf = await sharp(thumbBuffer)
              .resize(size, size, { fit: 'inside', withoutEnlargement: true })
              .toBuffer();
            return { size, buffer: buf };
          })
        );
        break;
      }

      default:
        throw new Error(`Unknown task type: ${message.type}`);
    }
    
    parentPort?.postMessage({ taskId: message.taskId, success: true, result });
  } catch (error: any) {
    parentPort?.postMessage({ taskId: message.taskId, success: false, error: error.message });
  }
});
