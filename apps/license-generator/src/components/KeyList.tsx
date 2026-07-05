import React from 'react';
import { LicenseKeyData } from '../types/license';

interface KeyListProps {
  keys: LicenseKeyData[];
  onExport: () => void;
  onCopy: (text: string) => void;
}

export function KeyList({ keys, onExport, onCopy }: KeyListProps) {
  if (keys.length === 0) return null;

  return (
    <div className="key-list">
      <div className="keys-container">
        {keys.map((k, i) => (
          <div key={i} className="key-item">
            <span className="key-number">#{i + 1}</span>
            <code className="key-value">{k.key}</code>
            <span className="key-meta">
              {k.plan} • {k.maxMasters} studios • Expires {k.expiresAt}
            </span>
            <button 
              className="copy-btn" 
              onClick={() => onCopy(k.key)}
              title="Copy to clipboard"
            >
              📋
            </button>
          </div>
        ))}
      </div>

      <div className="key-actions">
        <button onClick={onExport} className="export-btn">
          Export to JSON
        </button>
        <button 
          onClick={() => onCopy(keys.map(k => k.key).join('\n'))} 
          className="copy-all-btn"
        >
          Copy All Keys
        </button>
      </div>
    </div>
  );
}
