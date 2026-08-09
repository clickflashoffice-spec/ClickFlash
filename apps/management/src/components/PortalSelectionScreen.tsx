import React, { useState, useEffect } from "react";
import { Modal } from "@clickflash/ui";
import { logger } from "../utils/logger.ts";

interface PortalSelectionScreenProps {
  onSelectPortal: (
    portal: "master" | "touch" | "management" | "customer",
  ) => void;
}

const PortalCard: React.FC<{
  title: string;
  description: string;
  onClick: () => void;
  icon: React.ReactNode;
}> = ({ title, description, onClick, icon }) => (
  <button
    onClick={onClick}
    className="group relative bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 text-left cursor-pointer transition-all duration-500 hover:scale-[1.05] hover:border-cyan-500/50 hover:shadow-[0_20px_50px_rgba(6,182,212,0.15)] overflow-hidden"
  >
    <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
    <div className="text-cyan-500 mb-6 transform group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500">
      {icon}
    </div>
    <h2 className="text-2xl font-black text-white tracking-tight leading-none">
      {title}
    </h2>
    <p className="text-slate-400 mt-4 text-sm font-medium leading-relaxed">
      {description}
    </p>
    <div className="mt-8 flex items-center text-[10px] font-black text-cyan-500 uppercase tracking-[0.2em] opacity-0 group-hover:opacity-100 transition-all transform translate-x-[-10px] group-hover:translate-x-0">
      Initialize Portal
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-3 w-3 ml-2"
        viewBox="0 0 20 20"
        fill="currentColor"
      >
        <path
          fillRule="evenodd"
          d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
          clipRule="evenodd"
        />
      </svg>
    </div>
  </button>
);

const PortalSelectionScreen: React.FC<PortalSelectionScreenProps> = ({
  onSelectPortal,
}) => {
  const [branding, setBranding] = useState({
    title: "ClickFlash Master OS",
    logoUrl: "/logo.png",
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [tempBranding, setTempBranding] = useState(branding);

  useEffect(() => {
    const saved = localStorage.getItem("launchpadBranding");
    if (saved) {
      try {
        setBranding(JSON.parse(saved));
      } catch (e) {
        logger.error(
          "Failed to load portal selection",
          e instanceof Error ? e : undefined,
        );
      }
    }
  }, []);

  useEffect(() => {
    if (isSettingsOpen) setTempBranding(branding);
  }, [isSettingsOpen, branding]);

  const handleSaveSettings = () => {
    setBranding(tempBranding);
    localStorage.setItem("launchpadBranding", JSON.stringify(tempBranding));
    setIsSettingsOpen(false);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setTempBranding((prev) => ({
          ...prev,
          logoUrl: reader.result as string,
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#020617] text-slate-100 p-8 relative overflow-hidden font-sans">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-40">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-cyan-500/10 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/10 rounded-full blur-[120px] animate-pulse [animation-delay:2s]"></div>
      </div>

      <button
        onClick={() => setIsSettingsOpen(true)}
        className="absolute top-10 right-10 p-4 bg-slate-900 border border-slate-800 rounded-2xl text-slate-400 hover:text-cyan-400 hover:border-cyan-500/50 transition-all shadow-2xl z-20 group"
        title="Launchpad Settings"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5 group-hover:rotate-90 transition-transform duration-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924-1.756-3.35 0a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0 3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
      </button>

      <div className="text-center mb-16 relative z-10">
        <div className="relative inline-block mb-8">
          <div className="absolute inset-0 bg-cyan-500/20 rounded-full blur-[40px]"></div>
          <img
            src={branding.logoUrl}
            alt="Logo"
            className="w-24 h-24 mx-auto rounded-full object-cover border-4 border-slate-900 shadow-2xl relative z-10"
          />
        </div>
        <h1 className="text-5xl font-black text-white tracking-tighter mb-4">
          {branding.title}
        </h1>
        <p className="text-slate-500 font-bold uppercase tracking-[0.4em] text-[10px]">
          Unified Operational Terminal
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl relative z-10 w-full">
        <PortalCard
          title="Master"
          description="Operational core for destination management and ingestion."
          onClick={() => onSelectPortal("master")}
          icon={
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-10 w-10"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
              />
            </svg>
          }
        />
        <PortalCard
          title="Kiosk"
          description="High-speed customer selection and booking interface."
          onClick={() => onSelectPortal("touch")}
          icon={
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-10 w-10"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
              />
            </svg>
          }
        />
        <PortalCard
          title="Management"
          description="Global financial oversight and resort performance BI."
          onClick={() => onSelectPortal("management")}
          icon={
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-10 w-10"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          }
        />
        <PortalCard
          title="Gallery"
          description="Cloud-native portal for customer asset fulfillment."
          onClick={() => onSelectPortal("customer")}
          icon={
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-10 w-10"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
              />
            </svg>
          }
        />
      </div>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-[9px] font-black text-slate-600 uppercase tracking-[0.8em]">
        ClickFlash Terminal v5.2.0
      </div>

      <Modal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        title="Terminal Configuration"
      >
        <div className="space-y-8 py-4">
          <div className="flex flex-col items-center">
            <div className="relative group">
              <div className="absolute inset-0 bg-cyan-500/20 rounded-full blur-xl group-hover:scale-125 transition-transform"></div>
              <img
                src={tempBranding.logoUrl}
                alt="Preview"
                className="w-24 h-24 rounded-full object-cover border-4 border-slate-900 relative z-10"
              />
            </div>
            <label className="mt-4 cursor-pointer text-[10px] font-black text-cyan-500 uppercase tracking-widest hover:text-cyan-400">
              Update Identity Logo
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleLogoUpload}
              />
            </label>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
              Terminal Name
            </label>
            <input
              type="text"
              value={tempBranding.title}
              onChange={(e) =>
                setTempBranding({ ...tempBranding, title: e.target.value })
              }
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-100 focus:ring-2 focus:ring-cyan-500/50 outline-none transition-all font-bold"
              placeholder="e.g. Star Master"
              title="Terminal Name"
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setIsSettingsOpen(false)}
              className="flex-1 px-4 py-3 text-[10px] font-black text-slate-500 hover:text-white uppercase tracking-widest transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveSettings}
              className="flex-1 px-4 py-3 text-[10px] font-black text-white bg-cyan-600 hover:bg-cyan-500 rounded-xl shadow-xl shadow-cyan-900/20 uppercase tracking-widest transition-all"
            >
              Apply Changes
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default PortalSelectionScreen;
