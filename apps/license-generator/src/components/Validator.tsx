import React, { useState } from 'react';

interface ValidatorProps {
  onValidate: (key: string) => Promise<{ valid: boolean; plan?: string; maxMasters?: number; expiresAt?: string; machineId?: string; error?: string }>;
}

export function Validator({ onValidate }: ValidatorProps) {
  const [key, setKey] = useState('');
  const [result, setResult] = useState<any>(null);

  const handleValidate = async () => {
    const validation = await onValidate(key);
    setResult(validation);
  };

  return (
    <div className="validator">
      <div className="validator-input">
        <input
          type="text"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="Enter Ed25519 License Key..."
          className="key-input"
        />
        <button onClick={handleValidate} className="validate-btn">
          Validate
        </button>
      </div>
      
      {result && (
        <div className={`result ${result.valid ? 'valid' : 'invalid'}`}>
          {result.valid ? (
            <>
              <span className="result-icon">✅</span>
              <div className="result-details">
                <p><strong>Valid License</strong></p>
                <p>Plan: {result.plan}</p>
                <p>Studios: {result.maxMasters}</p>
                <p>Expires: {result.expiresAt}</p>
                {result.machineId && <p>Machine ID: {result.machineId}</p>}
              </div>
            </>
          ) : (
            <>
              <span className="result-icon">❌</span>
              <span>Invalid: {result.error}</span>
            </>
          )}
        </div>
      )}
    </div>
  );
}
