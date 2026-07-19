import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-react-native';
import { decodeJpeg } from '@tensorflow/tfjs-react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as blazeface from '@tensorflow-models/blazeface';
import * as mobilenet from '@tensorflow-models/mobilenet';
import { toByteArray } from 'base64-js';
import { logger } from '@clickflash/logger';

let blazeFaceModel: blazeface.BlazeFaceModel | null = null;
let mobilenetModel: mobilenet.MobileNet | null = null;
let tfReady = false;

async function initModels() {
  if (!tfReady) {
    await tf.ready();
    tfReady = true;
    logger.info('[FaceBiometricService] TFJS is ready');
  }
  if (!blazeFaceModel) {
    logger.info('[FaceBiometricService] Loading BlazeFace model...');
    blazeFaceModel = await blazeface.load();
    logger.info('[FaceBiometricService] BlazeFace loaded');
  }
  if (!mobilenetModel) {
    logger.info('[FaceBiometricService] Loading MobileNet model...');
    mobilenetModel = await mobilenet.load({ version: 2, alpha: 1.0 });
    logger.info('[FaceBiometricService] MobileNet loaded');
  }
}

/**
 * Extracts a 128-dimensional face embedding from a local image file URI.
 * Returns the vector and a confidence score (1.0 = single clear face).
 */
export async function extractFaceVector(
  imageUri: string
): Promise<{ vector: number[]; confidence: number }> {
  await initModels();

  if (!blazeFaceModel || !mobilenetModel) {
    throw new Error('Biometric models not initialized');
  }

  logger.info('[FaceBiometricService] Reading image for face vector extraction...', { args: [imageUri] });
  const imgB64 = await FileSystem.readAsStringAsync(imageUri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const bytes = toByteArray(imgB64);
  const imageTensor = decodeJpeg(bytes);

  logger.info('[FaceBiometricService] Estimating faces...');
  const predictions = await blazeFaceModel.estimateFaces(imageTensor, false);

  if (predictions.length === 0) {
    imageTensor.dispose();
    throw new Error('No face detected in image');
  }

  const face = predictions[0];
  const topLeft = face.topLeft as [number, number];
  const bottomRight = face.bottomRight as [number, number];

  const y = topLeft[1];
  const x = topLeft[0];
  const height = bottomRight[1] - y;
  const width = bottomRight[0] - x;

  const [imgHeight, imgWidth] = imageTensor.shape;

  const y1 = Math.max(0, y / imgHeight);
  const x1 = Math.max(0, x / imgWidth);
  const y2 = Math.min(1, (y + height) / imgHeight);
  const x2 = Math.min(1, (x + width) / imgWidth);

  const batchedImage = imageTensor.expandDims(0) as tf.Tensor4D;
  const boxes = tf.tensor2d([[y1, x1, y2, x2]]);
  const boxIndices = tf.tensor1d([0], 'int32');

  const cropped = tf.image.cropAndResize(
    batchedImage,
    boxes,
    boxIndices,
    [224, 224]
  );

  logger.info('[FaceBiometricService] Extracting features via MobileNet...');
  const embeddings = mobilenetModel.infer(cropped, true);

  const flatEmbeddings = embeddings.flatten();
  const slice = flatEmbeddings.slice([0], [128]);

  const vector = Array.from(slice.dataSync() as unknown as number[]);
  logger.info('[FaceBiometricService] Successfully extracted 128D vector.');

  // Cleanup tensors
  imageTensor.dispose();
  batchedImage.dispose();
  boxes.dispose();
  boxIndices.dispose();
  cropped.dispose();
  embeddings.dispose();
  flatEmbeddings.dispose();
  slice.dispose();

  // Confidence: 1.0 when exactly one face detected, lower for multiple
  const confidence = predictions.length === 1 ? 1.0 : 1.0 / predictions.length;

  return { vector, confidence };
}

/**
 * Computes cosine similarity between two 128D face embeddings.
 * Returns a score between -1.0 and 1.0 (1.0 = exact match).
 */
export function computeCosineSimilarity(vectorA: number[], vectorB: number[]): number {
  if (!vectorA || !vectorB || vectorA.length !== vectorB.length || vectorA.length === 0) {
    return 0;
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vectorA.length; i++) {
    dotProduct += vectorA[i] * vectorB[i];
    normA += vectorA[i] * vectorA[i];
    normB += vectorB[i] * vectorB[i];
  }

  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Verifies a photographer's face scan against their enrolled 128D profile vector.
 */
export async function verifyPhotographerFace(
  imageUri: string,
  enrolledVector: number[],
  threshold = 0.82
): Promise<{ verified: boolean; confidence: number; vector: number[] }> {
  const { vector } = await extractFaceVector(imageUri);
  const confidence = computeCosineSimilarity(vector, enrolledVector);

  logger.info('[FaceBiometricService] Face verification complete.', {
    args: [`Confidence: ${confidence.toFixed(4)} (Threshold: ${threshold})`],
  });

  return {
    verified: confidence >= threshold,
    confidence,
    vector,
  };
}

export const faceBiometricService = {
  extractFaceVector,
  computeCosineSimilarity,
  verifyPhotographerFace,
};
