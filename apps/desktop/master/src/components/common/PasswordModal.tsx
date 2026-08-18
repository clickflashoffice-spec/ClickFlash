import React, { useState, useEffect } from "react";
import { Modal } from '@clickflash/ui';

interface PasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  verifyPassword?: (password: string) => Promise<boolean> | boolean;
  title?: string;
  message?: string;
}

const PasswordModal: React.FC<PasswordModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  verifyPassword,
  title = "Admin Access",
  message = "Please enter the password to proceed.",
}) => {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setPassword("");
      setError("");
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let isVerified = false;
      if (verifyPassword) {
        isVerified = await verifyPassword(password);
      } else {
        // Validate via backend API — never hardcode passwords client-side
        const csrfMatch = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
        const csrfToken = csrfMatch ? decodeURIComponent(csrfMatch[1]) : "";
        const resp = await fetch("/api/auth/verify-pin", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(csrfToken ? { "X-CSRF-Token": csrfToken } : {}),
          },
          body: JSON.stringify({ pin: password }),
        });
        isVerified = resp.ok;
      }

      if (isVerified) {
        onSuccess();
        onClose();
      } else {
        setError("Incorrect password");
        setPassword("");
        inputRef.current?.focus();
      }
    } catch (err: any) {
      setError(err.message || "Verification failed");
      setPassword("");
      inputRef.current?.focus();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <p className="text-slate-500 dark:text-slate-400 mb-4">{message}</p>
          <div className="relative">
            <input
              ref={inputRef}
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError("");
              }}
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 bg-white dark:bg-slate-700 dark:text-white ${
                error
                  ? "border-red-500 focus:ring-red-500"
                  : "border-slate-300 dark:border-slate-600 focus:ring-blue-500"
              }`}
              placeholder="Enter password"
              autoComplete="current-password"
            />
          </div>
          {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
        </div>
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-slate-700 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors font-medium"
          >
            Confirm
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default PasswordModal;
