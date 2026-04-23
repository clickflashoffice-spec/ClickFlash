import React, { useState, useEffect } from "react";
import Modal from "./common/Modal";
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
    className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-8 text-left cursor-pointer transition-all duration-300 hover:bg-slate-200 dark:hover:bg-slate-700 hover:shadow-xl hover:shadow-blue-500/10 hover:scale-105"
  >
    <div className="text-blue-500 dark:text-blue-400 mb-4">{icon}</div>
    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
      {title}
    </h2>
    <p className="text-slate-500 dark:text-slate-400 mt-1">{description}</p>
  </button>
);

const PortalSelectionScreen: React.FC<PortalSelectionScreenProps> = ({
  onSelectPortal,
}) => {
  const [branding, setBranding] = useState({
    title: "Star Master OS",
    logoUrl: "/gallery/logo.png",
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
    <div className="h-screen w-screen flex flex-col items-center justify-center bg-white dark:bg-slate-900 p-8 relative">
      <button
        onClick={() => setIsSettingsOpen(true)}
        className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
        title="Launchpad Settings"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6"
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

      <div className="text-center mb-12">
        <img
          src={branding.logoUrl}
          alt="Logo"
          className="w-24 h-24 mx-auto rounded-full mb-4 object-cover shadow-lg"
        />
        <h1 className="text-4xl font-bold text-slate-900 dark:text-white">
          {branding.title}
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Select a portal to continue
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl">
        <PortalCard
          title="Master Portal"
          description="Manage albums, photographers, and orders for a specific destination."
          onClick={() => onSelectPortal("master")}
          icon={
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-12 w-12"
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
          title="Touch Kiosk"
          description="A customer-facing interface for browsing photos and booking sessions."
          onClick={() => onSelectPortal("touch")}
          icon={
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-12 w-12"
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
          description="Oversee all destinations, manage finances, payroll, and global settings."
          onClick={() => onSelectPortal("management")}
          icon={
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-12 w-12"
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
          title="Customer Gallery"
          description="For customers to view and download their purchased photos online."
          onClick={() => onSelectPortal("customer")}
          icon={
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-12 w-12"
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
      <div className="absolute bottom-4 text-xs text-slate-400 dark:text-slate-500">
        Version 4.1.0
      </div>

      <Modal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        title="Launchpad Branding"
      >
        <div className="space-y-4">
          <div className="flex flex-col items-center mb-4">
            <img
              src={tempBranding.logoUrl}
              alt="Preview"
              className="w-20 h-20 rounded-full object-cover mb-2 border border-slate-200"
            />
            <label className="cursor-pointer text-sm text-blue-600 hover:underline">
              Change Logo
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleLogoUpload}
              />
            </label>
          </div>
          <div>
            <label
              htmlFor="portal-app-title"
              className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1"
            >
              Application Title
            </label>
            <input
              id="portal-app-title"
              type="text"
              value={tempBranding.title}
              onChange={(e) =>
                setTempBranding({ ...tempBranding, title: e.target.value })
              }
              className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              placeholder="e.g. Star Master"
              title="Application Title"
            />
          </div>
          <div className="pt-4 flex justify-end space-x-2">
            <button
              onClick={() => setIsSettingsOpen(false)}
              className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveSettings}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md"
            >
              Save Changes
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default PortalSelectionScreen;
