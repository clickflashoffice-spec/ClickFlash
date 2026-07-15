import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Photographer } from "../../types";

interface Props {
  currentUser: Photographer;
}

export const ActivateDevicePage: React.FC<Props> = ({ currentUser }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [code, setCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const userCode = params.get("code");
    if (userCode) {
      setCode(userCode);
    } else {
      setError("No device code found in URL.");
    }
  }, [location]);

  const handleAuthorize = async () => {
    if (!code) return;
    setLoading(true);
    setError(null);
    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL || "https://management-hub.clickflash-office.workers.dev";
      const res = await fetch(`${baseUrl}/api/v1/oauth/authorize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_code: code,
          tenant_id: (currentUser as any).tenant_id || currentUser.id,
          admin_user_id: currentUser.id,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to authorize device");
      }

      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-neutral-900 text-white">
        <div className="bg-neutral-800 p-8 rounded-lg shadow-xl max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold mb-2">Device Authorized!</h2>
          <p className="text-neutral-400 mb-6">
            The device has been successfully linked to your tenant. You can now close this window or return to the dashboard.
          </p>
          <button
            onClick={() => navigate("/")}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-neutral-900 text-white">
      <div className="bg-neutral-800 p-8 rounded-lg shadow-xl max-w-md w-full text-center">
        <h2 className="text-2xl font-bold mb-4">Authorize Device</h2>
        <p className="text-neutral-400 mb-6">
          A new device is requesting access to your account. Please verify the code matches what is shown on the device.
        </p>
        
        {code ? (
          <div className="bg-neutral-900 p-4 rounded-lg border border-neutral-700 mb-6">
            <span className="text-3xl font-mono tracking-widest text-blue-400">{code}</span>
          </div>
        ) : null}

        {error && (
          <div className="mb-6 p-3 bg-red-500/10 border border-red-500/50 rounded text-red-400 text-sm">
            {error}
          </div>
        )}

        <div className="flex gap-4">
          <button
            onClick={() => navigate("/")}
            className="flex-1 px-4 py-2 bg-neutral-700 hover:bg-neutral-600 rounded-lg font-medium transition-colors"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={handleAuthorize}
            disabled={!code || loading}
            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Authorizing...
              </>
            ) : (
              "Authorize"
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
