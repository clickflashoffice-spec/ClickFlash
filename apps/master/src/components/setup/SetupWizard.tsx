import React, { useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Building2, User, Lock, Globe, CheckCircle, AlertCircle, Loader2, RotateCcw } from 'lucide-react';
import { setupService } from '@/services/setupService';
import { logger } from '@/utils/logger';

interface SetupWizardProps {
  onComplete: (config: SetupConfig) => void;
  onError: (error: string) => void;
}

export interface SetupConfig {
  locationName: string;
  adminEmail: string;
  adminPassword: string;
  cloudflareApiToken?: string;
  hubUrl?: string;
}

export interface DeploymentProgress {
  step: DeploymentStep;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'rolled_back';
  message: string;
  error?: string;
}

export type DeploymentStep = 
  | 'validating'
  | 'initializing'
  | 'cloudflare_tunnel'
  | 'cloudflare_dns'
  | 'cloudflare_gallery'
  | 'cloudflare_management'
  | 'hub_registration'
  | 'sync_setup'
  | 'finalizing';

const STEPS: { id: DeploymentStep; label: string; icon: React.ReactNode }[] = [
  { id: 'validating', label: 'Validating', icon: <Loader2 className="w-5 h-5" /> },
  { id: 'initializing', label: 'Initializing Database', icon: <User className="w-5 h-5" /> },
  { id: 'cloudflare_tunnel', label: 'Creating Tunnel', icon: <Globe className="w-5 h-5" /> },
  { id: 'cloudflare_dns', label: 'Configuring DNS', icon: <Globe className="w-5 h-5" /> },
  { id: 'cloudflare_gallery', label: 'Registering Gallery', icon: <Building2 className="w-5 h-5" /> },
  { id: 'cloudflare_management', label: 'Registering Management', icon: <Building2 className="w-5 h-5" /> },
  { id: 'hub_registration', label: 'Connecting to Hub', icon: <Globe className="w-5 h-5" /> },
  { id: 'sync_setup', label: 'Setting up Sync', icon: <Globe className="w-5 h-5" /> },
  { id: 'finalizing', label: 'Finalizing', icon: <CheckCircle className="w-5 h-5" /> },
];

