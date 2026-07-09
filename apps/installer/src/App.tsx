/**
 * ClickFlash Installer — Main Wizard Shell
 * 9-step installer: welcome → license → cloudflare → destination → studio → pairing → first-sync → health → complete
 */

import React from "react";
import { useInstallerState } from "./hooks/useInstallerState";
import { STEP_ORDER, STEP_LABELS } from "./types/installer";
import WizardProgress from "./components/WizardProgress";
import WelcomeStep from "./components/WelcomeStep";
import AppSelectionStep from "./components/AppSelectionStep";
import LicenseStep from "./components/LicenseStep";
import CloudflareStepOAuth from "./components/CloudflareStepOAuth";
import DestinationStep from "./components/DestinationStep";
import StudioProfileStep from "./components/StudioProfileStep";
import TouchPairingStep from "./components/TouchPairingStep";
import FirstSyncStep from "./components/FirstSyncStep";
import HealthCheckStep from "./components/HealthCheckStep";
import CompleteStep from "./components/CompleteStep";
import { Camera, Terminal, AlertCircle } from "lucide-react";

const App: React.FC = () => {
  const {
    state,
    goToStep,
    nextStep,
    prevStep,
    setSelectedApps,
    validateLicense,
    requestDeviceCode,
    pollForToken,
    checkDeskId,
    setDestination,
    updateStudioProfile,
    runPairing,
    registerAndFirstSync,
    runHealthChecks,
    saveAndLaunch,
    openExternal,
  } = useInstallerState();

  const renderStep = () => {
    switch (state.step) {
      case "welcome":
        return <WelcomeStep onNext={nextStep} />;
      case "app-selection":
        return (
          <AppSelectionStep
            onNext={(selected) => {
              setSelectedApps(selected);
              nextStep();
            }}
            onPrev={prevStep}
          />
        );
      case "license":
        return (
          <LicenseStep
            state={state}
            onValidate={validateLicense}
            onNext={nextStep}
            onPrev={prevStep}
          />
        );
      case "cloudflare":
        return (
          <CloudflareStepOAuth
            state={state}
            onRequestDeviceCode={requestDeviceCode}
            onPollForToken={pollForToken}
            onNext={nextStep}
            onPrev={prevStep}
          />
        );
      case "destination":
        return (
          <DestinationStep
            state={state}
            onCheckDeskId={checkDeskId}
            onSetDestination={setDestination}
            onNext={nextStep}
            onPrev={prevStep}
          />
        );
      case "studio":
        return (
          <StudioProfileStep
            state={state}
            onUpdate={updateStudioProfile}
            onNext={nextStep}
            onPrev={prevStep}
          />
        );
      case "pairing":
        return (
          <TouchPairingStep
            state={state}
            onPair={runPairing}
            onNext={nextStep}
            onPrev={prevStep}
          />
        );
      case "first-sync":
        return (
          <FirstSyncStep
            onRegisterAndSync={registerAndFirstSync}
            onNext={nextStep}
            onPrev={prevStep}
            onOpenExternal={openExternal}
          />
        );
      case "health":
        return (
          <HealthCheckStep
            state={state}
            onCheck={runHealthChecks}
            onNext={nextStep}
            onPrev={prevStep}
          />
        );
      case "complete":
        return (
          <CompleteStep
            state={state}
            onFinish={saveAndLaunch}
          />
        );
      default:
        return <WelcomeStep onNext={nextStep} />;
    }
  };

  return (
    <div className="wizard-container">
      <header className="wizard-header">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-cyan-500/10 rounded-lg">
            <Camera className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-slate-100">ClickFlash Studio Setup</h1>
            <p className="text-xs text-slate-400">v5.0.0 — Multi-Master Global Sync</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {state.isLoading && (
            <div className="flex items-center gap-2 text-xs text-cyan-400">
              <div className="w-4 h-4 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin" />
              Working...
            </div>
          )}
        </div>
      </header>

      <WizardProgress
        steps={STEP_ORDER}
        labels={STEP_LABELS}
        currentIndex={state.stepIndex}
        onStepClick={(index) => {
          if (index <= state.stepIndex) {
            goToStep(STEP_ORDER[index]);
          }
        }}
      />

      <main className="wizard-content">
        {state.error && (
          <div className="mb-4 flex items-start gap-3 p-4 bg-rose-500/10 border border-rose-500/20 rounded-lg">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-rose-300">Error</p>
              <p className="text-sm text-rose-200/80">{state.error}</p>
            </div>
          </div>
        )}
        {renderStep()}
      </main>

      <footer className="wizard-footer">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Terminal className="w-3.5 h-3.5" />
          <span className="font-mono">{state.logs[state.logs.length - 1] || "Ready"}</span>
        </div>
        <div className="text-xs text-slate-500">
          Step {state.stepIndex + 1} of {state.totalSteps}
        </div>
      </footer>
    </div>
  );
};

export default App;
