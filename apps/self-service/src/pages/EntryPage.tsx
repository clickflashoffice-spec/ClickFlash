import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Camera, QrCode } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { validateAccessCode } from '../services/auth';
import { Button } from '../components/common/Button';

export const EntryPage = () => {
  const [accessCode, setAccessCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const setAuth = useAuthStore(state => state.setAuth);

  useEffect(() => {
    const magicToken = searchParams.get('token');
    if (magicToken) {
      handleAccessCode(magicToken);
    }
  }, [searchParams]);

  const handleAccessCode = async (code: string) => {
    setIsLoading(true);
    setError('');
    try {
      const res = await validateAccessCode(code);
      setAuth(res.token, res.eventId, res.guestName);
      navigate('/gallery');
    } catch (err) {
      setError('Invalid access code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (accessCode.length < 6) {
      setError('Code must be at least 6 characters');
      return;
    }
    handleAccessCode(accessCode);
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-brand-dark via-slate-900 to-brand-primary/20 -z-10" />
      
      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="glass-card w-full max-w-md p-8 text-center"
      >
        <div className="mx-auto w-16 h-16 bg-brand-primary/20 rounded-full flex items-center justify-center mb-6">
          <Camera size={32} className="text-brand-primary" />
        </div>
        
        <h1 className="text-3xl font-bold text-white mb-2">ClickFlash</h1>
        <p className="text-slate-400 mb-8">Enter your access code to view your resort photos</p>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="text"
              value={accessCode}
              onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
              placeholder="e.g. A8X9-2B4M"
              className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-3 text-center text-xl tracking-widest text-white focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-colors uppercase"
              disabled={isLoading}
            />
          </div>
          
          {error && <p className="text-red-400 text-sm">{error}</p>}
          
          <Button type="submit" fullWidth disabled={isLoading || accessCode.length === 0}>
            {isLoading ? 'Verifying...' : 'Access My Photos'}
          </Button>
        </form>
        
        <div className="mt-6 flex items-center justify-center space-x-4 text-sm text-slate-400">
          <span className="flex-1 h-px bg-slate-700"></span>
          <span>OR</span>
          <span className="flex-1 h-px bg-slate-700"></span>
        </div>
        
        <Button variant="secondary" fullWidth className="mt-6 gap-2">
          <QrCode size={20} />
          Scan QR Code
        </Button>
      </motion.div>
    </motion.div>
  );
};
