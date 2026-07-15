import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-react-native';
import { decodeJpeg } from '@tensorflow/tfjs-react-native';
import * as FileSystem from 'expo-file-system';
import * as blazeface from '@tensorflow-models/blazeface';
import * as mobilenet from '@tensorflow-models/mobilenet';
import { toByteArray } from 'base64-js';
import { logger } from "@clickflash/logger";

let blazeFaceModel: blazeface.BlazeFaceModel | null = null;
let mobilenetModel: mobilenet.MobileNet | null = null;
let tfReady = false;

async function initModels() {
  if (!tfReady) {
    await tf.ready();
    tfReady = true;
    logger.info('TFJS is ready');
  }
  if (!blazeFaceModel) {
    logger.info('Loading BlazeFace model...');
    blazeFaceModel = await blazeface.load();
    logger.info('BlazeFace loaded');
  }
  if (!mobilenetModel) {
    logger.info('Loading MobileNet model...');
    mobilenetModel = await mobilenet.load({ version: 2, alpha: 1.0 });
    logger.info('MobileNet loaded');
  }
}

export async function extractFaceVector(imageUri: string): Promise<number[]> {
  await initModels();
  
  if (!blazeFaceModel || !mobilenetModel) {
    throw new Error('Models not loaded');
  }

  logger.info('Reading image for extraction...', { args: [imageUri] });
  // 1. Load image and decode to tensor
  const imgB64 = await FileSystem.readAsStringAsync(imageUri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  
  const bytes = toByteArray(imgB64);
  const imageTensor = decodeJpeg(bytes);

  logger.info('Estimating faces...');
  // 2. Run blazeFace
  const predictions = await blazeFaceModel.estimateFaces(imageTensor, false);
  
  if (predictions.length === 0) {
    imageTensor.dispose();
    throw new Error('No face detected');
  }

  logger.info('Face detected, cropping...');
  const face = predictions[0];
  const topLeft = face.topLeft as [number, number];
  const bottomRight = face.bottomRight as [number, number];
  
  const y = topLeft[1];
  const x = topLeft[0];
  const height = bottomRight[1] - y;
  const width = bottomRight[0] - x;

  // 3. Crop the tensor to the face
  // The cropAndResize function expects normalized coordinates (0 to 1)
  const [imgHeight, imgWidth] = imageTensor.shape;
  
  const y1 = Math.max(0, y / imgHeight);
  const x1 = Math.max(0, x / imgWidth);
  const y2 = Math.min(1, (y + height) / imgHeight);
  const x2 = Math.min(1, (x + width) / imgWidth);

  // cropAndResize expects a 4D tensor [batch, height, width, channels]
  const batchedImage = imageTensor.expandDims(0) as tf.Tensor4D;
  const boxes = tf.tensor2d([[y1, x1, y2, x2]]);
  const boxIndices = tf.tensor1d([0], 'int32');
  
  // MobileNet expects 224x224
  const cropped = tf.image.cropAndResize(
    batchedImage,
    boxes,
    boxIndices,
    [224, 224]
  );
  
  logger.info('Extracting features via MobileNet...');
  // 4. Run MobileNetV2
  // infer() returns a tensor representing the features
  const embeddings = mobilenetModel.infer(cropped, true);
  
  // 5. Slice to 128D
  const flatEmbeddings = embeddings.flatten();
  const slice = flatEmbeddings.slice([0], [128]);
  
  const vector = Array.from(slice.dataSync());
  logger.info('Successfully extracted 128D vector.');
  
  // Cleanup tensors
  imageTensor.dispose();
  batchedImage.dispose();
  boxes.dispose();
  boxIndices.dispose();
  cropped.dispose();
  embeddings.dispose();
  flatEmbeddings.dispose();
  slice.dispose();
  
  return vector;
}

export async function searchGalleryWithVector(vector: number[], deskId: string): Promise<any[]> {
  // Hit the Cloudflare Workers endpoint, which queries Vectorize
  const response = await fetch(`https://hub.clickflash.app/api/gallery/search`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      desk_id: deskId,
      vector: vector
    })
  });
  
  if (!response.ok) {
    throw new Error('Gallery search failed');
  }
  
  const data = await response.json();
  return data.matches || []; 
}
