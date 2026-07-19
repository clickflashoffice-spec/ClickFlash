/// <reference types="react" />

/**
 * Ambient type stubs for third-party packages that do not ship their own
 * TypeScript declarations in this Expo project.
 *
 * Uses triple-slash reference instead of `import` so this remains a global
 * ambient script — module augmentations via `declare module` are visible
 * everywhere without explicit imports.
 */

// expo-camera
declare module 'expo-camera' {
  interface TakePictureOptions {
    quality?: number;
    base64?: boolean;
    exif?: boolean;
    skipProcessing?: boolean;
  }

  interface PictureResult {
    uri: string;
    base64?: string;
    width: number;
    height: number;
  }

  interface CameraViewProps extends React.ComponentProps<'div'> {
    facing?: 'front' | 'back';
    ref?: React.Ref<CameraView>;
    style?: any;
    children?: React.ReactNode;
  }

  class CameraView extends React.Component<CameraViewProps> {
    takePictureAsync(options?: TakePictureOptions): Promise<PictureResult>;
  }

  function useCameraPermissions(): [
    { granted: boolean; canAskAgain: boolean } | null,
    () => Promise<{ granted: boolean; canAskAgain: boolean }>,
  ];
}

// @tensorflow/tfjs
declare module '@tensorflow/tfjs' {
  function ready(): Promise<void>;
  function tensor1d(values: number[], dtype?: string): any;
  function tensor2d(values: number[][]): any;
  const image: {
    cropAndResize(
      image: any,
      boxes: any,
      boxIndices: any,
      cropSize: [number, number]
    ): any;
  };
  type Tensor4D = any;
}

// @tensorflow/tfjs-react-native (side-effect + named exports)
declare module '@tensorflow/tfjs-react-native' {
  function decodeJpeg(bytes: Uint8Array): any;
}

// @tensorflow-models/blazeface
declare module '@tensorflow-models/blazeface' {
  interface NormalizedFace {
    topLeft: [number, number] | any;
    bottomRight: [number, number] | any;
    probability: number | number[];
  }
  interface BlazeFaceModel {
    estimateFaces(input: any, returnTensors?: boolean): Promise<NormalizedFace[]>;
  }
  function load(): Promise<BlazeFaceModel>;
}

// @tensorflow-models/mobilenet
declare module '@tensorflow-models/mobilenet' {
  interface MobileNet {
    infer(img: any, embedding?: boolean): any;
  }
  function load(config?: { version?: number; alpha?: number }): Promise<MobileNet>;
}
