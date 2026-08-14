import { useCallback, useMemo } from 'react';
import { ManualEdits } from '../types';

interface Point {
    x: number;
    y: number;
}

interface ImageSpaceOptions {
    containerRef: React.RefObject<HTMLElement | null>;
    imageRef: React.RefObject<HTMLImageElement | null>;
    edits: ManualEdits;
    zoom: number;
}

export const useImageSpace = ({
    containerRef,
    imageRef,
    edits,
    zoom
}: ImageSpaceOptions) => {

    // Total geometric rotation: rotate (steps of 90) + straighten (fine tuning)
    const totalRotation = useMemo(() => {
        const rotate = edits.rotate || 0;
        const straighten = edits.straighten || 0;
        return (rotate + straighten) % 360;
    }, [edits.rotate, edits.straighten]);

    // Straighten scale factor used to prevent edge cropping during rotation
    const straightenScale = useMemo(() => {
        const straighten = edits.straighten || 0;
        if (straighten === 0) return 1;
        const rad = Math.abs((straighten * Math.PI) / 180);
        return 1 / (Math.abs(Math.cos(rad)) + Math.abs(Math.sin(rad)));
    }, [edits.straighten]);

    /**
     * Maps viewport coordinates (e.g. from mouse event) to natural image pixel coordinates.
     */
    const viewportToImage = useCallback((clientX: number, clientY: number): Point | null => {
        const container = containerRef.current;
        const img = imageRef.current;
        if (!container || !img) return null;

        const containerRect = container.getBoundingClientRect();
        const imgRect = img.getBoundingClientRect();

        // 1. Center of the image in the viewport
        const imgCenterX = imgRect.left + imgRect.width / 2;
        const imgCenterY = imgRect.top + imgRect.height / 2;

        // 2. Point relative to image center
        const relX = clientX - imgCenterX;
        const relY = clientY - imgCenterY;

        // 3. Inverse Rotation (rotate point BACK by totalRotation)
        const rad = (-totalRotation * Math.PI) / 180;
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);

        // Point in "unrotated" but still scaled/panned space
        const rotatedX = relX * cos - relY * sin;
        const rotatedY = relX * sin + relY * cos;

        // 4. Inverse Scaling (Zoom * StraightenScale)
        // Note: Perspective is currently ignored for simplified mapping
        const combinedScale = zoom * straightenScale;
        const unscaledX = rotatedX / combinedScale;
        const unscaledY = rotatedY / combinedScale;

        // 5. Map to Natural Pixels
        const naturalWidth = img.naturalWidth;
        const naturalHeight = img.naturalHeight;

        // We need the "displayed" size before transforms (Object Fit: Contain aspect ratio)
        const ratio = naturalWidth / naturalHeight;
        const fitWidth = Math.min(containerRect.width, containerRect.height * ratio);
        const fitHeight = Math.min(containerRect.height, containerRect.width / ratio);

        // Map from CSS pixels (centered) to Natural pixels
        const naturalX = (naturalWidth / 2) + (unscaledX * (naturalWidth / fitWidth));
        const naturalY = (naturalHeight / 2) + (unscaledY * (naturalHeight / fitHeight));

        return { x: naturalX, y: naturalY };
    }, [containerRef, imageRef, totalRotation, zoom, straightenScale]);

    /**
     * Maps natural image pixel coordinates back to viewport coordinates.
     */
    const imageToViewport = useCallback((naturalX: number, naturalY: number): Point | null => {
        const container = containerRef.current;
        const img = imageRef.current;
        if (!container || !img) return null;

        const containerRect = container.getBoundingClientRect();
        const imgRect = img.getBoundingClientRect();

        const naturalWidth = img.naturalWidth;
        const naturalHeight = img.naturalHeight;

        // 1. Map Natural Pixels to "Local" (untransformed CSS pixels relative to center)
        const ratio = naturalWidth / naturalHeight;
        const fitWidth = Math.min(containerRect.width, containerRect.height * ratio);
        const fitHeight = Math.min(containerRect.height, containerRect.width / ratio);

        const localX = (naturalX - naturalWidth / 2) * (fitWidth / naturalWidth);
        const localY = (naturalY - naturalHeight / 2) * (fitHeight / naturalHeight);

        // 2. Apply Scaling (Zoom * StraightenScale)
        const combinedScale = zoom * straightenScale;
        const p1X = localX * combinedScale;
        const p1Y = localY * combinedScale;

        // 3. Apply Rotation (totalRotation)
        const rad = (totalRotation * Math.PI) / 180;
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);

        const rotatedX = p1X * cos - p1Y * sin;
        const rotatedY = p1X * sin + p1Y * cos;

        // 4. Map back to Viewport (add Pan and Image Center)
        // Image center in viewport includes current Pan if the image translates
        const imgCenterX = imgRect.left + imgRect.width / 2;
        const imgCenterY = imgRect.top + imgRect.height / 2;

        return {
            x: imgCenterX + rotatedX,
            y: imgCenterY + rotatedY
        };
    }, [containerRef, imageRef, totalRotation, zoom, straightenScale]);

    return {
        viewportToImage,
        imageToViewport,
        totalRotation,
        straightenScale
    };
};
