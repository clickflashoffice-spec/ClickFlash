
import React, { useState, useEffect, useMemo } from 'react';
import Card from '../common/Card.tsx';
import { useDebounce } from '../../hooks/useDebounce.ts';

const Section: React.FC<{ title: string; children: React.ReactNode; id: string; }> = ({ title, children, id }) => (
    <div className="documentation-section scroll-mt-24 mb-12 border-b border-slate-200 dark:border-slate-700 pb-8 last:border-0" id={id}>
        <h2 className="text-3xl font-bold mb-6 text-slate-900 dark:text-white flex items-center">
            <span className="text-blue-600 dark:text-blue-400 mr-3">#</span>
            {title}
        </h2>
        <div className="space-y-4 text-slate-700 dark:text-slate-300 leading-relaxed text-lg">
            {children}
        </div>
    </div>
);

const SubSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className="mt-8 mb-4">
        <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-3 border-l-4 border-blue-500 pl-3">{title}</h3>
        <div className="space-y-3">{children}</div>
    </div>
);

const CodeBlock: React.FC<{ title: string; code: string }> = ({ title, code }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(code.trim());
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    return (
        <div className="mt-4 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-sm break-inside-avoid">
            <div className="bg-slate-100 dark:bg-slate-800 px-4 py-2.5 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                <span className="font-bold text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 font-mono">{title}</span>
                <button
                    onClick={handleCopy}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-semibold uppercase hover:bg-blue-100 dark:hover:bg-blue-900/30 px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5"
                    title="Copy to clipboard"
                >
                    {copied ? (
                        <>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            Copied!
                        </>
                    ) : (
                        <>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                            Copy
                        </>
                    )}
                </button>
            </div>
            <pre className="p-4 bg-slate-50 dark:bg-slate-900 overflow-x-auto text-xs font-mono text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                {code.trim()}
            </pre>
        </div>
    );
};

const InfoBox: React.FC<{ type: 'info' | 'warning' | 'tip' | 'security', title: string, children: React.ReactNode }> = ({ type, title, children }) => {
    const styles = {
        info: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200',
        warning: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200',
        tip: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200',
        security: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200'
    };
    const icons = {
        info: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg>,
        warning: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>,
        tip: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812z" clipRule="evenodd" /></svg>,
        security: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M2.166 10.324A.75.75 0 012.148 9.1c.02-.02.042-.04.064-.059l8.25-6.5a.75.75 0 01.939.029l7.5 7.5a.75.75 0 01-1.06 1.06L17.25 10.5V18a.75.75 0 01-.75.75h-4.5a.75.75 0 01-.75-.75v-3a.75.75 0 00-.75-.75h-1.5a.75.75 0 00-.75.75v3a.75.75 0 01-.75.75h-4.5a.75.75 0 01-.75-.75v-7.5a24.356 24.356 0 01-1.528 1.022.75.75 0 01-1.006-.178zM10 2.25l-7 5.5v7.5a.75.75 0 00.75.75h3.75a.75.75 0 00.75-.75v-2.25a2.25 2.25 0 012.25-2.25h1.5a2.25 2.25 0 012.25 2.25v2.25a.75.75 0 00.75.75h3.75a.75.75 0 00.75-.75v-7.5l-7-5.5z" clipRule="evenodd" /><path d="M10 12a2 2 0 100-4 2 2 0 000 4z" /></svg>
    };

    return (
        <div className={`p-4 rounded-lg border flex items-start space-x-3 my-4 ${styles[type]} break-inside-avoid`}>
            <div className="flex-shrink-0 mt-0.5">{icons[type]}</div>
            <div>
                <h4 className="font-bold mb-1 uppercase tracking-wider text-xs">{title}</h4>
                <div className="text-sm opacity-90">{children}</div>
            </div>
        </div>
    );
};

