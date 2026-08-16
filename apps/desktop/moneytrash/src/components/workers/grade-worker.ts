import {
  calculateLaplacianVariance,
  extractEmbeddedJpeg,
  findSkinBounds,
} from './grade-core';
import { calculateWasmLaplacianVariance } from './wasm-sharpness';

export type AIGrade = 'A+' | 'A' | 'B' | 'REJECT';

export interface EdgeAIGradingResult {
  grade: AIGrade;
  sharpnessScore: number;
  exposureScore: number;
  faceCount: number;
  reason?: string;
}

export interface WorkerGradeRequest {
  type: 'GRADE_FILE';
  file: File;
  id: string;
  brisqueScore?: number | null;
}

export interface WorkerGradeResponse {
  type: 'GRADE_RESULT';
  id: string;
  result: EdgeAIGradingResult;
}

const MAX_RAW_BYTES = 256 * 1024 * 1024;

self.onmessage = async (event: MessageEvent<WorkerGradeRequest>) => {
  if (event.data.type !== 'GRADE_FILE') return;
  const { file, id, brisqueScore } = event.data;
  try {
    const result = await performLocalEdgeAIGrading(file, brisqueScore);
    self.postMessage({ type: 'GRADE_RESULT', id, result } satisfies WorkerGradeResponse);
  } catch (error: unknown) {
    self.postMessage({
      type: 'GRADE_RESULT',
      id,
      result: {
        grade: 'REJECT',
        sharpnessScore: 0,
        exposureScore: 0,
        faceCount: 0,
        reason: `Error processing file: ${error instanceof Error ? error.message : String(error)}`,
      },
    } satisfies WorkerGradeResponse);
  }
};

async function decodeBitmap(file: File): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(file);
  } catch (originalError: unknown) {
    if (file.size > MAX_RAW_BYTES) {
      throw new Error('RAW file exceeds the 256 MiB local grading limit');
    }

    const jpeg = extractEmbeddedJpeg(await file.arrayBuffer());
    if (!jpeg) {
      throw new Error(
        `No embedded JPEG preview found in ${file.name || 'RAW file'}: ${
          originalError instanceof Error ? originalError.message : String(originalError)
        }`,
      );
    }
    const ownedPreview = new Uint8Array(jpeg.byteLength);
    ownedPreview.set(jpeg);
    return createImageBitmap(
      new Blob([ownedPreview.buffer], { type: 'image/jpeg' }),
    );
  }
}

export async function performLocalEdgeAIGrading(
  file: File,
  brisqueScore?: number | null
): Promise<EdgeAIGradingResult> {
  const bitmap = await decodeBitmap(file);
  const scale = Math.min(1, 512 / bitmap.width);
  const width = Math.max(3, Math.floor(bitmap.width * scale));
  const height = Math.max(3, Math.floor(bitmap.height * scale));
  const canvas = new OffscreenCanvas(width, height);
  const context = canvas.getContext('2d');
  if (!context) {
    bitmap.close();
    throw new Error('Could not create the local grading canvas');
  }

  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const rgba = context.getImageData(0, 0, width, height).data;
  const grayscale = new Uint8Array(width * height);
  let underExposedPixels = 0;
  let overExposedPixels = 0;

  for (let offset = 0, pixel = 0; offset < rgba.length; offset += 4, pixel++) {
    const luminance =
      0.299 * rgba[offset] + 0.587 * rgba[offset + 1] + 0.114 * rgba[offset + 2];
    grayscale[pixel] = luminance;
    if (luminance < 20) underExposedPixels++;
    if (luminance > 235) overExposedPixels++;
  }

  const { bounds, skinPixels } = findSkinBounds(rgba, width, height);
  const totalPixels = width * height;
  
  let sharpnessScore = 0;
  
  if (brisqueScore != null) {
    // If BRISQUE score is provided, use it directly as the sharpness/quality score
    sharpnessScore = Math.min(100, Math.max(0, Math.floor(brisqueScore)));
  } else {
    // Fallback to legacy Laplacian Variance
    const roiWidth = Math.max(0, bounds.endX - bounds.startX);
    const roiHeight = Math.max(0, bounds.endY - bounds.startY);
    const roiPixels = new Uint8Array(roiWidth * roiHeight);
    for (let y = 0; y < roiHeight; y++) {
      const sourceStart = (bounds.startY + y) * width + bounds.startX;
      roiPixels.set(grayscale.subarray(sourceStart, sourceStart + roiWidth), y * roiWidth);
    }
    const wasmVariance = await calculateWasmLaplacianVariance(
      roiPixels,
      roiWidth,
      roiHeight,
    );
    const laplacianVariance =
      wasmVariance ?? calculateLaplacianVariance(grayscale, width, height, bounds);
      
    sharpnessScore = Math.min(
      99,
      Math.max(10, Math.floor(laplacianVariance / 12)),
    );
  }

  const clippedRatio = (underExposedPixels + overExposedPixels) / totalPixels;
  const exposureScore = Math.min(
    99,
    Math.max(10, Math.floor(100 - clippedRatio * 150)),
  );
  const faceCount = Math.min(10, Math.floor(skinPixels / totalPixels / 0.015));

  let grade: AIGrade = 'B';
  let reason: string | undefined;
  if (sharpnessScore < 45 || exposureScore < 45) {
    grade = 'REJECT';
    reason =
      sharpnessScore < 45
        ? 'Motion blur / out of focus detected'
        : 'Severe exposure clipping detected';
  } else if (sharpnessScore >= 85 && exposureScore >= 80) {
    grade = 'A+';
  } else if (sharpnessScore >= 70) {
    grade = 'A';
  }

  return { grade, sharpnessScore, exposureScore, faceCount, reason };
}
