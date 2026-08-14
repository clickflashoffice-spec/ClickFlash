import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-react-native';
import { decodeJpeg } from '@tensorflow/tfjs-react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as blazeface from '@tensorflow-models/blazeface';
import * as mobilenet from '@tensorflow-models/mobilenet';
import { toByteArray } from 'base64-js';
import { AI_CONFIG, l2Normalize } from '@clickflash/ai-core';
import { logger } from '@clickflash/logger';
import {
  ACTIVE_FACE_DESCRIPTOR_ALGORITHM,
  type ActiveFaceDescriptor,
} from './faceSearchClient';

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

/**
 * Produces the active legacy 128D descriptor entirely on device.
 *
 * This is a generic MobileNet feature descriptor from a detected face crop.
 * It is deliberately not represented as ArcFace, FaceNet, or another biometric
 * embedding model.
 */
export async function extractActiveFaceDescriptor(
  imageUri: string,
): Promise<ActiveFaceDescriptor> {
  await initModels();

  if (!blazeFaceModel || !mobilenetModel) {
    throw new Error('Models not loaded');
  }

  logger.info('Reading image for extraction...', { args: [imageUri] });
  const imgB64 = await FileSystem.readAsStringAsync(imageUri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const bytes = toByteArray(imgB64);
  const imageTensor = decodeJpeg(bytes);
  let batchedImage: tf.Tensor4D | null = null;
  let boxes: tf.Tensor2D | null = null;
  let boxIndices: tf.Tensor1D | null = null;
  let cropped: tf.Tensor4D | null = null;
  let features: tf.Tensor | null = null;
  let flatFeatures: tf.Tensor1D | null = null;
  let descriptorSlice: tf.Tensor1D | null = null;

  try {
    logger.info('Estimating faces...');
    const predictions = await blazeFaceModel.estimateFaces(imageTensor, false);

    if (predictions.length !== 1) {
      throw new Error(
        predictions.length === 0
          ? 'No face detected'
          : 'Exactly one face must be visible in the selfie',
      );
    }

    logger.info('Face detected, cropping...');
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

    batchedImage = imageTensor.expandDims(0) as tf.Tensor4D;
    boxes = tf.tensor2d([[y1, x1, y2, x2]]);
    boxIndices = tf.tensor1d([0], 'int32');
    cropped = tf.image.cropAndResize(
      batchedImage,
      boxes,
      boxIndices,
      [224, 224],
    );

    logger.info('Extracting generic MobileNet face-crop features...');
    features = mobilenetModel.infer(cropped, true);
    flatFeatures = features.flatten();
    descriptorSlice = flatFeatures.slice(
      [0],
      [AI_CONFIG.FACE_VECTOR_DIMENSION_ACTIVE],
    );

    const vector = l2Normalize(Array.from(descriptorSlice.dataSync()));
    if (vector.length !== AI_CONFIG.FACE_VECTOR_DIMENSION_ACTIVE) {
      throw new Error('Active face descriptor has an invalid dimension');
    }

    logger.info(
      `Successfully extracted ${AI_CONFIG.FACE_VECTOR_DIMENSION_ACTIVE}D active face descriptor.`,
    );
    return {
      algorithm: ACTIVE_FACE_DESCRIPTOR_ALGORITHM,
      dimensions: AI_CONFIG.FACE_VECTOR_DIMENSION_ACTIVE,
      vector,
    };
  } finally {
    descriptorSlice?.dispose();
    flatFeatures?.dispose();
    features?.dispose();
    cropped?.dispose();
    boxIndices?.dispose();
    boxes?.dispose();
    batchedImage?.dispose();
    imageTensor.dispose();
  }
}