const TOC_ITEMS = [
    { id: 'user-manual-header', label: '📘 USER MANUAL', isHeader: true },
    { id: 'daily-workflow', label: '1. Daily Workflow' },
    { id: 'importing-photos', label: '2. Importing Photos' },
    { id: 'editing-qc', label: '3. Editing & QC' },
    { id: 'sales-orders', label: '4. Sales & Fulfillment' },
    { id: 'kiosk-operations', label: '5. Kiosk (Booth) Ops' },

    { id: 'tech-manual-header', label: '⚙️ OPS MANUAL', isHeader: true },
    { id: 'exec-summary', label: '6. Executive Summary' },
    { id: 'sys-arch', label: '7. System Architecture' },
    { id: 'app-modules', label: '8. Modules & Features' },
    { id: 'tech-mechanisms', label: '9. Technical Mechanisms' },
    { id: 'backend-setup', label: '10. Custom Backend' },
    { id: 'deployment', label: '11. Deployment & Building' },
    { id: 'file-system', label: '12. File System Structure' },
    { id: 'db-schema', label: '13. Data Storage & Schema' },
    { id: 'utility-scripts', label: '14. Utility Scripts' },
    { id: 'installation-structure', label: '15. Installation Structure' },
    { id: 'security', label: '16. Security & Integrity' },
];

