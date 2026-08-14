import React, { useState } from 'react';
import { 
  Palette, Image as ImageIcon, Globe, 
  Save, Layout, Smartphone, FileText, CheckCircle2,
  Upload, X
} from 'lucide-react';

interface ThemeConfig {
  primaryColor: string;
  secondaryColor: string;
  logoUrl: string | null;
  cname: string;
  receiptFooter: string;
  emailHeader: string;
}

const DEFAULT_THEME: ThemeConfig = {
  primaryColor: '#0ea5e9',
  secondaryColor: '#3b82f6',
  logoUrl: null,
  cname: 'photos.myresort.com',
  receiptFooter: 'Thank you for your visit!',
  emailHeader: 'Your memories from your stay',
};

type PreviewMode = 'gallery' | 'kiosk' | 'receipt';

export default function WhiteLabelThemeEditor() {
  const [theme, setTheme] = useState<ThemeConfig>(DEFAULT_THEME);
  const [previewMode, setPreviewMode] = useState<PreviewMode>('gallery');
  const [isSaving, setIsSaving] = useState(false);
  const [showToast, setShowToast] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    // Simulate API call
    await new Promise(r => setTimeout(r, 1000));
    setIsSaving(false);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setTheme(prev => ({ ...prev, logoUrl: url }));
    }
  };

  return (
    <div className="flex h-[calc(100vh-120px)] bg-gray-50/50">
      {/* Toast Notification */}
      {showToast && (
        <div className="fixed bottom-4 right-4 bg-gray-900 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-3 animate-in fade-in slide-in-from-bottom-5 z-50">
          <CheckCircle2 className="w-5 h-5 text-green-400" />
          <span>Branding deployed successfully</span>
          <button onClick={() => setShowToast(false)} className="ml-4 text-gray-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Left Column: Editor Controls */}
      <div className="w-[450px] bg-white border-r border-gray-200 overflow-y-auto flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">White-Label Branding</h2>
          <p className="text-sm text-gray-500 mt-1">Customize your resort's photo platform experience.</p>
        </div>

        <div className="flex-1 p-6 space-y-8">
          {/* Logo Section */}
          <section>
            <h3 className="text-sm font-medium text-gray-900 flex items-center gap-2 mb-4">
              <ImageIcon className="w-4 h-4 text-gray-500" />
              Resort Logo
            </h3>
            <div className="mt-2 flex justify-center rounded-lg border border-dashed border-gray-900/25 px-6 py-10">
              <div className="text-center">
                {theme.logoUrl ? (
                  <div className="relative group">
                    <img src={theme.logoUrl} alt="Resort Logo" className="mx-auto h-16 object-contain" />
                    <button 
                      onClick={() => setTheme(prev => ({ ...prev, logoUrl: null }))}
                      className="absolute -top-2 -right-2 bg-red-100 text-red-600 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <ImageIcon className="mx-auto h-12 w-12 text-gray-300" aria-hidden="true" />
                )}
                <div className="mt-4 flex text-sm leading-6 justify-center text-gray-600">
                  <label htmlFor="file-upload" className="relative cursor-pointer rounded-md bg-white font-semibold text-blue-600 focus-within:outline-none focus-within:ring-2 focus-within:ring-blue-600 focus-within:ring-offset-2 hover:text-blue-500">
                    <span>Upload a file</span>
                    <input id="file-upload" name="file-upload" type="file" className="sr-only" accept="image/*" onChange={handleLogoUpload} />
                  </label>
                  <p className="pl-1">or drag and drop</p>
                </div>
                <p className="text-xs leading-5 text-gray-600 mt-1">PNG, JPG, GIF up to 2MB</p>
              </div>
            </div>
          </section>

          {/* Colors Section */}
          <section>
            <h3 className="text-sm font-medium text-gray-900 flex items-center gap-2 mb-4">
              <Palette className="w-4 h-4 text-gray-500" />
              Brand Colors
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Primary Color</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={theme.primaryColor}
                    onChange={(e) => setTheme(prev => ({ ...prev, primaryColor: e.target.value }))}
                    className="h-9 w-9 rounded border border-gray-200 cursor-pointer"
                  />
                  <input 
                    type="text" 
                    value={theme.primaryColor}
                    onChange={(e) => setTheme(prev => ({ ...prev, primaryColor: e.target.value }))}
                    className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6 uppercase px-3"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Secondary Color</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={theme.secondaryColor}
                    onChange={(e) => setTheme(prev => ({ ...prev, secondaryColor: e.target.value }))}
                    className="h-9 w-9 rounded border border-gray-200 cursor-pointer"
                  />
                  <input 
                    type="text" 
                    value={theme.secondaryColor}
                    onChange={(e) => setTheme(prev => ({ ...prev, secondaryColor: e.target.value }))}
                    className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6 uppercase px-3"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Domain Section */}
          <section>
            <h3 className="text-sm font-medium text-gray-900 flex items-center gap-2 mb-4">
              <Globe className="w-4 h-4 text-gray-500" />
              Custom Domain (CNAME)
            </h3>
            <div className="mt-2">
              <div className="flex rounded-md shadow-sm ring-1 ring-inset ring-gray-300 focus-within:ring-2 focus-within:ring-inset focus-within:ring-blue-600 sm:max-w-md">
                <span className="flex select-none items-center pl-3 text-gray-500 sm:text-sm">https://</span>
                <input
                  type="text"
                  name="cname"
                  id="cname"
                  className="block flex-1 border-0 bg-transparent py-1.5 pl-1 text-gray-900 placeholder:text-gray-400 focus:ring-0 sm:text-sm sm:leading-6"
                  placeholder="photos.myresort.com"
                  value={theme.cname}
                  onChange={(e) => setTheme(prev => ({ ...prev, cname: e.target.value }))}
                />
              </div>
            </div>
          </section>

          {/* Texts Section */}
          <section>
            <h3 className="text-sm font-medium text-gray-900 flex items-center gap-2 mb-4">
              <FileText className="w-4 h-4 text-gray-500" />
              Communications
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Email Header Text</label>
                <input
                  type="text"
                  value={theme.emailHeader}
                  onChange={(e) => setTheme(prev => ({ ...prev, emailHeader: e.target.value }))}
                  className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6 px-3"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Receipt Footer Text</label>
                <textarea
                  rows={3}
                  value={theme.receiptFooter}
                  onChange={(e) => setTheme(prev => ({ ...prev, receiptFooter: e.target.value }))}
                  className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6 px-3"
                />
              </div>
            </div>
          </section>
        </div>

        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full flex items-center justify-center gap-2 rounded-md bg-blue-600 px-3 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Deploying...' : 'Save & Deploy Branding'}
          </button>
        </div>
      </div>

      {/* Right Column: Live Preview */}
      <div className="flex-1 flex flex-col overflow-hidden bg-gray-100">
        <div className="border-b border-gray-200 bg-white p-4 flex justify-between items-center shadow-sm z-10">
          <div className="flex bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setPreviewMode('gallery')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${previewMode === 'gallery' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
            >
              <Layout className="w-4 h-4" />
              Client Gallery Preview
            </button>
            <button
              onClick={() => setPreviewMode('kiosk')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${previewMode === 'kiosk' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
            >
              <Smartphone className="w-4 h-4" />
              Kiosk Preview
            </button>
            <button
              onClick={() => setPreviewMode('receipt')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${previewMode === 'receipt' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
            >
              <FileText className="w-4 h-4" />
              Receipt Preview
            </button>
          </div>
          <div className="text-sm text-gray-500 flex items-center gap-2">
            <Globe className="w-4 h-4" />
            {theme.cname}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-8 flex items-center justify-center relative">
          {/* Decorative background behind preview */}
          <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundColor: theme.primaryColor, backgroundImage: 'radial-gradient(var(--tw-gradient-stops))', '--tw-gradient-from': theme.primaryColor, '--tw-gradient-to': theme.secondaryColor } as any}></div>
          
          {previewMode === 'gallery' && (
            <div className="w-full max-w-4xl bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col h-[600px] border border-gray-200 relative z-10">
              {/* Header */}
              <div className="h-16 px-6 flex items-center justify-between border-b border-gray-100" style={{ backgroundColor: theme.primaryColor }}>
                <div className="flex items-center gap-4">
                  {theme.logoUrl ? (
                    <img src={theme.logoUrl} alt="Logo" className="h-8 object-contain bg-white/10 rounded p-1" />
                  ) : (
                    <div className="text-white font-bold text-xl tracking-tight">RESORT LOGO</div>
                  )}
                </div>
                <div className="flex gap-4 text-white/80 text-sm">
                  <span>Home</span>
                  <span>Galleries</span>
                  <span>Cart</span>
                </div>
              </div>
              {/* Hero */}
              <div className="h-48 flex items-center justify-center relative" style={{ backgroundColor: theme.secondaryColor }}>
                <div className="absolute inset-0 bg-black/20"></div>
                <div className="relative text-center">
                  <h1 className="text-white text-3xl font-bold mb-2">Welcome to your Memories</h1>
                  <p className="text-white/80">Enter your code to access your photos</p>
                </div>
              </div>
              {/* Content */}
              <div className="flex-1 p-8 flex gap-6 bg-gray-50">
                <div className="flex-1 grid grid-cols-3 gap-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="aspect-square bg-gray-200 rounded-lg animate-pulse"></div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {previewMode === 'kiosk' && (
            <div className="w-[400px] h-[700px] bg-white rounded-[3rem] shadow-2xl overflow-hidden border-8 border-gray-900 relative z-10 flex flex-col">
              <div className="h-6 bg-gray-900 w-full rounded-t-2xl flex justify-center items-end pb-1">
                <div className="w-20 h-4 bg-black rounded-b-xl"></div>
              </div>
              <div className="flex-1 flex flex-col bg-gray-50">
                <div className="p-6 text-center pt-12">
                  {theme.logoUrl ? (
                    <img src={theme.logoUrl} alt="Logo" className="h-12 mx-auto mb-6 object-contain" />
                  ) : (
                    <div className="h-12 flex items-center justify-center text-gray-400 mb-6 font-bold text-xl border-2 border-dashed rounded-lg">RESORT LOGO</div>
                  )}
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Scan Your Band</h2>
                  <p className="text-gray-500 text-sm mb-8">Tap your resort wristband below to view your photos.</p>
                  
                  <div className="aspect-square max-w-[200px] mx-auto rounded-full border-4 flex items-center justify-center relative overflow-hidden" style={{ borderColor: theme.primaryColor }}>
                    <div className="absolute inset-0 opacity-20" style={{ backgroundColor: theme.primaryColor }}></div>
                    <Smartphone className="w-16 h-16" style={{ color: theme.primaryColor }} />
                  </div>
                </div>
                <div className="mt-auto p-6">
                  <button className="w-full py-4 rounded-xl text-white font-semibold text-lg transition-transform active:scale-95" style={{ backgroundColor: theme.primaryColor }}>
                    I don't have a band
                  </button>
                </div>
              </div>
            </div>
          )}

          {previewMode === 'receipt' && (
            <div className="w-full max-w-md bg-white rounded-xl shadow-xl overflow-hidden border border-gray-200 relative z-10 flex flex-col font-mono text-sm">
              <div className="p-8 border-b-2 border-dashed border-gray-300">
                <div className="text-center mb-6">
                  {theme.logoUrl ? (
                    <img src={theme.logoUrl} alt="Logo" className="h-12 mx-auto mb-4 object-contain grayscale" />
                  ) : (
                    <div className="text-xl font-bold mb-4 uppercase">Resort Logo</div>
                  )}
                  <div className="text-gray-600">{theme.emailHeader}</div>
                </div>
                
                <div className="space-y-4 mb-6 text-gray-600">
                  <div className="flex justify-between">
                    <span>Order #</span>
                    <span>ORD-8492-XX</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Date</span>
                    <span>{new Date().toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="space-y-2 mb-6">
                  <div className="flex justify-between font-semibold border-b pb-2 text-gray-800">
                    <span>Item</span>
                    <span>Total</span>
                  </div>
                  <div className="flex justify-between text-gray-600 py-1">
                    <span>Digital All-Inclusive</span>
                    <span>$99.00</span>
                  </div>
                  <div className="flex justify-between text-gray-600 py-1">
                    <span>Premium Photobook</span>
                    <span>$149.00</span>
                  </div>
                </div>

                <div className="space-y-1 mb-8 pt-4 border-t border-gray-200 text-gray-800">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>$248.00</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tax</span>
                    <span>$19.84</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg pt-2">
                    <span>Total</span>
                    <span style={{ color: theme.primaryColor }}>$267.84</span>
                  </div>
                </div>

                <div className="text-center text-gray-500 italic mt-8 border-t border-dashed pt-6 border-gray-300">
                  {theme.receiptFooter}
                </div>
              </div>
              <div className="bg-gray-100 p-4 text-center text-xs text-gray-400">
                Powered by ClickFlash Platform
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
