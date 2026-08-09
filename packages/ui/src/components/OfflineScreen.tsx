'use client';
import React, { memo, useCallback } from 'react';

/**
 * Shared OfflineScreen component for all ClickFlash apps.
 *
 * Displays when the app detects no network connectivity.
 * Shows a retry button and optional "back" navigation.
 *
 * Usage:
 *   import { OfflineScreen } from '@clickflash/ui';
 *
 *   if (!isOnline) return <OfflineScreen portalName="Master Portal" onBack={goBack} />;
 */

interface OfflineScreenProps {
  /** Name of the portal/app to display */
  portalName: string;
  /** Optional callback for "Go Back" button */
  onBack?: () => void;
  /** Optional message override */
  message?: string;
}

export const OfflineScreen: React.FC<OfflineScreenProps> = memo(({
  portalName,
  onBack,
  message,
}) => {
  const handleRetry = useCallback(() => {
    window.location.reload();
  }, []);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: '#0f172a',
        color: '#e2e8f0',
        fontFamily: 'Inter, system-ui, sans-serif',
        padding: '2rem',
        textAlign: 'center',
      }}
    >
      {/* Animated offline icon */}
      <div
        style={{
          width: '80px',
          height: '80px',
          borderRadius: '50%',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          border: '2px solid rgba(239, 68, 68, 0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '1.5rem',
          fontSize: '36px',
        }}
      >
        📡
      </div>

      <h1
        style={{
          margin: '0 0 0.5rem 0',
          fontSize: '1.5rem',
          fontWeight: 700,
          color: '#f1f5f9',
        }}
      >
        No Connection
      </h1>

      <p
        style={{
          margin: '0 0 0.25rem 0',
          fontSize: '0.875rem',
          color: '#94a3b8',
          fontWeight: 500,
        }}
      >
        {portalName}
      </p>

      <p
        style={{
          margin: '0 0 2rem 0',
          fontSize: '0.875rem',
          color: '#64748b',
          maxWidth: '400px',
          lineHeight: 1.6,
        }}
      >
        {message || 'Unable to connect to the server. Please check your internet connection and try again.'}
      </p>

      <div style={{ display: 'flex', gap: '0.75rem' }}>
        <button
          onClick={handleRetry}
          style={{
            padding: '0.75rem 2rem',
            backgroundColor: '#3b82f6',
            color: '#ffffff',
            border: 'none',
            borderRadius: '10px',
            fontSize: '0.875rem',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 150ms',
          }}
          onMouseOver={(e) => { (e.target as HTMLButtonElement).style.backgroundColor = '#2563eb'; }}
          onMouseOut={(e) => { (e.target as HTMLButtonElement).style.backgroundColor = '#3b82f6'; }}
        >
          Retry Connection
        </button>

        {onBack && (
          <button
            onClick={onBack}
            style={{
              padding: '0.75rem 2rem',
              backgroundColor: 'transparent',
              color: '#94a3b8',
              border: '1px solid #334155',
              borderRadius: '10px',
              fontSize: '0.875rem',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 150ms',
            }}
            onMouseOver={(e) => {
              (e.target as HTMLButtonElement).style.borderColor = '#64748b';
              (e.target as HTMLButtonElement).style.color = '#e2e8f0';
            }}
            onMouseOut={(e) => {
              (e.target as HTMLButtonElement).style.borderColor = '#334155';
              (e.target as HTMLButtonElement).style.color = '#94a3b8';
            }}
          >
            Go Back
          </button>
        )}
      </div>
    </div>
  );
});

OfflineScreen.displayName = 'OfflineScreen';

export default OfflineScreen;

