export type BrushType = 'pencil' | 'marker' | 'spray' | 'eraser';
export type ShapeType = 'rectangle' | 'circle' | 'arrow' | 'line';
export type ToolMode = 'brush' | 'shape' | 'text' | 'eraser' | 'select' | 'ai';

export interface BrushSettings {
    type: BrushType;
    size: number;
    color: string;
    opacity: number;
    hardness: number;
}

export interface ShapeSettings {
    type: ShapeType;
    strokeColor: string;
    fillColor: string;
    strokeWidth: number;
    fillOpacity: number;
}

export interface TextSettings {
    fontSize: number;
    fontFamily: string;
    color: string;
    backgroundColor?: string;
    isBold: boolean;
    isItalic: boolean;
}

export interface DrawingPoint {
    x: number;
    y: number;
    pressure?: number;
}

export interface DrawingStroke {
    id: string;
    points: DrawingPoint[];
    brush: BrushSettings;
    timestamp: number;
}

export interface ShapeAnnotation {
    id: string;
    type: ShapeType;
    startX: number;
    startY: number;
    endX: number;
    endY: number;
    settings: ShapeSettings;
    timestamp: number;
}

export interface TextAnnotation {
    id: string;
    x: number;
    y: number;
    text: string;
    settings: TextSettings;
    timestamp: number;
    rotation?: number;
}

export interface DrawingLayer {
    id: string;
    name: string;
    visible: boolean;
    opacity: number;
    strokes: DrawingStroke[];
    shapes: ShapeAnnotation[];
    texts: TextAnnotation[];
}

export class DrawingEngine {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private isDrawing = false;
    private currentStroke: DrawingPoint[] = [];
    private currentShape: ShapeAnnotation | null = null;
    private onStrokeComplete?: (stroke: DrawingStroke) => void;
    private onShapeComplete?: (shape: ShapeAnnotation) => void;
    private currentBrush: BrushSettings = {
        type: 'pencil',
        size: 5,
        color: '#000000',
        opacity: 1,
        hardness: 1,
    };
    private currentShapeSettings: ShapeSettings = {
        type: 'rectangle',
        strokeColor: '#000000',
        fillColor: 'transparent',
        strokeWidth: 2,
        fillOpacity: 0.5,
    };
    private naturalSize: { width: number; height: number } = { width: 0, height: 0 };

