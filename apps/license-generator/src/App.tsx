import React, { useState, useCallback } from 'react';
import { GeneratorForm } from './components/GeneratorForm';
import { KeyList } from './components/KeyList';
import { Validator } from './components/Validator';
import { AuditLog } from './components/AuditLog';
import { HardwareFingerprint } from './components/HardwareFingerprint';
import { LicenseKeyData } from './types/license';
import './styles.css';

function App() {
  const [activeTab, setActiveTab] = useState<'generator' | 'audit' | 'fingerprint'>('generator');
  const [generatedKeys, setGeneratedKeys] = useState<LicenseKeyData[]>([]);
  const [notification, setNotification] = useState<string | null>(null);
  const [signingKeyLabel, setSigningKeyLabel] = useState<string | null>(null);

  const handleGenerate = useCallback(async (
    plan: string,
    maxMasters: number,
    expiresDays: number,
    count: number,
    machineId: string,
  ) => {
    try {
      const keys = await window.licenseApi.generateLicenses({
        plan: plan as 'trial' | 'starter' | 'pro' | 'enterprise',
        maxMasters,
        expiresDays,
        count,
        machineId
      });
      setGeneratedKeys(keys);
      showNotification(`Generated ${keys.length} license keys`);
    } catch (err) {
      showNotification(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }, []);

  const handleSelectSigningKey = useCallback(async () => {
    try {
      const result = await window.licenseApi.selectSigningKey();
      if (result.selected) {
        setSigningKeyLabel(`${result.fileName} (${result.keyId})`);
        showNotification('Private signing key loaded into the protected main process');
      } else if (result.error) {
        showNotification(`Error: ${result.error}`);
      }
    } catch (err) {
      showNotification(`Error: ${err instanceof Error ? err.message : 'Unable to load signing key'}`);
    }
  }, []);

  const handleClearSigningKey = useCallback(async () => {
    try {
      await window.licenseApi.clearSigningKey();
      setSigningKeyLabel(null);
      showNotification('Private signing key cleared');
    } catch (err) {
      showNotification(`Error: ${err instanceof Error ? err.message : 'Unable to clear signing key'}`);
    }
  }, []);

  const handleExport = useCallback(() => {
    const dataStr = JSON.stringify(generatedKeys, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `clickflash-licenses-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showNotification('Keys exported to JSON');
  }, [generatedKeys]);

  const handleCopy = useCallback((text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      showNotification('Copied to clipboard');
    });
  }, []);

  const handleValidate = useCallback(async (key: string) => {
    return window.licenseApi.validateLicense({ key });
  }, []);

  const showNotification = (message: string) => {
    setNotification(message);
    setTimeout(() => setNotification(null), 3000);
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>🔑 ClickFlash License Generator</h1>
        <p>Generate and validate license keys for ClickFlash Studio</p>
        <div className="tabs">
          <button 
            className={activeTab === 'generator' ? 'active' : ''} 
            onClick={() => setActiveTab('generator')}
          >
            Generator
          </button>
          <button 
            className={activeTab === 'audit' ? 'active' : ''} 
            onClick={() => setActiveTab('audit')}
          >
            Audit Log & Revocations
          </button>
          <button 
            className={activeTab === 'fingerprint' ? 'active' : ''} 
            onClick={() => setActiveTab('fingerprint')}
          >
            Hardware Fingerprint
          </button>
        </div>
      </header>

      <main className="app-main">
        {activeTab === 'generator' && (
          <>
            <section className="section">
              <h2>Generate Keys</h2>
              <GeneratorForm
                signingKeyLabel={signingKeyLabel}
                onSelectSigningKey={handleSelectSigningKey}
                onClearSigningKey={handleClearSigningKey}
                onGenerate={handleGenerate}
              />
            </section>

            {generatedKeys.length > 0 && (
              <section className="section">
                <h2>Generated Keys ({generatedKeys.length})</h2>
                <KeyList keys={generatedKeys} onExport={handleExport} onCopy={handleCopy} />
              </section>
            )}

            <section className="section">
              <h2>Validate Key</h2>
              <Validator onValidate={handleValidate} />
            </section>
          </>
        )}

        {activeTab === 'audit' && (
          <section className="section">
            <h2>Audit Log & Revocations</h2>
            <AuditLog />
          </section>
        )}

        {activeTab === 'fingerprint' && (
          <section className="section">
            <HardwareFingerprint />
          </section>
        )}
      </main>

      {notification && (
        <div className="notification">
          {notification}
        </div>
      )}

      <footer className="app-footer">
        <p>ClickFlash Studio • Offline License Generator</p>
      </footer>
    </div>
  );
}

export default App;
