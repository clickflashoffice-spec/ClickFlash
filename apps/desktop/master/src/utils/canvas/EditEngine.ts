
import { ManualEdits, RetouchAction, Annotation, ImageEditRecipeV1 } from '../../types/shared';

/**
 * EditEngine
 * 
 * Handles the application of non-destructive edits to a canvas.
 * This decouples the rendering logic from the React component, allowing for
 * potential off-main-thread processing in the future.
 */
export class EditEngine {
    private ctx: CanvasRenderingContext2D;
    private bufferCanvas: OffscreenCanvas | HTMLCanvasElement;
    private bufferCtx: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D;

    constructor(ctx: CanvasRenderingContext2D) {
        this.ctx = ctx;
        // Use OffscreenCanvas if available for performance
        if (typeof OffscreenCanvas !== 'undefined') {
            this.bufferCanvas = new OffscreenCanvas(1, 1);
        } else {
            this.bufferCanvas = document.createElement('canvas');
        }
        this.bufferCtx = this.bufferCanvas.getContext('2d', { willReadFrequently: true }) as any;
    }

    private naturalWidth = 0;
    private naturalHeight = 0;

    /**
     * Renders all edits from the edit list onto the canvas
     */
    public async render(img: HTMLImageElement | HTMLCanvasElement, edits: Partial<ImageEditRecipeV1> & Partial<ManualEdits>) {
        const { width, height } = this.ctx.canvas;

        // Store natural dimensions for coordinate scaling
        this.naturalWidth = (img as HTMLImageElement).naturalWidth || width;
        this.naturalHeight = (img as HTMLImageElement).naturalHeight || height;

        // 1. Reset Canvas
        this.ctx.clearRect(0, 0, width, height);

        // 2. Draw Base Image
        // (In a full engine, we'd handle crop/rotate here first, but for now we draw clean)
        this.ctx.drawImage(img, 0, 0, width, height);

        // 3. Apply Retouch Actions (Heal)
        if (edits.retouchActions && edits.retouchActions.length > 0) {
            this.applyRetouchActions(edits.retouchActions);
        }

        // 4. Apply Annotations (Drawing)
        if (edits.annotations && edits.annotations.length > 0) {
            this.applyAnnotations(edits.annotations);
        }

        // 5. Apply Global Adjustments (Filters) -> In Phase 2, this would be WebGL
        // For now, we rely on CSS filters for simple adjustments, but "Heal" must be baked pixels.
    }

    /**
     * Applies a list of spot-heal actions using seamless cloning
     */
    private applyRetouchActions(actions: RetouchAction[]) {
        const { width, height } = this.ctx.canvas;

        // Ensure buffer is sized correctly
        if (this.bufferCanvas.width !== width || this.bufferCanvas.height !== height) {
            this.bufferCanvas.width = width;
            this.bufferCanvas.height = height;
        }

        // Copy current state to buffer for sampling
        this.bufferCtx.drawImage(this.ctx.canvas, 0, 0);

        actions.forEach(action => {
            this.heal(action);
        });
    }

    /**
     * Core Healing Algorithm: Source Patch + Radial Mask -> Target
     */
    private heal(action: RetouchAction) {
        const { x, y, radius, sourceX, sourceY } = action;

        // If no source is provided, we can't clone (or could auto-find, but simpler to require it)
        if (sourceX === undefined || sourceY === undefined) return;

        // Scale natural image coordinates to canvas coordinates
        const canvasW = this.ctx.canvas.width;
        const canvasH = this.ctx.canvas.height;
        const scaleX = canvasW / this.naturalWidth;
        const scaleY = canvasH / this.naturalHeight;

        // Scale coordinates
        const canvasX = x * scaleX;
        const canvasY = y * scaleY;
        const canvasSourceX = sourceX * scaleX;
        const canvasSourceY = sourceY * scaleY;
        const canvasRadius = radius * Math.min(scaleX, scaleY);

        const patchSize = canvasRadius * 2;
        const sx = canvasSourceX - canvasRadius;
        const sy = canvasSourceY - canvasRadius;
        const tx = canvasX - canvasRadius;
        const ty = canvasY - canvasRadius;

        // Create a temporary mini-canvas for the patch to apply feathering
        const patchCanvas = document.createElement('canvas');
        patchCanvas.width = patchSize;
        patchCanvas.height = patchSize;
        const patchCtx = patchCanvas.getContext('2d');
        if (!patchCtx) return;

        // 1. Draw the Source Patch
        patchCtx.drawImage(
            this.bufferCanvas as any,
            sx, sy, patchSize, patchSize,
            0, 0, patchSize, patchSize
        );

        // 2. Create Radial Alpha Mask (Feathering)
        // We use 'destination-in' to keep only the pixels inside the gradient
        patchCtx.globalCompositeOperation = 'destination-in';
        const gradient = patchCtx.createRadialGradient(
            canvasRadius, canvasRadius, 0,           // Inner circle (center)
            canvasRadius, canvasRadius, canvasRadius // Outer circle (edge)
        );
        // Core is opaque (1), edge is transparent (0)
        gradient.addColorStop(0, 'rgba(0,0,0,1)');
        gradient.addColorStop(0.5, 'rgba(0,0,0,1)'); // Keep center bit solid
        gradient.addColorStop(1, 'rgba(0,0,0,0)');

        patchCtx.fillStyle = gradient;
        patchCtx.fillRect(0, 0, patchSize, patchSize);

        // 3. Composite Featered Patch onto Main Canvas
        this.ctx.globalCompositeOperation = 'source-over'; // Standard blending
        this.ctx.drawImage(patchCanvas, tx, ty);
    }

    /**
     * Applies a list of annotations (brush, text, etc)
     */
    private applyAnnotations(annotations: Annotation[]) {
        annotations.forEach(anno => {
            if (anno.type === 'brush') {
                this.drawBrush(anno);
            }
        });
    }

    /**
     * Renders a brush stroke annotation
     */
    private drawBrush(anno: Annotation) {
        if (!anno.points || anno.points.length < 2) return;

        const { width, height } = this.ctx.canvas;
        const scaleX = width / this.naturalWidth;
        const scaleY = height / this.naturalHeight;

        this.ctx.save();
        this.ctx.globalCompositeOperation = 'source-over';
        this.ctx.strokeStyle = anno.color;
        this.ctx.lineWidth = anno.width * Math.min(scaleX, scaleY);
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        this.ctx.globalAlpha = anno.opacity;

        this.ctx.beginPath();
        this.ctx.moveTo(anno.points[0].x * scaleX, anno.points[0].y * scaleY);

        for (let i = 1; i < anno.points.length; i++) {
            this.ctx.lineTo(anno.points[i].x * scaleX, anno.points[i].y * scaleY);
        }

        this.ctx.stroke();
        this.ctx.restore();
    }
}
