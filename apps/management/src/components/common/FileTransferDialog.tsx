import React, { useState, useEffect, useRef } from "react";

interface FileTransferDialogProps {
  isOpen: boolean;
  onClose?: () => void;
  onPause?: () => void;
  onCancel?: () => void;
  sourceFolder?: string;
  destinationFolder?: string;
  totalItems?: number;
  progress?: number;
  currentFileName?: string;
  speed?: number;
  timeRemaining?: string;
  itemsRemaining?: number;
  bytesRemaining?: number;
  isPaused?: boolean;
}

const FileTransferDialog: React.FC<FileTransferDialogProps> = ({
  isOpen,
  onClose,
  onPause,
  onCancel,
  sourceFolder = "Screenshots",
  destinationFolder = "New folder",
  totalItems = 145,
  progress = 98,
  currentFileName = "Screenshot 2025-03-27 124204",
  speed = 26.0,
  timeRemaining = "Calculating...",
  itemsRemaining = 0,
  bytesRemaining = 0,
  isPaused = false,
}) => {
  const [showDetails, setShowDetails] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | undefined>(undefined);

  // Generate speed graph data
  useEffect(() => {
    if (!isOpen || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const dataPoints: number[] = [];
    let frameCount = 0;

    // Generate initial data points with some variation
    for (let i = 0; i < width; i++) {
      const baseSpeed = 20 + Math.random() * 10;
      dataPoints.push(baseSpeed);
    }

    const drawGraph = () => {
      if (!ctx) return;

      // Clear canvas
      ctx.clearRect(0, 0, width, height);

      // Draw light green background
      ctx.fillStyle = "#e8f5e9";
      ctx.fillRect(0, 0, width, height);

      // Draw horizontal line in the middle
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.stroke();

      // Update data points (shift left and add new point)
      dataPoints.shift();
      const newSpeed = 20 + Math.random() * 10 + Math.sin(frameCount * 0.1) * 3;
      dataPoints.push(newSpeed);

      // Draw the speed graph (filled area above the center line)
      ctx.fillStyle = "#2e7d32";
      ctx.beginPath();
      ctx.moveTo(0, height / 2);

      for (let i = 0; i < dataPoints.length; i++) {
        const x = i;
        // Map speed (0-40 MB/s) to y position
        // Show speed as distance from center line (all positive, above the line)
        const normalizedSpeed = Math.max(0, Math.min(40, dataPoints[i]));
        // Map 0-40 MB/s to 0 to height/2 (above center line)
        const y = height / 2 - (normalizedSpeed / 40) * (height / 2);
        ctx.lineTo(x, y);
      }

      ctx.lineTo(width, height / 2);
      ctx.closePath();
      ctx.fill();

      frameCount++;
      animationFrameRef.current = requestAnimationFrame(drawGraph);
    };

    drawGraph();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 bytes";
    const k = 1024;
    const sizes = ["bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
      <div
        className="bg-white rounded-sm shadow-2xl w-[600px] overflow-hidden"
        style={{ fontFamily: "Segoe UI, system-ui, sans-serif" }}
      >
        {/* Title Bar */}
        <div className="bg-gray-100 border-b border-gray-300 px-4 py-2 flex items-center justify-between">
          <div className="text-sm font-medium text-gray-900">
            {progress}% complete
          </div>
          <div className="flex gap-1">
            <button className="w-6 h-6 flex items-center justify-center hover:bg-gray-200 rounded">
              <span className="text-xs">−</span>
            </button>
            <button className="w-6 h-6 flex items-center justify-center hover:bg-gray-200 rounded">
              <span className="text-xs">□</span>
            </button>
            <button
              onClick={onClose || onCancel}
              className="w-6 h-6 flex items-center justify-center hover:bg-red-500 hover:text-white rounded"
            >
              <span className="text-xs">×</span>
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="p-4 space-y-4">
          {/* Copying text with clickable folders */}
          <div className="text-sm">
            <span>Copying {totalItems} items from </span>
            <button className="text-blue-600 hover:underline">
              {sourceFolder}
            </button>
            <span> to </span>
            <button className="text-blue-600 hover:underline">
              {destinationFolder}
            </button>
          </div>

          {/* Progress percentage */}
          <div className="text-sm font-medium">{progress}% complete</div>

          {/* Speed Graph */}
          <div className="relative">
            <canvas
              ref={canvasRef}
              width={560}
              height={120}
              className="w-full border border-gray-300 rounded"
            />
            <div className="absolute top-2 right-2 text-xs font-medium">
              Speed: {speed.toFixed(1)} MB/s
            </div>
            {/* Pause and Cancel buttons */}
            <div className="absolute top-2 right-24 flex gap-2">
              <button
                onClick={onPause}
                className="w-6 h-6 flex items-center justify-center hover:bg-gray-200 rounded border border-gray-300"
                title={isPaused ? "Resume" : "Pause"}
              >
                {isPaused ? (
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 10 10"
                    fill="currentColor"
                  >
                    <path d="M2 1l6 4-6 4V1z" />
                  </svg>
                ) : (
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 10 10"
                    fill="currentColor"
                  >
                    <path d="M2 2h2v6H2V2zm4 0h2v6H6V2z" />
                  </svg>
                )}
              </button>
              <button
                onClick={onCancel}
                className="w-6 h-6 flex items-center justify-center hover:bg-red-500 hover:text-white rounded border border-gray-300"
                title="Cancel"
              >
                <span className="text-xs font-bold">×</span>
              </button>
            </div>
          </div>

          {/* Details Section */}
          {showDetails && (
            <div className="space-y-1 text-sm text-gray-700">
              <div>
                <span className="font-medium">Name: </span>
                <span>{currentFileName}</span>
              </div>
              <div>
                <span className="font-medium">Time remaining: </span>
                <span>{timeRemaining}</span>
              </div>
              <div>
                <span className="font-medium">Items remaining: </span>
                <span>
                  {itemsRemaining} (
                  {bytesRemaining > 0 ? formatBytes(bytesRemaining) : "0 bytes"}
                  )
                </span>
              </div>
            </div>
          )}

          {/* Fewer details button */}
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-sm text-blue-600 hover:underline flex items-center gap-1"
          >
            {showDetails ? (
              <>
                <span>Fewer details</span>
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 12 12"
                  fill="currentColor"
                  className="text-blue-600"
                >
                  <path d="M6 8L2 4h8L6 8z" />
                </svg>
              </>
            ) : (
              <>
                <span>More details</span>
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 12 12"
                  fill="currentColor"
                  className="text-blue-600"
                >
                  <path d="M6 4l4 4H2l4-4z" />
                </svg>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FileTransferDialog;
