import React, { useState, useEffect } from "react";
import { Loader2, CheckCircle2, AlertCircle, XCircle } from "lucide-react";

export type SaveStatus = "IDLE" | "SAVING" | "SUCCESS" | "ERROR";

interface SaveStateMachineProps {
  status: SaveStatus;
  onSave: () => void;
  onCancel?: () => void;
  label?: string;
  savingLabel?: string;
  disabled?: boolean;
  className?: string;
  successDuration?: number;
}

export const SaveStateMachine: React.FC<SaveStateMachineProps> = ({
  status,
  onSave,
  onCancel,
  label = "Save Changes",
  savingLabel = "Saving...",
  disabled = false,
  className = "",
  successDuration = 3000,
}) => {
  const isSaving = status === "SAVING";
  const isSuccess = status === "SUCCESS";
  const isError = status === "ERROR";

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={onSave}
        disabled={disabled || isSaving || isSuccess}
        className={`
                    flex items-center gap-2 px-4 py-1.5 rounded-lg font-medium transition-all
                    ${
                      isSuccess
                        ? "bg-green-600 text-white shadow-lg shadow-green-500/20"
                        : isError
                          ? "bg-rose-600 text-white"
                          : isSaving
                            ? "bg-gray-200 text-gray-600"
                            : "bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20"
                    }
                    ${disabled && !isSaving && !isSuccess ? "opacity-50 cursor-not-allowed bg-gray-100" : ""}
                    ${className}
                `}
      >
        {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
        {isSuccess && <CheckCircle2 className="w-4 h-4" />}
        {isError && <AlertCircle className="w-4 h-4" />}

        <span>
          {isSaving
            ? savingLabel
            : isSuccess
              ? "Saved!"
              : isError
                ? "Error!"
                : label}
        </span>
      </button>

      {isSaving && onCancel && (
        <button
          onClick={onCancel}
          className="p-1.5 text-gray-400 hover:text-gray-700 rounded-md hover:bg-gray-100 transition-colors"
          title="Cancel Operation"
        >
          <XCircle className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
