import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  User,
  HardDrive,
  Camera,
  UploadCloud,
  FileCheck,
  Mail,
  Home,
  Check,
  ArrowRight,
  ArrowLeft,
  Zap,
  Sparkles,
  X,
  Smartphone,
  AlertCircle
} from 'lucide-react';
import { Photographer } from '../../types';

interface AutoPipelineWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  photographers: Photographer[];
  currentPhotographer?: Photographer;
  sessionTypes?: string[];
  onStartPipeline: (config: {
    photographerId: string;
    photographerName: string;
    sourceType: 'sd_card' | 'dslr_tether' | 'folder' | 'files';
    sourceFiles: File[];
    sourceLabel: string;
    customerData: {
      title: string;
      roomNumber: string;
      guestName: string;
      email: string;
      phone: string;
      sessionType: string;
      rfidPass: string;
      autoProcess: boolean;
      autoDispatchKiosks: boolean;
    };
  }) => Promise<void> | void;
}

export const AutoPipelineWizardModal: React.FC<AutoPipelineWizardModalProps> = ({
  isOpen,
  onClose,
  photographers,
  currentPhotographer,
  sessionTypes = ['Beach & Pool', 'Family Portrait', 'Wedding', 'Sunset Session', 'Event', 'Activities'],
  onStartPipeline,
}) => {
  // Wizard Step (1: Photographer -> 2: Source -> 3: Customer & Options)
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1: Photographer Selection
  const [selectedPhotographerId, setSelectedPhotographerId] = useState<string>('');
  const [photographerSearch, setPhotographerSearch] = useState('');

  // Step 2: Source Selection
  const [sourceType, setSourceType] = useState<'sd_card' | 'dslr_tether' | 'folder' | 'files'>('files');
  const [sourceFiles, setSourceFiles] = useState<File[]>([]);
  const [sourceLabel, setSourceLabel] = useState<string>('Uploaded Files');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Step 3: Customer & Session Meta
  const [albumTitle, setAlbumTitle] = useState('');
  const [roomNumber, setRoomNumber] = useState('');
  const [guestName, setGuestName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [sessionType, setSessionType] = useState(sessionTypes[0] || 'Beach & Pool');
  const [rfidPass, setRfidPass] = useState('');
  const [autoProcess, setAutoProcess] = useState(true);
  const [autoDispatchKiosks, setAutoDispatchKiosks] = useState(true);

  // Validation
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Initialize defaults
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setErrors({});
      if (currentPhotographer) {
        setSelectedPhotographerId(currentPhotographer.id);
      } else if (photographers.length > 0) {
        setSelectedPhotographerId(photographers[0].id);
      }
      setAlbumTitle(`Session ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`);
      setSourceFiles([]);
      setSourceLabel('Uploaded Files');
    }
  }, [isOpen, currentPhotographer, photographers]);

  if (!isOpen) return null;

  const filteredPhotographers = photographers.filter((p) =>
    p.name.toLowerCase().includes(photographerSearch.toLowerCase()) ||
    (p.email && p.email.toLowerCase().includes(photographerSearch.toLowerCase()))
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesArray = (Array.from(e.target.files) as File[]).filter(f => f.type.startsWith('image/'));
      setSourceFiles(filesArray);
      setSourceLabel(`${filesArray.length} photos selected`);
      setErrors(prev => ({ ...prev, source: '' }));
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const filesArray = (Array.from(e.dataTransfer.files) as File[]).filter(f => f.type.startsWith('image/'));
      setSourceFiles(filesArray);
      setSourceType('files');
      setSourceLabel(`${filesArray.length} dragged photos`);
      setErrors(prev => ({ ...prev, source: '' }));
    }
  };

  const handleSimulateSDCardScan = () => {
    setSourceType('sd_card');
    setSourceLabel('DCIM / SONY_A7IV (SD Card Ready)');
  };

  const handleSimulateDSLR = () => {
    setSourceType('dslr_tether');
    setSourceLabel('Nikon Z6 II Tethered (PTP Active)');
  };

  const validateStep = (currentStep: number): boolean => {
    const newErrors: Record<string, string> = {};
    if (currentStep === 1) {
      if (!selectedPhotographerId) {
        newErrors.photographer = 'Please select an assigned photographer';
      }
    } else if (currentStep === 2) {
      if (sourceFiles.length === 0 && sourceType !== 'dslr_tether') {
        newErrors.source = 'Please select or drop photo files for ingestion';
      }
    } else if (currentStep === 3) {
      if (!albumTitle.trim()) {
        newErrors.title = 'Session title is required';
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(step)) {
      setStep((prev) => Math.min(3, prev + 1) as 1 | 2 | 3);
    }
  };

  const handleBack = () => {
    setStep((prev) => Math.max(1, prev - 1) as 1 | 2 | 3);
  };

  const handleLaunch = async () => {
    if (!validateStep(3)) return;

    const chosenPhotographer = photographers.find(p => p.id === selectedPhotographerId);
    
    await onStartPipeline({
      photographerId: selectedPhotographerId,
      photographerName: chosenPhotographer?.name || 'Assigned Photographer',
      sourceType,
      sourceFiles,
      sourceLabel,
      customerData: {
        title: albumTitle,
        roomNumber: roomNumber.trim(),
        guestName: guestName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        sessionType,
        rfidPass: rfidPass.trim(),
        autoProcess,
        autoDispatchKiosks,
      },
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 15 }}
        className="w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-slate-100 max-h-[92vh]"
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-md shadow-blue-500/20">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">
                ⚡ Autonomous AI Ingestion Pipeline
              </h2>
              <p className="text-xs text-slate-400">
                Hands-free ingest, grading, AI enhancement, and instant Touch Kiosk sync
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="px-6 py-3 bg-slate-950/40 border-b border-slate-800/80 flex items-center justify-between text-xs font-semibold">
          <div className="flex items-center space-x-2">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
              step >= 1 ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-500'
            }`}>
              {step > 1 ? <Check className="w-3.5 h-3.5" /> : '1'}
            </div>
            <span className={step === 1 ? 'text-blue-400 font-bold' : 'text-slate-400'}>Photographer</span>
          </div>

          <div className="w-8 h-px bg-slate-800" />

          <div className="flex items-center space-x-2">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
              step >= 2 ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-500'
            }`}>
              {step > 2 ? <Check className="w-3.5 h-3.5" /> : '2'}
            </div>
            <span className={step === 2 ? 'text-blue-400 font-bold' : 'text-slate-400'}>Source Selection</span>
          </div>

          <div className="w-8 h-px bg-slate-800" />

          <div className="flex items-center space-x-2">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
              step >= 3 ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-500'
            }`}>
              3
            </div>
            <span className={step === 3 ? 'text-blue-400 font-bold' : 'text-slate-400'}>Customer & Launch</span>
          </div>
        </div>

        {/* Step Content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* STEP 1: Photographer Selection */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Select Assigned Photographer
                </label>
                <input
                  type="text"
                  placeholder="Search photographer by name or email..."
                  value={photographerSearch}
                  onChange={(e) => setPhotographerSearch(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {errors.photographer && (
                <div className="text-xs text-red-400 flex items-center space-x-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{errors.photographer}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[280px] overflow-y-auto pr-1 custom-scrollbar">
                {filteredPhotographers.map((p) => {
                  const isSelected = selectedPhotographerId === p.id;
                  return (
                    <div
                      key={p.id}
                      onClick={() => {
                        setSelectedPhotographerId(p.id);
                        setErrors(prev => ({ ...prev, photographer: '' }));
                      }}
                      className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center space-x-3 ${
                        isSelected
                          ? 'bg-blue-600/20 border-blue-500 ring-1 ring-blue-500 shadow-md'
                          : 'bg-slate-800/50 border-slate-700/70 hover:bg-slate-800 hover:border-slate-600'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                        isSelected ? 'bg-blue-500 text-white' : 'bg-slate-700 text-slate-300'
                      }`}>
                        {p.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm text-white truncate">{p.name}</div>
                        <div className="text-xs text-slate-400 truncate">{p.role || 'Photographer'}</div>
                      </div>
                      {isSelected && <Check className="w-5 h-5 text-blue-400 flex-shrink-0" />}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 2: Source Selection */}
          {step === 2 && (
            <div className="space-y-4">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                Choose Photo Ingestion Source
              </label>

              <div className="grid grid-cols-2 gap-3">
                {/* SD Card Ingest */}
                <div
                  onClick={handleSimulateSDCardScan}
                  className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col items-center text-center space-y-2 ${
                    sourceType === 'sd_card'
                      ? 'bg-blue-600/20 border-blue-500 ring-1 ring-blue-500'
                      : 'bg-slate-800/40 border-slate-700/60 hover:bg-slate-800'
                  }`}
                >
                  <HardDrive className="w-7 h-7 text-blue-400" />
                  <div>
                    <div className="text-sm font-bold text-white">SD Card / USB</div>
                    <div className="text-xs text-slate-400">Auto-detect camera drive</div>
                  </div>
                </div>

                {/* DSLR Tether */}
                <div
                  onClick={handleSimulateDSLR}
                  className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col items-center text-center space-y-2 ${
                    sourceType === 'dslr_tether'
                      ? 'bg-blue-600/20 border-blue-500 ring-1 ring-blue-500'
                      : 'bg-slate-800/40 border-slate-700/60 hover:bg-slate-800'
                  }`}
                >
                  <Camera className="w-7 h-7 text-purple-400" />
                  <div>
                    <div className="text-sm font-bold text-white">DSLR USB Tether</div>
                    <div className="text-xs text-slate-400">PTP Live Camera Stream</div>
                  </div>
                </div>
              </div>

              {/* Drag and Drop Zone / File Picker */}
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-700 hover:border-blue-500 rounded-2xl p-6 text-center cursor-pointer bg-slate-950/40 transition-colors group"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  multiple
                  accept="image/*"
                  className="hidden"
                />
                <UploadCloud className="w-10 h-10 text-slate-500 group-hover:text-blue-400 mx-auto transition-colors mb-2" />
                <p className="text-sm font-semibold text-white">
                  Drop RAW / JPEG photos here, or <span className="text-blue-400 underline">browse files</span>
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Supported formats: JPG, PNG, WEBP, HEIC, DNG, RAW (Up to 100MB/photo)
                </p>
              </div>

              {/* Selected Files Count Summary */}
              {sourceFiles.length > 0 && (
                <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-3 flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2 text-slate-300">
                    <FileCheck className="w-4 h-4 text-emerald-400" />
                    <span>Selected: <strong className="text-white">{sourceFiles.length} photos</strong> ready for batch ingest</span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSourceFiles([]);
                    }}
                    className="text-red-400 hover:text-red-300"
                  >
                    Clear
                  </button>
                </div>
              )}

              {errors.source && (
                <div className="text-xs text-red-400 flex items-center space-x-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{errors.source}</span>
                </div>
              )}
            </div>
          )}

          {/* STEP 3: Customer Info & Session Options */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  Session Title *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Sunset Family Shoot - Smith Family"
                  value={albumTitle}
                  onChange={(e) => setAlbumTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {errors.title && <p className="text-xs text-red-400 mt-1">{errors.title}</p>}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Room Number / Villa
                  </label>
                  <div className="relative">
                    <Home className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                    <input
                      type="text"
                      placeholder="e.g. 402"
                      value={roomNumber}
                      onChange={(e) => setRoomNumber(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Guest / Lead Name
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                    <input
                      type="text"
                      placeholder="e.g. Alex Smith"
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Customer Email (Pass Delivery)
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                    <input
                      type="email"
                      placeholder="guest@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Phone / Pass
                  </label>
                  <input
                    type="text"
                    placeholder="+1 555 123 4567"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Session Category
                  </label>
                  <select
                    value={sessionType}
                    onChange={(e) => setSessionType(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {sessionTypes.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    RFID / QR Pass #
                  </label>
                  <input
                    type="text"
                    placeholder="RFID / Card ID"
                    value={rfidPass}
                    onChange={(e) => setRfidPass(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Automation Toggles */}
              <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <Sparkles className="w-4 h-4 text-purple-400" />
                    <div>
                      <div className="text-xs font-bold text-white">Full AI Auto-Enhancement</div>
                      <div className="text-[11px] text-slate-400">Exposure, contrast, tone balance & FaceNet 128D</div>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={autoProcess}
                    onChange={(e) => setAutoProcess(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded bg-slate-800 border-slate-600 focus:ring-blue-500"
                  />
                </div>

                <div className="border-t border-slate-800/60 pt-2 flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <Smartphone className="w-4 h-4 text-emerald-400" />
                    <div>
                      <div className="text-xs font-bold text-white">Auto-Dispatch to Touch Kiosks</div>
                      <div className="text-[11px] text-slate-400">Syncs immediately to paired guest touchscreen kiosks</div>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={autoDispatchKiosks}
                    onChange={(e) => setAutoDispatchKiosks(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded bg-slate-800 border-slate-600 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
          {step > 1 ? (
            <button
              onClick={handleBack}
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors flex items-center space-x-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
          ) : (
            <div />
          )}

          {step < 3 ? (
            <button
              onClick={handleNext}
              className="px-5 py-2 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30 transition-colors flex items-center space-x-1.5"
            >
              <span>Continue</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              onClick={handleLaunch}
              className="px-6 py-2.5 text-xs font-bold rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-xl shadow-blue-600/30 transition-all transform hover:scale-105 flex items-center space-x-2"
            >
              <Zap className="w-4 h-4" />
              <span>🚀 Launch Autonomous Pipeline</span>
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
};
