import { useState } from "react";
import { logger } from "../../../utils/logger";
import { faceRecognitionService, FaceSearchResult } from "../../../services/faceRecognitionService";

interface UseFaceRecognitionHandlerProps {
  showToast: (message: string) => void;
  onBrowsePhotos: (roomNumber?: string) => void;
}

export const useFaceRecognitionHandler = ({
  showToast,
  onBrowsePhotos,
}: UseFaceRecognitionHandlerProps) => {
  // Face Login State
  const [isFaceLoginOpen, setIsFaceLoginOpen] = useState(false);

  // Face Search State
  const [isFaceSearchOpen, setIsFaceSearchOpen] = useState(false);
  const [faceSearchLoading, setFaceSearchLoading] = useState(false);

  const handleFaceLogin = async (blob: Blob) => {
    setIsFaceLoginOpen(false);
    showToast("Processing biometrics...");

    try {
      // Validate blob before processing
      if (!blob || blob.size === 0) {
        showToast("Invalid image captured. Please try again.");
        return;
      }

      // Check if face is detected first
      const faceDetected = await faceRecognitionService.detectFace(blob);
      if (!faceDetected) {
        showToast(
          "No face detected. Please ensure your face is clearly visible in the frame."
        );
        return;
      }

      // Identify user
      const user = await faceRecognitionService.identifyUser(blob);
      if (user) {
        showToast(`Welcome back, ${user.name}!`);
        setTimeout(() => {
          onBrowsePhotos(user.roomNumber);
        }, 500);
      } else {
        showToast(
          "Face not recognized. Please try again or use your Room Number."
        );
      }
    } catch (e) {
      logger.error(
        "Error occurred during face login",
        e instanceof Error ? e : undefined
      );
      const errorMessage = e instanceof Error ? e.message : String(e);
      if (errorMessage.includes("timeout") || errorMessage.includes("time")) {
        showToast("Face recognition timed out. Please try again.");
      } else {
        showToast(
          "Error occurred during face login. Please try again or use your Room Number."
        );
      }
    }
  };

  /**
   * Handle Face Search - Complete flow:
   * 1. Customer scans face
   * 2. Search for matching faces in photos
   * 3. Get room number from matched photo
   * 4. Show all photos from that room
   */
  const handleFaceSearch = async (blob: Blob) => {
    setIsFaceSearchOpen(false);
    setFaceSearchLoading(true);

    try {
      // Validate blob
      if (!blob || blob.size === 0) {
        showToast("Invalid image captured. Please try again.");
        setFaceSearchLoading(false);
        return;
      }

      showToast("Scanning your face...");

      // Check if face is detected first
      const faceDetected = await faceRecognitionService.detectFace(blob);
      if (!faceDetected) {
        showToast(
          "No face detected. Please ensure your face is clearly visible in the frame."
        );
        setFaceSearchLoading(false);
        return;
      }

      showToast("Searching for your photos...");

      // Perform the complete face search flow
      const result: FaceSearchResult = await faceRecognitionService.searchByFace(blob);

      if (!result.success) {
        showToast(
          result.message ||
            "Could not find your photos. Please try again or use room number."
        );
        setFaceSearchLoading(false);
        return;
      }

      if (!result.faceFound) {
        showToast("No face detected in photo. Please try again.");
        setFaceSearchLoading(false);
        return;
      }

      if (!result.roomFound || !result.roomNumber) {
        showToast(
          "Face found but could not determine room. Please use room number search."
        );
        setFaceSearchLoading(false);
        return;
      }

      // Success! Show results
      showToast(
        `Found ${result.totalPhotos} photos from Room ${result.roomNumber}!`
      );

      // Navigate to photos with the room number
      setTimeout(() => {
        onBrowsePhotos(result.roomNumber || undefined);
        setFaceSearchLoading(false);
      }, 1000);
    } catch (e) {
      logger.error(
        "Error in face search",
        e instanceof Error ? e : undefined
      );
      showToast(
        "Error during face search. Please try again or use room number."
      );
      setFaceSearchLoading(false);
    }
  };

  return {
    isFaceLoginOpen,
    setIsFaceLoginOpen,
    isFaceSearchOpen,
    setIsFaceSearchOpen,
    faceSearchLoading,
    handleFaceLogin,
    handleFaceSearch,
  };
};
