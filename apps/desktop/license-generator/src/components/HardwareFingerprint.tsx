import React, { useEffect, useState } from 'react';

export function HardwareFingerprint() {
  const [fingerprint, setFingerprint] = useState<string>('Loading...');

  useEffect(() => {
    window.licenseApi.getHardwareFingerprint()
      .then(setFingerprint)
      .catch(e => setFingerprint(`Error: ${e.message}`));
  }, []);

  return (
    <div className="hardware-fingerprint-container">
      <h2>Local Machine Hardware Fingerprint</h2>
      <p>This is the hardware fingerprint calculated for the current operator machine. You can use this for self-issuance or diagnostics.</p>
      
      <div className="fingerprint-display">
        <code>{fingerprint}</code>
        <button onClick={() => navigator.clipboard.writeText(fingerprint)}>Copy</button>
      </div>
    </div>
  );
}
