import { ErrorBoundary } from "@clickflash/ui";
import React from "react";
import ThermalMonitor from "./components/common/ThermalMonitor";
import { AuthProvider } from "./context/AuthContext";
import { SyncProvider } from "./context/SyncContext";
import { ToastProvider } from "./context/ToastContext";
import { AppRouter } from "./components/AppRouter";
import { BackgroundJobRunner } from "./components/common/BackgroundJobRunner";
import { GlobalSearchProvider } from "./context/GlobalSearchContext";

const App: React.FC = () => {
  const handleExit = React.useCallback(() => {
    window.location.href = "/";
  }, []);

  return (
    <ErrorBoundary>
      <AuthProvider>
        <ToastProvider>
          <SyncProvider>
            <GlobalSearchProvider>
              <BackgroundJobRunner />
              <ThermalMonitor />
              <AppRouter onExit={handleExit} />
            </GlobalSearchProvider>
          </SyncProvider>
        </ToastProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
};

export default App;
