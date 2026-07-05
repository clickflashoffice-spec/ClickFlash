import React, { useState, useCallback } from 'react';
import { GeneratorForm } from './components/GeneratorForm';
import { KeyList } from './components/KeyList';
import { Validator } from './components/Validator';
import { generateLicenseKeys, validateLicenseKey } from './utils/license-key';
import { LicenseKeyData } from './types/license';
import './styles.css';

function App() {
  const [generatedKeys, setGeneratedKeys] = useState<LicenseKeyData[]>([]);
  const [notification, setNotification] = useState<string | null>(null);

  const handleGenerate = useCallback(async (plan: string, maxMasters: number, expiresDays: number, count: number) => {
    try {
      const keys = await generateLicenseKeys({
        plan: plan as any,
        maxMasters,
        expiresDays,
        count
      });
      setGeneratedKeys(keys);
      showNotification(`Generated ${keys.length} license keys`);
    } catch (err) {
      showNotification(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
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
    return await validateLicenseKey(key);
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
      </header>

      <main className="app-main">
        <section className="section">
          <h2>Generate Keys</h2>
          <GeneratorForm onGenerate={handleGenerate} />
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
      </main>

      {notification && (
        <div className="notification">
          {notification}
        </div>
      )}

      <footer className="app-footer">
        <p>ClickFlash Studio v4.2.0 • Offline License Generator</p>
      </footer>
    </div>
  );
}

export default App;