export const SetupWizard: React.FC<SetupWizardProps> = ({ onComplete, onError }) => {
  const [step, setStep] = useState<'form' | 'deploying' | 'success' | 'error'>('form');
  const [progress, setProgress] = useState<DeploymentProgress[]>(
    STEPS.map(s => ({ step: s.id, status: 'pending', message: 'Waiting...' }))
  );
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<SetupConfig>({
    locationName: '',
    adminEmail: '',
    adminPassword: '',
    cloudflareApiToken: '',
    hubUrl: '',
  });

  const [validationErrors, setValidationErrors] = useState<Partial<Record<keyof SetupConfig, string>>>({});

  const validateForm = useCallback((): boolean => {
    const errors: Partial<Record<keyof SetupConfig, string>> = {};

    if (!formData.locationName.trim()) {
      errors.locationName = 'Location name is required';
    } else if (formData.locationName.length < 3) {
      errors.locationName = 'Location name must be at least 3 characters';
    } else if (!/^[a-zA-Z0-9\s\-_]+$/.test(formData.locationName)) {
      errors.locationName = 'Location name can only contain letters, numbers, spaces, hyphens, and underscores';
    }

    if (!formData.adminEmail.trim()) {
      errors.adminEmail = 'Admin email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.adminEmail)) {
      errors.adminEmail = 'Please enter a valid email address';
    }

    if (!formData.adminPassword) {
      errors.adminPassword = 'Admin password is required';
    } else if (formData.adminPassword.length < 8) {
      errors.adminPassword = 'Password must be at least 8 characters';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  }, [formData]);

  const updateProgress = useCallback((stepId: DeploymentStep, status: DeploymentProgress['status'], message: string, errorMsg?: string) => {
    setProgress(prev => prev.map(p => 
      p.step === stepId ? { ...p, status, message, error: errorMsg } : p
    ));
  }, []);

  const handleDeploy = useCallback(async () => {
    if (!validateForm()) return;

    setStep('deploying');
    setProgress(STEPS.map(s => ({ step: s.id, status: 'pending', message: 'Waiting...' })));
    
    setProgress(prev => prev.map(p => 
      p.step === 'validating' ? { ...p, status: 'in_progress', message: 'Connecting to server...' } : p
    ));

    logger.info('[SetupWizard] Starting deployment', { locationName: formData.locationName });

    try {
      const result = await setupService.deploy(formData);

      if (result.success) {
        logger.info('[SetupWizard] Deployment successful');
        setStep('success');
        onComplete(formData);
      } else {
        logger.error('[SetupWizard] Deployment failed', result.message);
        setError(result.message);
        setStep('error');
        onError(result.message);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      logger.error('[SetupWizard] Deployment failed', err);
      setError(errorMessage);
      setStep('error');
      onError(errorMessage);
    }
  }, [formData, validateForm, onComplete, onError]);

  const handleRetry = useCallback(() => {
    setStep('form');
    setError(null);
  }, []);

  if (step === 'deploying' || step === 'success' || step === 'error') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl">
          <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl p-8 shadow-2xl border border-slate-700">
            {step === 'deploying' && (
              <DeploymentView progress={progress} />
            )}
            {step === 'success' && (
              <SuccessView locationName={formData.locationName} />
            )}
            {step === 'error' && (
              <ErrorView error={error || 'Unknown error'} onRetry={handleRetry} />
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl p-8 shadow-2xl border border-slate-700">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-cyan-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Building2 className="w-8 h-8 text-cyan-400" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Welcome to ClickFlash</h1>
            <p className="text-slate-400">Configure your Master Portal to get started</p>
          </div>

          <form onSubmit={(e) => { e.preventDefault(); handleDeploy(); }} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Location Name
              </label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input
                  type="text"
                  value={formData.locationName}
                  onChange={(e) => setFormData(prev => ({ ...prev, locationName: e.target.value }))}
                  placeholder="e.g., Miami Resort"
                  className={`w-full pl-10 pr-4 py-3 bg-slate-900/50 border ${validationErrors.locationName ? 'border-red-500' : 'border-slate-600'} rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all`}
                />
              </div>
              {validationErrors.locationName && (
                <p className="mt-1 text-sm text-red-400">{validationErrors.locationName}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Admin Email
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input
                  type="email"
                  value={formData.adminEmail}
                  onChange={(e) => setFormData(prev => ({ ...prev, adminEmail: e.target.value }))}
                  placeholder="admin@clickflash.photo"
                  className={`w-full pl-10 pr-4 py-3 bg-slate-900/50 border ${validationErrors.adminEmail ? 'border-red-500' : 'border-slate-600'} rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all`}
                />
              </div>
              {validationErrors.adminEmail && (
                <p className="mt-1 text-sm text-red-400">{validationErrors.adminEmail}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Admin Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input
                  type="password"
                  value={formData.adminPassword}
                  onChange={(e) => setFormData(prev => ({ ...prev, adminPassword: e.target.value }))}
                  placeholder="Minimum 8 characters"
                  className={`w-full pl-10 pr-4 py-3 bg-slate-900/50 border ${validationErrors.adminPassword ? 'border-red-500' : 'border-slate-600'} rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all`}
                />
              </div>
              {validationErrors.adminPassword && (
                <p className="mt-1 text-sm text-red-400">{validationErrors.adminPassword}</p>
              )}
            </div>

            <div className="pt-4">
              <button
                type="submit"
                className="w-full py-4 bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40"
              >
                Deploy System
              </button>
            </div>
          </form>

          <p className="text-center text-xs text-slate-500 mt-6">
            By deploying, you agree to the ClickFlash Terms of Service
          </p>
        </div>
      </motion.div>
    </div>
  );
};

const DeploymentView: React.FC<{ progress: DeploymentProgress[] }> = ({ progress }) => {
  return (
    <div>
      <div className="text-center mb-8">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          className="w-16 h-16 bg-cyan-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4"
        >
          <Globe className="w-8 h-8 text-cyan-400" />
        </motion.div>
        <h2 className="text-xl font-bold text-white mb-2">Deploying Your System</h2>
        <p className="text-slate-400">Please wait while we set everything up...</p>
      </div>

      <div className="space-y-3">
        {progress.map((item, index) => (
          <motion.div
            key={item.step}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="flex items-center gap-3 p-3 rounded-xl bg-slate-900/50"
          >
            <div className={`flex-shrink-0 ${
              item.status === 'completed' ? 'text-green-400' :
              item.status === 'in_progress' ? 'text-cyan-400' :
              item.status === 'failed' ? 'text-red-400' :
              'text-slate-500'
            }`}>
              {item.status === 'completed' ? <CheckCircle className="w-5 h-5" /> :
               item.status === 'in_progress' ? <Loader2 className="w-5 h-5 animate-spin" /> :
               item.status === 'failed' ? <AlertCircle className="w-5 h-5" /> :
               <div className="w-5 h-5 rounded-full border-2 border-current" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium ${
                item.status === 'pending' ? 'text-slate-500' : 'text-white'
              }`}>
                {STEPS.find(s => s.id === item.step)?.label}
              </p>
              <p className="text-xs text-slate-400 truncate">{item.message}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

const SuccessView: React.FC<{ locationName: string }> = ({ locationName }) => {
  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="text-center"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', delay: 0.2 }}
        className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6"
      >
        <CheckCircle className="w-10 h-10 text-green-400" />
      </motion.div>
      <h2 className="text-2xl font-bold text-white mb-2">Deployment Complete!</h2>
      <p className="text-slate-400 mb-6">
        Your <span className="text-cyan-400 font-semibold">{locationName}</span> Master Portal is ready.
      </p>
      <div className="space-y-3 text-left bg-slate-900/50 rounded-xl p-4 mb-6">
        <div className="flex items-center gap-3 text-sm">
          <CheckCircle className="w-4 h-4 text-green-400" />
          <span className="text-slate-300">Database initialized</span>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <CheckCircle className="w-4 h-4 text-green-400" />
          <span className="text-slate-300">Cloudflare Tunnel configured</span>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <CheckCircle className="w-4 h-4 text-green-400" />
          <span className="text-slate-300">Connected to Management Hub</span>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <CheckCircle className="w-4 h-4 text-green-400" />
          <span className="text-slate-300">Sync service active</span>
        </div>
      </div>
      <button
        onClick={() => window.location.reload()}
        className="w-full py-4 bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-cyan-500/25"
      >
        Launch Dashboard
      </button>
    </motion.div>
  );
};

const ErrorView: React.FC<{ error: string; onRetry: () => void }> = ({ error, onRetry }) => {
  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="text-center"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', delay: 0.2 }}
        className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6"
      >
        <AlertCircle className="w-10 h-10 text-red-400" />
      </motion.div>
      <h2 className="text-2xl font-bold text-white mb-2">Deployment Failed</h2>
      <p className="text-slate-400 mb-6">
        We couldn't complete the deployment. Please try again.
      </p>
      <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6 text-left">
        <p className="text-sm text-red-300 font-mono">{error}</p>
      </div>
      <div className="flex gap-3">
        <button
          onClick={onRetry}
          className="flex-1 py-4 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-xl transition-all"
        >
          Try Again
        </button>
        <button
          onClick={() => window.open('https://support.clickflash.photo', '_blank')}
          className="flex-1 py-4 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-xl transition-all"
        >
          Get Support
        </button>
      </div>
    </motion.div>
  );
};

export default SetupWizard;
