import React, { useState, useEffect, useRef } from "react";
import Modal from "../common/Modal.tsx";
import { Album, Photographer } from "../../types.ts";
import Spinner from "../common/Spinner.tsx";
import { logger } from '@/utils/logger';
import {
  createThumbnail,
  createSafeObjectURL,
  revokeBlob,
} from "../../utils/imageUtils.ts";

interface ImportAlbumModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (
    albumData: Omit<Album, "id" | "photos" | "coverPhotoUrl">,
    photoFiles: File[],
  ) => Promise<void> | void;
  photographers: Photographer[];
  sessionTypes?: string[]; // Optional: from DB session_types settings
}

const ImportAlbumModal: React.FC<ImportAlbumModalProps> = ({
  isOpen,
  onClose,
  onImport,
  photographers,
  sessionTypes,
}) => {
  const [step, setStep] = useState(1);
  const [selectedPhotographerId, setSelectedPhotographerId] =
    useState<string>("");
  const [sourceName, setSourceName] = useState("");

  const [isProcessingFiles, setIsProcessingFiles] = useState(false);
  const [isImporting, setIsImporting] = useState(false); // Fix: keep modal open during import
  const [processingMessage, setProcessingMessage] = useState(
    "Processing photos...",
  );

  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<
    { id: string; url: string; name: string }[]
  >([]);

  const [selectedPhotoIds, setSelectedPhotoIds] = useState<Set<string>>(
    new Set(),
  );

  // State for Step 4
  const [albumTitle, setAlbumTitle] = useState("");
  const [roomNumber, setRoomNumber] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [selectedCategory, setSelectedCategory] =
    useState<string>("Photo Session");

  // Inline validation errors (replaces alert())
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});

  const fileInputRef = useRef<HTMLInputElement>(null);
  const blobUrlsRef = useRef<Set<string>>(new Set());

  const consistentInputStyle =
    "w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all";
  const errorStyle = "mt-1 text-xs text-red-500 font-medium";

  // Available categories from DB settings or defaults
  const availableCategories =
    sessionTypes && sessionTypes.length > 0
      ? sessionTypes
      : ["Photo Session", "Family Portrait", "Wedding", "Event", "Corporate"];

  // Reset form state when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setSourceName("");
      setPhotoFiles([]);
      blobUrlsRef.current.forEach((url) => revokeBlob(url));
      blobUrlsRef.current.clear();
      setPhotoPreviews([]);
      setIsProcessingFiles(false);
      setIsImporting(false);
      setSelectedPhotoIds(new Set());
      setAlbumTitle("");
      setRoomNumber("");
      setCustomerEmail(""); // Fix: removed duplicate call
      setSelectedCategory(availableCategories[0] || "Photo Session");
      setValidationErrors({});
    }
  }, [isOpen]);

  // Handle default photographer selection safely
  useEffect(() => {
    if (
      isOpen &&
      !selectedPhotographerId &&
      photographers &&
      photographers.length > 0
    ) {
      setSelectedPhotographerId(String(photographers[0].id));
    }
  }, [isOpen, photographers, selectedPhotographerId]);

  // Cleanup blob URLs on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      blobUrlsRef.current.forEach((url) => revokeBlob(url));
      blobUrlsRef.current.clear();
    };
  }, []);

  const processFiles = async (files: File[], sourceLabel: string) => {
    setIsProcessingFiles(true);
    setSourceName(sourceLabel);
    setProcessingMessage("Initializing session...");
    setPhotoFiles(files);

    const initialPreviews = files.map((file) => ({
      id: `${file.name}-${file.lastModified}`,
      url: "",
      name: file.name,
    }));

    setPhotoPreviews(initialPreviews);
    setSelectedPhotoIds(new Set(initialPreviews.map((p) => p.id)));
    setIsProcessingFiles(false);
    setStep(3);

    // Generate thumbnails in background batches
    const batchSize = 6;
    for (let i = 0; i < files.length; i += batchSize) {
      const batch = files.slice(i, i + batchSize);
      const thumbnailPromises = batch.map(async (file, index) => {
        try {
          const thumbUrl = await createThumbnail(file, 400, 400);
          return { id: initialPreviews[i + index].id, url: thumbUrl };
        } catch (e) {
          const blobUrl = createSafeObjectURL(file);
          blobUrlsRef.current.add(blobUrl);
          return { id: initialPreviews[i + index].id, url: blobUrl };
        }
      });

      const results = await Promise.all(thumbnailPromises);
      setPhotoPreviews((prev) => {
        const next = [...prev];
        results.forEach((res) => {
          const idx = next.findIndex((p) => p.id === res.id);
          if (idx !== -1) next[idx] = { ...next[idx], url: res.url };
        });
        return next;
      });

      await new Promise((r) => setTimeout(r, 0));
    }
  };

  const handleFolderSelectionChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    if (!event.target.files || event.target.files.length === 0) return;
    const fileList = event.target.files as FileList;
    const files = Array.from(fileList).filter((f) =>
      f.type.startsWith("image/"),
    );
    if (files.length === 0) {
      // Fix: inline error instead of alert()
      setValidationErrors({
        folder: "No image files found in the selected folder.",
      });
      return;
    }
    setValidationErrors({});
    const firstFile = files[0];
    const rootPath =
      (firstFile as any).webkitRelativePath?.split("/")[0] || "Device Folder";
    await processFiles(files, rootPath);
    if (event.target) event.target.value = "";
  };

  useEffect(() => {
    return () => {
      photoPreviews.forEach((p) => revokeBlob(p.url));
    };
  }, [photoPreviews]);

  const handleToggleSelection = (photoId: string) => {
    setSelectedPhotoIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(photoId)) newSet.delete(photoId);
      else newSet.add(photoId);
      return newSet;
    });
  };

  const handleFinalImport = async () => {
    // Inline validation (Fix: replaces alert())
    const errors: Record<string, string> = {};
    if (!albumTitle.trim()) errors.albumTitle = "Album title is required.";
    if (!selectedPhotographerId)
      errors.photographer = "Please select a photographer.";
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!customerEmail || !emailRegex.test(customerEmail)) {
      errors.customerEmail =
        "A valid customer email is required for gallery access.";
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }
    setValidationErrors({});

    const selectedFiles = photoFiles.filter((_, index) =>
      selectedPhotoIds.has(photoPreviews[index]?.id),
    );

    const albumData: Omit<Album, "id" | "photos" | "coverPhotoUrl"> = {
      title: albumTitle,
      date: new Date().toISOString().split("T")[0],
      photographerId: selectedPhotographerId,
      source: sourceName,
      roomNumber: roomNumber,
      customerEmail: customerEmail,
      categories: [selectedCategory],
    };

    logger.info("[ImportAlbumModal] Album data being sent", { data: albumData });
    logger.info("[ImportAlbumModal] Selected files count", { count: selectedFiles.length });
    logger.info("[ImportAlbumModal] Photographer ID type", { type: typeof selectedPhotographerId, id: selectedPhotographerId });

    // Fix: show loading state and keep modal open until import resolves
    setIsImporting(true);
    try {
      await onImport(albumData, selectedFiles);
      onClose();
    } catch (e) {
      logger.error("[ImportAlbumModal] Import error:", { error: e });
      setValidationErrors({ submit: "Import failed — please try again." });
    } finally {
      setIsImporting(false);
    }
  };

  const selectedPhotographer = photographers.find(
    (p) => String(p.id) === selectedPhotographerId,
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={isImporting ? () => {} : onClose}
      title="Import New Album"
      size="xl"
    >
      <div className="mb-8 px-4">
        <div className="flex items-center justify-between relative">
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-slate-200 dark:bg-slate-700 -z-10"></div>
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm border-4 transition-colors ${step >= s ? "bg-blue-600 border-blue-600 text-white" : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400"}`}
            >
              {step > s ? "✓" : s}
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-2 text-xs font-medium text-slate-500 dark:text-slate-400">
          <span>Photographer</span>
          <span>Source</span>
          <span>Selection</span>
          <span>Details</span>
        </div>
      </div>

      {step === 1 && (
        <div className="animate-fadeIn">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
              Who is shooting?
            </h2>
            <p className="text-slate-500 dark:text-slate-400">
              Select the photographer for this session to track stats and
              payroll.
            </p>
          </div>

          <div className="max-w-md mx-auto space-y-6">
            <div>
              <label
                htmlFor="select-photographer"
                className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2"
              >
                Select Photographer
              </label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none z-20">
                  {selectedPhotographer ? (
                    <img
                      src={selectedPhotographer.avatarUrl}
                      className="w-10 h-10 rounded-full object-cover ring-2 ring-white dark:ring-slate-700"
                      alt=""
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-6 w-6 text-slate-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                        />
                      </svg>
                    </div>
                  )}
                </div>

                <select
                  id="select-photographer"
                  value={selectedPhotographerId}
                  onChange={(e) => setSelectedPhotographerId(e.target.value)}
                  className="w-full pl-16 pr-10 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-2xl text-lg text-slate-900 dark:text-white focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 outline-none appearance-none font-bold cursor-pointer transition-all hover:border-blue-400 dark:hover:border-blue-500 z-10 relative"
                  required
                >
                  {!selectedPhotographerId && (
                    <option value="">Select a photographer...</option>
                  )}
                  {photographers.length === 0 && (
                    <option value="" disabled>
                      No photographers found
                    </option>
                  )}
                  {photographers.map((p) => (
                    <option key={p.id} value={String(p.id)}>
                      {p.name}
                    </option>
                  ))}
                </select>

                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-hover:text-blue-500 transition-colors z-20">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-8 flex justify-end space-x-3 border-t border-slate-200 dark:border-slate-700 mt-8">
            <button
              onClick={onClose}
              className="px-6 py-3 rounded-xl font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => setStep(2)}
              disabled={!selectedPhotographerId}
              className="px-8 py-3 rounded-xl font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/30 disabled:opacity-50 disabled:shadow-none transition-all transform active:scale-95 hover:-translate-y-0.5"
            >
              Next Step
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="animate-fadeIn">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
              Where are the photos?
            </h2>
            <p className="text-slate-500 dark:text-slate-400">
              Choose the source drive or folder to import from.
            </p>
          </div>

          {validationErrors.folder && (
            <p className="text-center text-red-500 text-sm font-medium mb-4">
              {validationErrors.folder}
            </p>
          )}

          {isProcessingFiles ? (
            <div className="flex flex-col items-center justify-center h-64">
              <Spinner />
              <p className="mt-6 font-medium text-slate-600 dark:text-slate-300 animate-pulse">
                {processingMessage}
              </p>
            </div>
          ) : (
            <>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFolderSelectionChange}
                className="hidden"
                {...{ webkitdirectory: "true", directory: "true" }}
              />
              <div className="flex justify-center w-full">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="group w-full max-w-md flex flex-col items-center justify-center p-10 border-2 border-dashed border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20 rounded-2xl hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-all hover:scale-[1.02]"
                >
                  <div className="p-4 bg-white dark:bg-slate-800 rounded-full shadow-sm mb-4 group-hover:scale-110 transition-transform">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-10 w-10 text-blue-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                      />
                    </svg>
                  </div>
                  <span className="text-xl font-bold text-slate-800 dark:text-white mb-1">
                    Local Device / USB
                  </span>
                  <span className="text-sm text-slate-500 dark:text-slate-400">
                    Import from SD Card or Hard Drive
                  </span>
                </button>
              </div>
            </>
          )}
          <div className="pt-8 flex justify-between space-x-3 border-t border-slate-200 dark:border-slate-700 mt-8">
            <button
              onClick={() => setStep(1)}
              className="px-6 py-3 rounded-xl font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
            >
              Back
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="animate-fadeIn flex flex-col h-full">
          <div className="flex justify-between items-end mb-4">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                Review Selection
              </h2>
              <p className="text-slate-500 dark:text-slate-400 text-sm">
                {photoPreviews.length} photos found in{" "}
                <span className="font-mono font-bold">{sourceName}</span>.
              </p>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() =>
                  setSelectedPhotoIds(new Set(photoPreviews.map((p) => p.id)))
                }
                className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 rounded text-slate-600 dark:text-slate-300 transition-colors"
              >
                Select All
              </button>
              <button
                onClick={() => setSelectedPhotoIds(new Set())}
                className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 rounded text-slate-600 dark:text-slate-300 transition-colors"
              >
                Deselect All
              </button>
            </div>
          </div>

          <div className="grid grid-cols-4 md:grid-cols-6 gap-3 mb-6 overflow-y-auto pr-2 max-h-[400px] content-start">
            {photoPreviews.map((photo) => (
              <div
                key={photo.id}
                className="relative group aspect-square cursor-pointer"
                onClick={() => handleToggleSelection(photo.id)}
              >
                {photo.url ? (
                  <img
                    src={photo.url}
                    alt="preview"
                    className={`w-full h-full object-cover rounded-lg shadow-sm transition-all ${selectedPhotoIds.has(photo.id) ? "brightness-100" : "brightness-75 group-hover:brightness-100"}`}
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                    <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-2"></div>
                    <span className="text-[10px] text-slate-400 text-center px-1 truncate w-full">
                      {photo.name}
                    </span>
                  </div>
                )}
                <div
                  className={`absolute inset-0 rounded-lg border-2 transition-all ${selectedPhotoIds.has(photo.id) ? "border-blue-500 bg-blue-500/20" : "border-transparent group-hover:bg-white/10"}`}
                >
                  {selectedPhotoIds.has(photo.id) && (
                    <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center shadow-sm">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-3 w-3"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="pt-6 flex justify-between space-x-3 border-t border-slate-200 dark:border-slate-700 mt-auto">
            <button
              onClick={() => setStep(2)}
              className="px-6 py-3 rounded-xl font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
            >
              Back
            </button>
            <button
              onClick={() => setStep(4)}
              disabled={selectedPhotoIds.size === 0}
              className="px-8 py-3 rounded-xl font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/20 disabled:opacity-50 disabled:shadow-none transition-all transform active:scale-95 flex items-center"
            >
              <span>Next Step</span>
              <span className="ml-2 bg-blue-700 px-2 py-0.5 rounded text-xs">
                {selectedPhotoIds.size}
              </span>
            </button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="animate-fadeIn">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
              Final Details
            </h2>
            <p className="text-slate-500 dark:text-slate-400">
              Enter session metadata to organize this album.
            </p>
          </div>

          <div className="max-w-md mx-auto space-y-5">
            <div>
              <label
                htmlFor="album-title"
                className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2"
              >
                Album Title
              </label>
              <input
                id="album-title"
                type="text"
                value={albumTitle}
                onChange={(e) => {
                  setAlbumTitle(e.target.value);
                  setValidationErrors((prev) => ({ ...prev, albumTitle: "" }));
                }}
                className={`${consistentInputStyle} ${validationErrors.albumTitle ? "border-red-400 focus:ring-red-500" : ""}`}
                placeholder="e.g. Smith Family Sunset"
                autoComplete="off"
              />
              {validationErrors.albumTitle && (
                <p className={errorStyle}>{validationErrors.albumTitle}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="room-number"
                className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-2"
              >
                Room Number / Client ID
              </label>
              <input
                id="room-number"
                type="text"
                value={roomNumber}
                onChange={(e) => {
                  setRoomNumber(e.target.value);
                  setValidationErrors((prev) => ({ ...prev, roomNumber: "" }));
                }}
                className={`${consistentInputStyle} ${validationErrors.roomNumber ? "border-red-400 focus:ring-red-500" : ""}`}
                placeholder="e.g. 101"
                autoComplete="off"
              />
              {validationErrors.roomNumber && (
                <p className={errorStyle}>{validationErrors.roomNumber}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="customer-email"
                className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-2"
              >
                Customer Email <span className="text-red-500 font-bold">*</span>
                <span className="text-slate-400 text-[10px] ml-2 font-normal">
                  (Required for Gallery Access)
                </span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 text-slate-400"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                    <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                  </svg>
                </div>
                <input
                  id="customer-email"
                  type="email"
                  value={customerEmail}
                  onChange={(e) => {
                    setCustomerEmail(e.target.value);
                    setValidationErrors((prev) => ({
                      ...prev,
                      customerEmail: "",
                    }));
                  }}
                  className={`${consistentInputStyle} pl-10 ${validationErrors.customerEmail ? "border-red-400 focus:ring-red-500" : ""}`}
                  placeholder="email@example.com"
                  autoComplete="email"
                />
              </div>
              {validationErrors.customerEmail && (
                <p className={errorStyle}>{validationErrors.customerEmail}</p>
              )}
            </div>

            {/* Session Type — wired to DB session_types (Fix: was hardcoded) */}
            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">
                Session Type
              </label>
              <div className="flex flex-wrap gap-2">
                {availableCategories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                      selectedCategory === cat
                        ? "bg-blue-600 border-blue-600 text-white shadow-sm"
                        : "bg-slate-100 dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-blue-400"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {validationErrors.submit && (
              <p className="text-center text-red-500 text-sm font-medium">
                {validationErrors.submit}
              </p>
            )}
          </div>

          <div className="pt-8 flex justify-between space-x-3 border-t border-slate-200 dark:border-slate-700 mt-8">
            <button
              onClick={() => setStep(3)}
              disabled={isImporting}
              className="px-6 py-3 rounded-xl font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
            >
              Back
            </button>
            <button
              onClick={handleFinalImport}
              disabled={
                isImporting || !albumTitle.trim() || !customerEmail.trim()
              }
              className="px-8 py-3 rounded-xl font-bold bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-600/20 disabled:opacity-50 disabled:shadow-none transition-all transform active:scale-95 flex items-center gap-2"
            >
              {isImporting ? (
                <>
                  <Spinner />
                  <span>Importing...</span>
                </>
              ) : (
                <span>Complete Import</span>
              )}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
};

export default ImportAlbumModal;
