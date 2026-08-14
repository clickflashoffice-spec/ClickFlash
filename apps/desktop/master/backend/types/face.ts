export interface FaceBox {
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface FaceResult {
    descriptor: Float32Array;
    box: FaceBox;
}

export interface FaceAnalysis {
    faces: FaceResult[];
    scores?: {
        overall: number;
        sharpness: number;
        expression: number;
    };
    faceCount: number;
    width?: number;
    height?: number;
}

export interface FaceWorkerJob {
    type: 'get-descriptors';
    imagePath: string;
    modelsPath: string;
}

export interface FaceWorkerResult {
    success: boolean;
    error?: string;
    faces?: Array<{
        descriptor: number[];
        box: FaceBox;
    }>;
    scores?: {
        overall: number;
        sharpness: number;
        expression: number;
    };
    faceCount?: number;
    width?: number;
    height?: number;
}