const DocumentationPage: React.FC = () => {
    const [activeSection, setActiveSection] = useState(TOC_ITEMS[1].id);
    const [searchTerm, setSearchTerm] = useState('');
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const debouncedSearchTerm = useDebounce(searchTerm, 300);

    useEffect(() => {
        const handleScroll = () => {
            const sections = TOC_ITEMS.filter(i => !i.isHeader).map(item => document.getElementById(item.id));
            const scrollPosition = window.scrollY + 150;

            for (const section of sections) {
                if (section && section.offsetTop <= scrollPosition && (section.offsetTop + section.offsetHeight) > scrollPosition) {
                    setActiveSection(section.id);
                    break;
                }
            }
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const scrollToSection = (id: string) => {
        const element = document.getElementById(id);
        if (element) {
            const offset = 100;
            const elementPosition = element.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - offset;
            window.scrollTo({
                top: offsetPosition,
                behavior: 'smooth'
            });
            setActiveSection(id);
            setIsMobileMenuOpen(false);
        }
    };

    const filteredTOCItems = useMemo(() => {
        if (!debouncedSearchTerm) return TOC_ITEMS;
        const searchLower = debouncedSearchTerm.toLowerCase();
        return TOC_ITEMS.filter(item =>
            !item.isHeader && item.label.toLowerCase().includes(searchLower)
        );
    }, [debouncedSearchTerm]);

    return (
        <div className="flex flex-col md:flex-row gap-8 relative animate-fadeIn pb-8">
            {/* Mobile Menu Overlay */}
            {isMobileMenuOpen && (
                <div
                    className="md:hidden fixed inset-0 bg-black/50 z-30"
                    onClick={() => setIsMobileMenuOpen(false)}
                    aria-hidden="true"
                />
            )}

            {/* Mobile Menu Button */}
            <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden fixed top-4 left-4 z-50 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 shadow-lg hover:shadow-xl transition-all"
                aria-label="Toggle menu"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-slate-600 dark:text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
            </button>

            {/* Sidebar Navigation */}
            <nav className={`${isMobileMenuOpen ? 'block' : 'hidden'} md:block fixed md:relative inset-y-0 left-0 md:inset-auto z-40 md:z-auto w-64 flex-shrink-0 no-print`}>
                <div className="md:sticky md:top-8 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-lg max-h-[calc(100vh-4rem)] overflow-y-auto custom-scrollbar h-full md:h-auto">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-lg px-2 text-slate-900 dark:text-white">Contents</h3>
                        <button
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="md:hidden text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                            aria-label="Close menu"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Search */}
                    <div className="mb-4 relative">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                            </svg>
                        </span>
                        <input
                            type="text"
                            placeholder="Search sections..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                        />
                    </div>

                    <ul className="space-y-1">
                        {(debouncedSearchTerm ? filteredTOCItems : TOC_ITEMS).map(item => {
                            if (item.isHeader) {
                                return (
                                    <li key={item.id} className="pt-4 pb-2 px-2 text-xs font-extrabold text-slate-400 uppercase tracking-wider">
                                        {item.label}
                                    </li>
                                );
                            }
                            return (
                                <li key={item.id}>
                                    <button
                                        onClick={() => scrollToSection(item.id)}
                                        className={`w-full text-left block px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeSection === item.id
                                            ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                                            }`}
                                    >
                                        {item.label}
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                    {debouncedSearchTerm && filteredTOCItems.length === 0 && (
                        <div className="text-center py-8 text-slate-500 dark:text-slate-400 text-sm">
                            No sections found matching "{debouncedSearchTerm}"
                        </div>
                    )}
                    <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
                        <button
                            onClick={() => window.print()}
                            className="w-full bg-slate-900 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 text-white font-bold py-2.5 px-4 rounded-xl flex items-center justify-center space-x-2 text-sm transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                            <span>Print Manual</span>
                        </button>
                    </div>
                </div>
            </nav>

            {/* Main Content */}
            <main className="flex-1 min-w-0 md:ml-0 ml-0">
                <div className="printable-area space-y-8">
                    <div className="mb-8 border-b border-slate-200 dark:border-slate-700 pb-8">
                        <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-slate-900 dark:text-white mb-4">Operations Manual</h1>
                        <div className="flex flex-wrap items-center gap-2 md:gap-4 text-sm text-slate-500 dark:text-slate-400 font-mono">
                            <span>ClickFlash OS v4.0.0 (Enterprise)</span>
                            <span className="hidden md:inline">•</span>
                            <span>Updated: Oct 2025</span>
                        </div>
                    </div>

                    {/* --- USER MANUAL SECTION --- */}

                    <Section title="Daily Workflow" id="daily-workflow">
                        <p className="text-xl font-light text-slate-600 dark:text-slate-300">
                            Your guide to the daily operations of the photography desk.
                        </p>
                        <SubSection title="Start of Shift">
                            <ol className="list-decimal list-inside space-y-2">
                                <li><strong>Launch the App:</strong> Double-click "ClickFlash" on the desktop.</li>
                                <li><strong>Login:</strong> Enter your email and password. Ensure you select the correct role (Photographer/Team Leader).</li>
                                <li><strong>Check Kiosks:</strong> Go to <code>Settings &gt; Kiosks</code>. Ensure all tablets show a green "Connected" status.</li>
                                <li><strong>Set Targets:</strong> Go to <code>Photographers</code>, find your profile, and set your Daily Objective if needed.</li>
                            </ol>
                        </SubSection>
                        <SubSection title="End of Shift">
                            <ol className="list-decimal list-inside space-y-2">
                                <li><strong>Sync Data:</strong> If internet is available, go to <code>Settings &gt; Cloud Sync</code> and perform a manual sync.</li>
                                <li><strong>Review Orders:</strong> Ensure all "Pending" orders are processed or handed over.</li>
                                <li><strong>Logout:</strong> Click your avatar in the sidebar and select "Switch User" or close the application.</li>
                            </ol>
                        </SubSection>
                    </Section>

                    <Section title="Importing Photos" id="importing-photos">
                        <SubSection title="Importing from SD Card">
                            <ol className="list-decimal list-inside space-y-2">
                                <li>Click <strong>Albums</strong> in the sidebar.</li>
                                <li>Click the <strong>Import New</strong> button (top right).</li>
                                <li><strong>Step 1:</strong> Select the Photographer who shot the session. Enable <em>AI Smart Culling</em> to automatically skip blurry photos.</li>
                                <li><strong>Step 2:</strong> Select "Local Device" and browse to your SD card folder (e.g., <code>DCIM/100CANON</code>).</li>
                                <li><strong>Step 3:</strong> Review the photos. Uncheck any you don't want to import.</li>
                                <li><strong>Step 4:</strong> Enter the Album Title (e.g., "Sunset Family") and Room Number.</li>
                                <li>Click <strong>Complete Import</strong>. The album is now in the "Queue".</li>
                            </ol>
                        </SubSection>
                    </Section>

                    <Section title="Editing & QC" id="editing-qc">
                        <p>Before customers can see photos on the Kiosk, they must be processed and finalized.</p>
                        <SubSection title="The Editor Interface">
                            <ul className="list-disc list-inside space-y-2">
                                <li><strong>Navigation:</strong> Use Left/Right arrow keys to move between photos.</li>
                                <li><strong>Selection:</strong> Click photos in the filmstrip to select them for batch editing.</li>
                                <li><strong>Zoom/Pan:</strong> Scroll to zoom. Click and drag to pan around the image.</li>
                            </ul>
                        </SubSection>
                        <SubSection title="AI Tools">
                            <ul className="list-disc list-inside space-y-2">
                                <li><strong>Auto Adjust:</strong> Fixes exposure and contrast automatically.</li>
                                <li><strong>AI Generative Edit:</strong> Select a photo, type a prompt (e.g., "Remove the person in the background"), and click Apply. <em>Requires Internet.</em></li>
                            </ul>
                        </SubSection>
                        <SubSection title="Finalizing">
                            <p>Once edits are complete, click <strong>Finalize & Send to Kiosk</strong> in the sidebar. This moves the album from "Queue" to "Live" and makes it visible on tablets.</p>
                        </SubSection>
                    </Section>

                    <Section title="Sales & Fulfillment" id="sales-orders">
                        <SubSection title="Processing Kiosk Orders">
                            <p>When a customer places an order on a Kiosk:</p>
                            <ol className="list-decimal list-inside space-y-2">
                                <li>A notification toast will appear on the Master Portal.</li>
                                <li>Go to <strong>Orders</strong>. New orders are marked "Pending".</li>
                                <li>Open the order to view items.</li>
                                <li>Click <strong>Lab Folder</strong> to open the printing interface.</li>
                            </ol>
                        </SubSection>
                        <SubSection title="Lab Print Workflow">
                            <ol className="list-decimal list-inside space-y-2">
                                <li>In the <strong>Lab Folder</strong>, you will see all photos to be printed.</li>
                                <li>Click <strong>Print Photo</strong> on each item to send it to the thermal printer.</li>
                                <li>Once printed, the item is marked green.</li>
                                <li>When all items are done, click <strong>Mark Completed</strong>.</li>
                            </ol>
                        </SubSection>
                    </Section>

                    <Section title="Kiosk (Booth) Operations" id="kiosk-operations">
                        <p className="mb-4 text-lg">The Touch Kiosk (often referred to as the "Booth App") is the primary interface for your guests. Version 4.0 introduces powerful AI and biometric features to enhance user experience and security.</p>

                        <SubSection title="AI Face Search">
                            <p>The Kiosk now supports local biometric identification. This allows guests to find their photos instantly without typing a room number.</p>
                            <ul className="list-disc list-inside space-y-2 mt-2">
                                <li><strong>How it works:</strong> The guest taps "Find Me (AI)" and positions their face in the camera frame. The system generates a secure facial descriptor locally in the browser using machine learning.</li>
                                <li><strong>Privacy:</strong> No facial images are sent to the cloud for search; matching happens securely against the locally synced database on the Master Portal.</li>
                                <li><strong>Configuration:</strong> Enable/Disable this feature globally in <code>Settings &gt; Global Feature Settings</code> or locally on the Kiosk via the Admin menu (tap the lock icon).</li>
                            </ul>
                        </SubSection>

                        <SubSection title="RFID Tap-to-Login">
                            <p>Seamless login using existing hotel wristbands or keycards.</p>
                            <ul className="list-disc list-inside space-y-2 mt-2">
                                <li><strong>Hardware:</strong> Requires a standard USB RFID reader connected to the tablet/Kiosk via OTG or USB hub.</li>
                                <li><strong>Mapping:</strong> The system maps the RFID UID to the Guest's Room Number or User Profile in the database.</li>
                                <li><strong>Flow:</strong> Guest taps wristband → Instant Login → Shows their specific gallery.</li>
                            </ul>
                        </SubSection>

                        <SubSection title="Attract Mode (Screensaver)">
                            <p>To prevent screen burn-in and attract passersby, the Kiosk enters Attract Mode after a configurable period of inactivity.</p>
                            <ul className="list-disc list-inside space-y-2 mt-2">
                                <li><strong>Default Timeout:</strong> 60 seconds.</li>
                                <li><strong>Customization:</strong> Change the timeout duration and the background loop in Kiosk Settings (Admin Access).</li>
                                <li><strong>Wake:</strong> A simple touch anywhere on the screen wakes the device and returns to the Welcome Screen.</li>
                            </ul>
                        </SubSection>

                        <SubSection title="Offline Reliability">
                            <p>The Kiosk app uses advanced caching to ensure functionality even during network interruptions.</p>
                            <ul className="list-disc list-inside space-y-2 mt-2">
                                <li><strong>Network Drop:</strong> If the Wi-Fi connection to the Master Portal drops, the Kiosk queues all orders locally in its internal database.</li>
                                <li><strong>Auto-Sync:</strong> Once connectivity is restored, queued orders are automatically pushed to the Master Portal via the Service Worker bridge.</li>
                                <li><strong>Status:</strong> The connection indicator (bottom left) turns Yellow/Red when offline and Green when connected.</li>
                            </ul>
                        </SubSection>
                    </Section>

                    {/* --- OPERATIONS MANUAL SECTION --- */}

                    <Section title="Executive Summary" id="exec-summary">
                        <p>Star Master OS is a distributed, offline-first photography management suite designed for high-volume resort and event photography operations. It solves the critical challenge of operating in environments with unstable or expensive internet connectivity by decentralizing the database and server logic.</p>
                        <p className="mt-2">The system allows photographers to ingest, edit, and sell photos completely offline via a local network. Synchronization with the cloud is performed manually when connectivity is available, ensuring data integrity and operational continuity.</p>
                    </Section>

                    <Section title="System Architecture" id="sys-arch">
                        <p>The ecosystem is composed of four distinct applications (Portals) running from a single codebase but serving different roles.</p>
                        <SubSection title="Local / Offline Zone">
                            <ul className="list-disc list-inside space-y-2">
                                <li><strong>Master Portal (Electron/Node):</strong> The local server and primary workstation. Hosts the Custom Node.js Backend on port 8090 and the UI on port 8000.</li>
                                <li><strong>Touch Kiosk (Web Client):</strong> Connects to Master Portal via Local Wi-Fi (LAN). Uses Service Workers for real-time message brokering.</li>
                            </ul>
                        </SubSection>
                        <SubSection title="Cloud / Online Zone">
                            <ul className="list-disc list-inside space-y-2">
                                <li><strong>Management Portal (Web):</strong> Global HQ dashboard. Connects to a central remote PocketBase instance. Aggregates data from multiple Master Portals.</li>
                                <li><strong>Customer Portal (Web):</strong> Public gallery for guests. Allows downloading purchased digital assets via secure links.</li>
                            </ul>
                        </SubSection>
                    </Section>

                    <Section title="Application Modules & Features" id="app-modules">
                        <SubSection title="A. Master Portal (The Core)">
                            <p className="mb-2">The operational hub run by photographers. It is optimized for speed and offline reliability.</p>
                            <ul className="list-disc list-inside space-y-1">
                                <li><strong>Smart Ingest:</strong> Imports photos from SD cards or simulated folders. Reads file metadata.</li>
                                <li><strong>AI Auto-Tagging:</strong> (Online Feature) Uses Google Gemini API to analyze sample photos and suggest creative Album Titles and Categories (e.g., "Sunset Beach Family").</li>
                                <li><strong>Photo Editor:</strong> A non-destructive editor using CSS filters and Canvas. Supports Exposure, Contrast, Saturation, Crop, Rotation, and Filters. Includes AI Generative Edit for removing objects or enhancing lighting.</li>
                                <li><strong>Workflow Pipeline:</strong> Albums move from "Queue" (Draft) to "Live" (Finalized). Finalizing an album broadcasts a WebSocket event to update Kiosks instantly.</li>
                                <li><strong>Point of Sale (POS):</strong> Create orders, apply discounts, manage print products vs digital downloads. Generates printable receipts and lab worksheets.</li>
                                <li><strong>Local Server:</strong> Broadcasts its IP address for Kiosk discovery.</li>
                            </ul>
                        </SubSection>
                        <SubSection title="B. Touch Kiosk (The Experience)">
                            <p className="mb-2">A locked-down, customer-facing tablet interface designed for self-service viewing and ordering.</p>
                            <ul className="list-disc list-inside space-y-1">
                                <li><strong>Attract Mode (Screensaver):</strong> After a configurable timeout (default 60s) of inactivity, plays an animation to prevent burn-in and attract guests.</li>
                                <li><strong>Room Number Search:</strong> Guests enter their room number to filter the gallery instantly.</li>
                                <li><strong>Secure Cart:</strong> Guests build a cart of prints/digitals. Checkout creates a "Pending" order on the Master Portal for fulfillment.</li>
                                <li><strong>Assistance Request:</strong> A "Call for Help" button sends a real-time alert (Toast Notification + Sound) to the Photographer on the Master Portal.</li>
                            </ul>
                        </SubSection>
                        <SubSection title="C. Management Portal (The HQ)">
                            <p className="mb-2">For business owners and managers to oversee operations across multiple hotels/destinations.</p>
                            <ul className="list-disc list-inside space-y-1">
                                <li><strong>Global Dashboard:</strong> Aggregates revenue, profit, and costs from all synced destinations.</li>
                                <li><strong>Payroll Engine:</strong> Calculates photographer pay based on Salary or Commission % (configurable per user). Handles Bonuses and Deductions.</li>
                                <li><strong>Warehouse:</strong> Tracks equipment (Cameras, Lenses) assigned to specific photographers or destinations. Status tracking (In Use, Repair, Storage).</li>
                                <li><strong>Financials:</strong> Detailed Profit & Loss reports, Loan tracking (Capital injections), and Expense management.</li>
                            </ul>
                        </SubSection>
                    </Section>

                    <Section title="Technical Mechanisms" id="tech-mechanisms">
                        <SubSection title="Service Worker Message Bus">
                            <p>The application uses a custom <code>service-worker.js</code> not just for caching, but as a Message Broker. Because standard WebSockets require a dedicated relay server (which might fail offline), the Service Worker acts as the bridge between the Master Tab and Kiosk Tabs/Devices on the same origin.</p>
                            <p className="mt-2"><strong>Flow:</strong> Master sends NEW_ALBUM → Service Worker → Broadcasts to all Client Tabs → Kiosk UI Updates.</p>
                        </SubSection>
                        <SubSection title="Hybrid Sync Engine">
                            <p>Data lives in two states: Local (IndexedDB/SQLite) and Remote (PocketBase Cloud). The <code>CloudSync.tsx</code> component handles the "Merge & Push" logic.</p>
                            <ul className="list-disc list-inside space-y-1">
                                <li><strong>Users/Settings:</strong> Two-way sync (Cloud configuration overrides local).</li>
                                <li><strong>Orders/Albums:</strong> One-way push (Local → Cloud) for reporting.</li>
                                <li><strong>Conflict Resolution:</strong> Server-wins strategy for metadata; Append-only for logs.</li>
                            </ul>
                        </SubSection>
                        <SubSection title="Offline Image Handling">
                            <p>Images are stored as Blobs within IndexedDB (for browser compatibility) and the local file system (via the Custom Backend). The app generates ephemeral <code>blob:</code> URLs for display to ensure memory efficiency and zero network latency during browsing.</p>
                        </SubSection>
                    </Section>

                    <Section title="Custom Backend Setup" id="backend-setup">
                        <SubSection title="Embedded Node.js Server">
                            <p>The application uses a lightweight, custom Node.js server (Port 8090) for local data management, replacing the external PocketBase binary for simplified deployment.</p>
                            <p className="mt-2 font-bold">Architecture:</p>
                            <ul className="list-disc list-inside space-y-2">
                                <li><strong>Script:</strong> <code>backend/server.js</code></li>
                                <li><strong>Database:</strong> JSON-based storage (<code>data.json</code>) for zero-configuration persistence.</li>
                                <li><strong>High-Res Storage:</strong> Uploads are streamed to <code>pb_data/uploads</code> folder.</li>
                                <li><strong>Process:</strong> Automatically spawned by the Electron Main process using <code>child_process.fork()</code>.</li>
                            </ul>
                            <p className="mt-2">This setup removes the need to download or manage external <code>.exe</code> files manually during development or deployment.</p>
                        </SubSection>

                        <SubSection title="Atomic Write Strategy">
                            <p>To prevent data corruption during unexpected power loss (a common scenario in kiosks), the backend implements an atomic write strategy for the JSON database.</p>
                            <ol className="list-decimal list-inside space-y-2 mt-2 text-sm">
                                <li><strong>Write to Temp:</strong> Data is first written to a temporary file (e.g., <code>data.json.tmp</code>).</li>
                                <li><strong>Flush:</strong> The file buffer is flushed to disk to ensure the write is complete.</li>
                                <li><strong>Rename:</strong> The temporary file is atomically renamed to the target file (<code>data.json</code>). This operation is atomic on POSIX and modern Windows file systems.</li>
                                <li><strong>Retry Logic:</strong> If a file lock is encountered (e.g., anti-virus scanning), the system retries the write up to 3 times with exponential backoff.</li>
                            </ol>
                        </SubSection>

                        <SubSection title="API Reference">
                            <p>The custom server exposes a REST-like API compatible with the application's data layer.</p>
                            <div className="overflow-x-auto mt-4">
                                <table className="w-full text-sm text-left text-slate-600 dark:text-slate-300">
                                    <thead className="bg-slate-100 dark:bg-slate-700">
                                        <tr>
                                            <th className="px-4 py-2">Method</th>
                                            <th className="px-4 py-2">Endpoint</th>
                                            <th className="px-4 py-2">Description</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                        <tr>
                                            <td className="px-4 py-2 font-bold text-green-600">GET</td>
                                            <td className="px-4 py-2 font-mono">/api/health</td>
                                            <td className="px-4 py-2">Server status check.</td>
                                        </tr>
                                        <tr>
                                            <td className="px-4 py-2 font-bold text-green-600">GET</td>
                                            <td className="px-4 py-2 font-mono">/api/collections/:name/records</td>
                                            <td className="px-4 py-2">Fetch records. Supports <code>sort</code>, <code>filter</code>, <code>expand</code>.</td>
                                        </tr>
                                        <tr>
                                            <td className="px-4 py-2 font-bold text-blue-600">POST</td>
                                            <td className="px-4 py-2 font-mono">/api/collections/:name/records</td>
                                            <td className="px-4 py-2">Create record. Supports <code>application/json</code> or <code>multipart/form-data</code>.</td>
                                        </tr>
                                        <tr>
                                            <td className="px-4 py-2 font-bold text-green-600">GET</td>
                                            <td className="px-4 py-2 font-mono">/api/files/:collection/:id/:file</td>
                                            <td className="px-4 py-2">Serve static image files from disk.</td>
                                        </tr>
                                        <tr>
                                            <td className="px-4 py-2 font-bold text-green-600">GET</td>
                                            <td className="px-4 py-2 font-mono">/api/realtime</td>
                                            <td className="px-4 py-2">Server-Sent Events (SSE) stream for live updates.</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </SubSection>
                    </Section>

                    <Section title="Deployment & Building" id="deployment">
                        <p>This guide details how to package the source code into a distributable Windows installer (.exe) for deployment to Master PCs.</p>
                        <SubSection title="Prerequisites">
                            <ul className="list-disc list-inside space-y-1">
                                <li>Node.js (v18 or higher) installed on the development machine.</li>
                                <li>NPM (Node Package Manager).</li>
                                <li>A valid <code>icon.ico</code> file in the project root directory (required for Windows build).</li>
                            </ul>
                        </SubSection>
                        <SubSection title="Build Command">
                            <p className="mb-2">To generate the production installer, open your terminal in the project root directory and run the following commands:</p>
                            <CodeBlock title="Build" code={`npm install
npm run dist`} />
                            <p className="mt-2">This command uses Electron Builder to compile the React code, bundle the Node.js backend, and package everything into a single NSIS executable installer.</p>
                        </SubSection>
                        <SubSection title="Output Files">
                            <p>After the build process completes (typically 1-2 minutes), the installer will be generated in the <code>dist/</code> folder.</p>
                        </SubSection>
                    </Section>

                    <Section title="File System Structure" id="file-system">
                        <p className="mb-2">Understanding where files are stored is crucial for backups and troubleshooting.</p>
                        <ul className="list-disc list-inside space-y-1">
                            <li><strong>Application Root:</strong> <code>%LocalAppData%\Programs\star-master-os\</code> - Contains the executable and resources.</li>
                            <li><strong>Database Storage:</strong> <code>%AppData%\Star Master OS\pb_data\</code> - Contains the <code>data.db</code> database and <code>uploads/</code> folder (where all imported photos are stored). Backup this folder regularly.</li>
                            <li><strong>Logs:</strong> <code>%AppData%\Star Master OS\logs\</code> - Application logs for debugging errors.</li>
                        </ul>
                    </Section>

                    <Section title="Data Storage & Schema" id="db-schema">
                        <p className="mb-2">The current implementation uses a file-based JSON database for zero-dependency deployment. The schema is defined implicitly in <code>backend/server.js</code> and stored in <code>pb_data/data.json</code>.</p>
                        <p className="font-bold mt-4">Key Collections (JSON Keys):</p>
                        <ul className="list-disc list-inside space-y-2 mt-2">
                            <li><strong>albums:</strong> Metadata for photo sessions (Title, Room, Date).</li>
                            <li><strong>photos:</strong> Image metadata linked to albums.</li>
                            <li><strong>orders:</strong> Customer order details and status.</li>
                            <li><strong>users:</strong> Staff profiles and roles.</li>
                        </ul>
                    </Section>

                    <Section title="Utility Scripts" id="utility-scripts">
                        <p>Use these scripts to automate common tasks like starting the server or building the installer. Copy the code below and save it to a file in your project root.</p>

                        <SubSection title="1. start_server.bat (Run App)">
                            <CodeBlock
                                title="start_server.bat"
                                code={`@echo off
title ClickFlash OS Server
echo Starting ClickFlash OS...
echo.
echo Ensuring dependencies are installed...
call npm install
echo.
echo Launching Application...
npm start
pause`}
                            />
                        </SubSection>

                        <SubSection title="2. update_system.bat (Pull & Rebuild)">
                            <CodeBlock
                                title="update_system.bat"
                                code={`@echo off
echo Updating ClickFlash OS...
git pull origin main
echo Installing new dependencies...
npm install
echo Building optimized assets...
npm run build
echo Update Complete.
pause`}
                            />
                        </SubSection>

                        <SubSection title="3. install_service.ps1 (Windows Service)">
                            <CodeBlock
                                title="install_service.ps1"
                                code={`# Run as Administrator to install backend as a service
$serviceName = "ClickFlashBackend"
$nodePath = "C:\\Program Files\\nodejs\\node.exe"
$scriptPath = "$PSScriptRoot\\backend\\server.js"

New-Service -Name $serviceName -BinaryPathName "$nodePath $scriptPath" -DisplayName "ClickFlash Backend" -StartupType Automatic
Start-Service $serviceName
Write-Host "Service Installed and Started."`}
                            />
                        </SubSection>
                    </Section>

                    <Section title="Installation Structure" id="installation-structure">
                        <p className="mb-2">Whether deploying via the installer or setting up a portable version, maintaining the correct folder structure is critical for the offline database engine to launch correctly.</p>
                        <SubSection title="Required Directory Layout">
                            <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded border border-slate-200 dark:border-slate-700 font-mono text-sm">
                                <div>📁 Installation Root/</div>
                                <div className="pl-4">📄 ClickFlash.exe &nbsp; <span className="text-slate-500">// Main Launcher</span></div>
                                <div className="pl-4">📁 resources/ &nbsp; <span className="text-slate-500">// Electron Resources</span></div>
                                <div className="pl-8">📁 backend/</div>
                                <div className="pl-12">📄 server.js &nbsp; <span className="text-red-500 dark:text-red-400 font-bold">&lt;-- Critical Engine File</span></div>
                                <div className="pl-4">📁 locales/</div>
                                <div className="pl-4">📄 uninstall.exe</div>
                            </div>
                        </SubSection>
                        <SubSection title="Data Persistence Location">
                            <InfoBox type="warning" title="Data Persistence">
                                The application logic lives in the Program Files folders above, but your Photos and Database are stored separately in the User Profile to ensure they survive software updates.
                                <br /><br />
                                <strong>Windows Location:</strong> %AppData%\ClickFlash\pb_data\
                                <br />
                                <strong>Backup Strategy:</strong> To backup the system, you only need to copy the <code>pb_data</code> folder from AppData.
                            </InfoBox>
                        </SubSection>
                    </Section>

                    <Section title="Security & Integrity" id="security">
                        <p>Security in an offline environment focuses on access control and data integrity rather than encryption in transit (since it's local). However, several mechanisms are in place.</p>

                        <SubSection title="Directory Traversal Protection">
                            <p>The static file server at <code>/api/files</code> includes checks to prevent accessing files outside the dedicated <code>uploads</code> directory.</p>
                            <CodeBlock title="Security Logic (server.js)" code={`// Block attempts to use ".." or absolute paths
if (filename.includes('..') || filename.includes('/') || filename.includes('\\\\')) {
    res.writeHead(400);
    res.end('Invalid filename security violation');
    return;
}`} />
                        </SubSection>

                        <SubSection title="Extension Whitelisting">
                            <p>When uploading files, the server validates the file extension against a strict allowlist to prevent the execution of malicious scripts (e.g., uploading a .exe or .php file masked as an image).</p>
                            <ul className="list-disc list-inside text-sm text-slate-600 dark:text-slate-300 mt-2">
                                <li>Allowed: .jpg, .jpeg, .png, .gif, .webp</li>
                                <li>Blocked: Everything else.</li>
                            </ul>
                        </SubSection>

                        <SubSection title="CORS Policy">
                            <p>The local server implements restrictive Cross-Origin Resource Sharing (CORS) headers. While currently set to allow all origins (<code>*</code>) for ease of local network discovery (e.g., Kiosks on dynamic IPs), it can be tightened in <code>backend/server.js</code> for high-security environments.</p>
                        </SubSection>
                    </Section>
                </div>
            </main>
        </div>
    );
};

export default DocumentationPage;