    constructor(canvas: HTMLCanvasElement, naturalSize: { width: number; height: number }) {
        this.canvas = canvas;
        this.naturalSize = naturalSize;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            throw new Error('Failed to get canvas context');
        }
        this.ctx = ctx;
        this.setupCanvas();
    }

    private setupCanvas() {
        const dpr = window.devicePixelRatio || 1;

        // We set the canvas internal resolution to match the natural size * dpr for crispness
        // The visual size (style) is handled by the parent container (100% of viewport)
        this.canvas.width = this.naturalSize.width * dpr;
        this.canvas.height = this.naturalSize.height * dpr;

        // Scale the context so we can draw using natural coordinates
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        // High quality rendering
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        this.ctx.imageSmoothingEnabled = true;
        this.ctx.imageSmoothingQuality = 'high';
    }

    private strokes: DrawingStroke[] = [];
    private shapes: ShapeAnnotation[] = [];

    setDrawingLayer(strokes: DrawingStroke[], shapes: ShapeAnnotation[]) {
        this.strokes = strokes;
        this.shapes = shapes;
        this.redraw();
    }

    addStroke(stroke: DrawingStroke) {
        this.strokes.push(stroke);
    }

    addShape(shape: ShapeAnnotation) {
        this.shapes.push(shape);
    }

    redraw() {
        this.clear();
        this.replayStrokes(this.strokes);
        this.replayShapes(this.shapes);
    }

    setNaturalSize(size: { width: number; height: number }) {
        this.naturalSize = size;
        this.setupCanvas();
        this.redraw();
    }

    setBrushSettings(settings: Partial<BrushSettings>) {
        this.currentBrush = { ...this.currentBrush, ...settings };
    }

    getBrushSettings(): BrushSettings {
        return { ...this.currentBrush };
    }

    setShapeSettings(settings: Partial<ShapeSettings>) {
        this.currentShapeSettings = { ...this.currentShapeSettings, ...settings };
    }

    setStrokeCompleteCallback(callback: (stroke: DrawingStroke) => void) {
        this.onStrokeComplete = callback;
    }

    setShapeCompleteCallback(callback: (shape: ShapeAnnotation) => void) {
        this.onShapeComplete = callback;
    }

    startStroke(x: number, y: number, pressure = 1) {
        this.isDrawing = true;
        this.currentStroke = [{ x, y, pressure }];
        this.ctx.beginPath();
        this.ctx.moveTo(x, y);
        this.applyBrushSettings();
    }

    continueStroke(x: number, y: number, pressure = 1) {
        if (!this.isDrawing) return;
        this.currentStroke.push({ x, y, pressure });

        switch (this.currentBrush.type) {
            case 'pencil':
                this.drawPencil(x, y);
                break;
            case 'marker':
                this.drawMarker(x, y);
                break;
            case 'spray':
                this.drawSpray(x, y);
                break;
            case 'eraser':
                this.drawEraser(x, y);
                break;
        }
    }

    endStroke() {
        if (!this.isDrawing) return;
        this.isDrawing = false;
        this.ctx.closePath();

        if (this.currentStroke.length > 1 && this.onStrokeComplete) {
            this.onStrokeComplete({
                id: `stroke_${Date.now()}`,
                points: [...this.currentStroke],
                brush: { ...this.currentBrush },
                timestamp: Date.now(),
            });
        }
        this.currentStroke = [];
    }

    private applyBrushSettings() {
        this.ctx.globalAlpha = this.currentBrush.opacity;

        switch (this.currentBrush.type) {
            case 'pencil':
                this.ctx.globalCompositeOperation = 'source-over';
                this.ctx.strokeStyle = this.currentBrush.color;
                this.ctx.lineWidth = this.currentBrush.size;
                break;
            case 'marker':
                this.ctx.globalCompositeOperation = 'multiply';
                this.ctx.strokeStyle = this.currentBrush.color;
                this.ctx.lineWidth = this.currentBrush.size * 2;
                break;
            case 'spray':
                this.ctx.globalCompositeOperation = 'source-over';
                break;
            case 'eraser':
                this.ctx.globalCompositeOperation = 'destination-out';
                this.ctx.lineWidth = this.currentBrush.size * 3;
                break;
        }
    }

    private drawPencil(x: number, y: number) {
        this.ctx.lineTo(x, y);
        this.ctx.stroke();
    }

    private drawMarker(x: number, y: number) {
        this.ctx.lineTo(x, y);
        this.ctx.stroke();
    }

    private drawSpray(x: number, y: number) {
        const density = this.currentBrush.size * 2;
        const radius = this.currentBrush.size * 3;

        for (let i = 0; i < density; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = Math.random() * radius;
            const px = x + Math.cos(angle) * dist;
            const py = y + Math.sin(angle) * dist;

            this.ctx.fillStyle = this.currentBrush.color;
            this.ctx.globalAlpha = this.currentBrush.opacity * Math.random() * 0.5;
            this.ctx.fillRect(px, py, 1, 1);
        }
        this.ctx.globalAlpha = this.currentBrush.opacity;
    }

    private drawEraser(x: number, y: number) {
        this.ctx.lineTo(x, y);
        this.ctx.stroke();
    }

    // Shape Drawing Methods
    startShape(x: number, y: number) {
        this.currentShape = {
            id: `shape_${Date.now()}`,
            type: this.currentShapeSettings.type,
            startX: x,
            startY: y,
            endX: x,
            endY: y,
            settings: { ...this.currentShapeSettings },
            timestamp: Date.now(),
        };
    }

    updateShape(x: number, y: number) {
        if (!this.currentShape) return;
        this.currentShape.endX = x;
        this.currentShape.endY = y;
        this.redrawShape(this.currentShape, true);
    }

    endShape() {
        if (!this.currentShape) return;
        this.redrawShape(this.currentShape, false);
        if (this.onShapeComplete) {
            this.onShapeComplete(this.currentShape);
        }
        this.currentShape = null;
    }

    private redrawShape(shape: ShapeAnnotation, isPreview: boolean) {
        this.ctx.save();
        this.ctx.strokeStyle = shape.settings.strokeColor;
        this.ctx.fillStyle = shape.settings.fillColor;
        this.ctx.lineWidth = shape.settings.strokeWidth;
        this.ctx.globalAlpha = isPreview ? 0.7 : 1;

        switch (shape.type) {
            case 'rectangle':
                this.drawRectangle(shape);
                break;
            case 'circle':
                this.drawCircle(shape);
                break;
            case 'arrow':
                this.drawArrow(shape);
                break;
            case 'line':
                this.drawLine(shape);
                break;
        }

        this.ctx.restore();
    }

    private drawRectangle(shape: ShapeAnnotation) {
        const x = Math.min(shape.startX, shape.endX);
        const y = Math.min(shape.startY, shape.endY);
        const w = Math.abs(shape.endX - shape.startX);
        const h = Math.abs(shape.endY - shape.startY);

        this.ctx.beginPath();
        this.ctx.rect(x, y, w, h);

        if (shape.settings.fillColor !== 'transparent') {
            this.ctx.globalAlpha = shape.settings.fillOpacity;
            this.ctx.fill();
            this.ctx.globalAlpha = 1;
        }
        this.ctx.stroke();
    }

    private drawCircle(shape: ShapeAnnotation) {
        const centerX = (shape.startX + shape.endX) / 2;
        const centerY = (shape.startY + shape.endY) / 2;
        const radiusX = Math.abs(shape.endX - shape.startX) / 2;
        const radiusY = Math.abs(shape.endY - shape.startY) / 2;
        const radius = Math.max(radiusX, radiusY);

        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);

        if (shape.settings.fillColor !== 'transparent') {
            this.ctx.globalAlpha = shape.settings.fillOpacity;
            this.ctx.fill();
            this.ctx.globalAlpha = 1;
        }
        this.ctx.stroke();
    }

    private drawArrow(shape: ShapeAnnotation) {
        const headLength = 15;
        const angle = Math.atan2(shape.endY - shape.startY, shape.endX - shape.startX);

        this.ctx.beginPath();
        this.ctx.moveTo(shape.startX, shape.startY);
        this.ctx.lineTo(shape.endX, shape.endY);
        this.ctx.stroke();

        // Arrow head
        this.ctx.beginPath();
        this.ctx.moveTo(shape.endX, shape.endY);
        this.ctx.lineTo(
            shape.endX - headLength * Math.cos(angle - Math.PI / 6),
            shape.endY - headLength * Math.sin(angle - Math.PI / 6)
        );
        this.ctx.moveTo(shape.endX, shape.endY);
        this.ctx.lineTo(
            shape.endX - headLength * Math.cos(angle + Math.PI / 6),
            shape.endY - headLength * Math.sin(angle + Math.PI / 6)
        );
        this.ctx.stroke();
    }

    private drawLine(shape: ShapeAnnotation) {
        this.ctx.beginPath();
        this.ctx.moveTo(shape.startX, shape.startY);
        this.ctx.lineTo(shape.endX, shape.endY);
        this.ctx.stroke();
    }

    // Text Drawing
    drawText(x: number, y: number, text: string, settings: TextSettings) {
        this.ctx.save();
        this.ctx.font = `${settings.isBold ? 'bold ' : ''}${settings.isItalic ? 'italic ' : ''}${settings.fontSize}px ${settings.fontFamily}`;
        this.ctx.fillStyle = settings.color;
        this.ctx.textBaseline = 'top';

        // Background
        if (settings.backgroundColor) {
            const metrics = this.ctx.measureText(text);
            this.ctx.fillStyle = settings.backgroundColor;
            this.ctx.fillRect(x - 2, y - 2, metrics.width + 4, settings.fontSize + 4);
        }

        this.ctx.fillStyle = settings.color;
        this.ctx.fillText(text, x, y);
        this.ctx.restore();
    }

    // Replay strokes for redraw
    replayStrokes(strokes: DrawingStroke[]) {
        this.ctx.save();
        strokes.forEach(stroke => {
            if (stroke.points.length < 2) return;

            this.currentBrush = stroke.brush;
            this.applyBrushSettings();

            this.ctx.beginPath();
            this.ctx.moveTo(stroke.points[0].x, stroke.points[0].y);

            for (let i = 1; i < stroke.points.length; i++) {
                this.ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
            }

            this.ctx.stroke();
        });
        this.ctx.restore();
    }

    replayShapes(shapes: ShapeAnnotation[]) {
        this.ctx.save();
        shapes.forEach(shape => {
            this.redrawShape(shape, false);
        });
        this.ctx.restore();
    }

    // Clear canvas
    clear() {
        this.ctx.clearRect(0, 0, this.naturalSize.width, this.naturalSize.height);
    }

    // Export canvas content
    exportToDataURL(): string {
        return this.canvas.toDataURL('image/png');
    }

    // Resize canvas
    resize() {
        this.setupCanvas();
    }

    // Free canvas memory
    destroy() {
        if (this.canvas) {
            this.canvas.width = 0;
            this.canvas.height = 0;
        }
        this.strokes = [];
        this.shapes = [];
    }
}

// Utility function to create a drawing layer
export function createDrawingLayer(id: string, name: string): DrawingLayer {
    return {
        id,
        name,
        visible: true,
        opacity: 1,
        strokes: [],
        shapes: [],
        texts: [],
    };
}
