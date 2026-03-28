import React, { useEffect, useRef, useCallback } from 'react';

interface LoupeToolProps {
  imageElement: HTMLImageElement | null;
  mouseX: number;
  mouseY: number;
  zoomLevel?: number;
  size?: number;
}

export const LoupeTool: React.FC<LoupeToolProps> = ({
  imageElement,
  mouseX,
  mouseY,
  zoomLevel = 2,
  size = 150,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const drawMagnifiedView = useCallback(() => {
    if (!canvasRef.current || !imageElement) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = size;
    canvas.height = size;

    // Calculate the position on the original image
    const rect = imageElement.getBoundingClientRect();
    const scaleX = imageElement.naturalWidth / rect.width;
    const scaleY = imageElement.naturalHeight / rect.height;

    // Mouse position relative to image
    const imgX = (mouseX - rect.left) * scaleX;
    const imgY = (mouseY - rect.top) * scaleY;

    // Source rectangle (what we're magnifying)
    const sourceSize = size / zoomLevel;
    const sourceX = imgX - sourceSize / 2;
    const sourceY = imgY - sourceSize / 2;

    // Clear canvas
    ctx.clearRect(0, 0, size, size);

    // Create circular clip
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2 - 2, 0, Math.PI * 2);
    ctx.clip();

    // Draw the magnified portion
    try {
      ctx.drawImage(
        imageElement,
        Math.max(0, sourceX),
        Math.max(0, sourceY),
        Math.min(sourceSize, imageElement.naturalWidth - sourceX),
        Math.min(sourceSize, imageElement.naturalHeight - sourceY),
        0,
        0,
        size,
        size
      );
    } catch (e) {
      // Handle edge cases where source is outside image bounds
    }

    // Draw crosshair
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(size / 2, 0);
    ctx.lineTo(size / 2, size);
    ctx.moveTo(0, size / 2);
    ctx.lineTo(size, size / 2);
    ctx.stroke();

    // Draw border
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2 - 1, 0, Math.PI * 2);
    ctx.stroke();
  }, [imageElement, mouseX, mouseY, zoomLevel, size]);

  useEffect(() => {
    drawMagnifiedView();
  }, [drawMagnifiedView]);

  // Position the loupe near the cursor but keep it on screen
  const getPosition = () => {
    const offset = 20;
    let left = mouseX + offset;
    let top = mouseY + offset;

    // Keep within viewport
    if (typeof window !== 'undefined') {
      if (left + size > window.innerWidth) {
        left = mouseX - size - offset;
      }
      if (top + size > window.innerHeight) {
        top = mouseY - size - offset;
      }
    }

    return { left, top };
  };

  const position = getPosition();

  return (
    <div
      className="fixed pointer-events-none z-50 rounded-full shadow-2xl border-2 border-white/50"
      style={{
        left: position.left,
        top: position.top,
        width: size,
        height: size,
        background: 'rgba(0, 0, 0, 0.1)',
      }}
    >
      <canvas
        ref={canvasRef}
        className="rounded-full"
        style={{ width: size, height: size }}
      />
      <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs text-white bg-black/70 px-2 py-0.5 rounded whitespace-nowrap">
        {zoomLevel}x
      </div>
    </div>
  );
};

export default LoupeTool;
