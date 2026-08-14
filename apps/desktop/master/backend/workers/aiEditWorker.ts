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
             // Basic approximation of exposure via brightness
             modulateOptions.brightness = Math.max(0, 1 + (editParams.exposure / 2)); 
          }
          if (editParams.saturation !== undefined) {
             modulateOptions.saturation = Math.max(0, 1 + (editParams.saturation / 100));
          }
          if (editParams.whiteBalance) {
             // White balance would typically involve color tinting/temperature
             // Keeping it simple here or apply specific tinting
          }
          if (editParams.contrast !== undefined) {
             // Not natively in modulate, sometimes handled via linear
             // We'll leave as simple mapping
          }
          
          if (Object.keys(modulateOptions).length > 0) {
             image = image.modulate(modulateOptions);
          }

          if (editParams.cropSuggestion) {
             image = image.extract({
               left: Math.round(editParams.cropSuggestion.x),
               top: Math.round(editParams.cropSuggestion.y),
               width: Math.round(editParams.cropSuggestion.width),
               height: Math.round(editParams.cropSuggestion.height)
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
