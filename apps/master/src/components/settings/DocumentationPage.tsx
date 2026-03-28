
import React, { useState, useEffect, useMemo } from 'react';

import { DEFAULT_MASTER_PORT } from '../../constants';
import { useDebounce } from '../../hooks/useDebounce.ts';

const Section: React.FC<{ title: string; children: React.ReactNode; id: string; }> = ({ title, children, id }) => (
    <div className="documentation-section scroll-mt-32 mb-16 border-b border-slate-200/60 dark:border-slate-800/60 pb-12 last:border-0" id={id}>
        <h2 className="text-3xl font-bold mb-8 text-slate-900 dark:text-white flex items-center group relative tracking-tight">
            <a href={`#${id}`} className="absolute -left-8 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity text-xl font-normal hover:text-blue-500">#</a>
            {title}
        </h2>
        <div className="space-y-6 text-slate-700 dark:text-slate-300 leading-relaxed text-base debug-content">
            {children}
        </div>
    </div>
);

const SubSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className="mt-10 mb-6">
        <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-200 mb-4 flex items-center tracking-tight">
            {title}
        </h3>
        <div className="space-y-4 text-slate-600 dark:text-slate-400">{children}</div>
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
        <div className="my-4 rounded-lg overflow-hidden shadow-lg border border-slate-300 dark:border-slate-600 bg-gradient-to-br from-slate-900 to-slate-800 break-inside-avoid">
            <div className="bg-slate-800/80 backdrop-blur-sm px-4 py-2 flex justify-between items-center border-b border-slate-700/50">
                <span className="font-mono text-xs text-slate-400 font-medium">{title}</span>
                <button
                    type="button"
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleCopy();
                    }}
                    className="text-xs text-slate-400 hover:text-blue-400 transition-colors flex items-center gap-1.5 px-2 py-1 rounded hover:bg-slate-700/50 cursor-pointer"
                    aria-label="Copy code to clipboard"
                >
                    {copied ? (
                        <>
                            <svg className="w-3.5 h-3.5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            <span className="text-green-400">Copied!</span>
                        </>
                    ) : (
                        <>
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                            Copy
                        </>
                    )}
                </button>
            </div>
            <pre className="p-4 overflow-x-auto text-xs font-mono text-slate-200 leading-relaxed">
                <code>{code.trim()}</code>
            </pre>
        </div>
    );
};

const InfoBox: React.FC<{ type: 'info' | 'warning' | 'tip' | 'security', title: string, children: React.ReactNode }> = ({ type, title, children }) => {
    const styles = {
        info: 'bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20 text-blue-800 dark:text-blue-200',
        warning: 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20 text-amber-800 dark:text-amber-200',
        tip: 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20 text-emerald-800 dark:text-emerald-200',
        security: 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20 text-red-800 dark:text-red-200'
    };
    const icons = {
        info: 'ℹ️', warning: '⚠️', tip: '💡', security: '🛡️'
    };

    return (
        <div className={`p-4 rounded-lg border-2 flex items-start space-x-3 my-4 ${styles[type]} break-inside-avoid shadow-md backdrop-blur-sm`}>
            <div className="flex-shrink-0 text-lg mt-0.5 filter drop-shadow-sm">{icons[type]}</div>
            <div className="flex-1">
                <h4 className="font-bold mb-2 uppercase tracking-wider text-xs opacity-95">{title}</h4>
                <div className="text-xs leading-relaxed opacity-95">{children}</div>
            </div>
        </div>
    );
};

const TOC_ITEMS = [
    { id: 'user-manual-header', label: 'User Manual', isHeader: true },
    { id: 'daily-workflow', label: 'Daily Workflow' },
    { id: 'importing-photos', label: 'Importing Photos' },
    { id: 'editing-qc', label: 'Editing & QC' },
    { id: 'sales-orders', label: 'Sales & Fulfillment' },
    { id: 'kiosk-operations', label: 'Kiosk App' }, // Shortened for cleaner sidebar

    { id: 'tech-manual-header', label: 'Technical Ref', isHeader: true },
    { id: 'operational-laws', label: 'Operational Laws' },
    { id: 'exec-summary', label: 'Executive Summary' },
    { id: 'sys-arch', label: 'System Architecture' },
    { id: 'data-flow-rules', label: 'Data Flow Rules' },
    { id: 'app-modules', label: 'Modules & Features' },
    { id: 'tech-mechanisms', label: 'Core Mechanisms' },
    { id: 'backend-setup', label: 'Custom Backend' },
    { id: 'deployment', label: 'Deployment & Kiosk' },
    { id: 'file-system', label: 'File Structure' },
    { id: 'db-schema', label: 'Data Schema' },
    { id: 'utility-scripts', label: 'Utility Scripts' },
    { id: 'installation-structure', label: 'Install Structure' },
    { id: 'security', label: 'Security' },
];

const DocumentationPage: React.FC = () => {
    const [activeSection, setActiveSection] = useState(TOC_ITEMS[1].id);
    const [searchTerm, setSearchTerm] = useState('');
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const debouncedSearchTerm = useDebounce(searchTerm, 300);

    useEffect(() => {
        const handleScroll = () => {
            const sections = TOC_ITEMS.filter(i => !i.isHeader).map(item => document.getElementById(item.id));
            const scrollPosition = window.scrollY + 150; // Adjusted to match scroll-mt-20 (80px) + buffer

            for (const section of sections) {
                if (section && section.offsetTop <= scrollPosition && (section.offsetTop + section.offsetHeight) > scrollPosition) {
                    setActiveSection(section.id);
                    break;
                }
            }
        };

        // Initial check
        handleScroll();

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const scrollToSection = (id: string) => {
        const element = document.getElementById(id);
        if (!element) return;

        // scrollIntoView automatically respects scroll-mt-20 (scroll-margin-top)
        // Add small offset for additional header spacing
        const additionalOffset = 20;
        const elementTop = element.getBoundingClientRect().top + window.pageYOffset;
        const offsetPosition = Math.max(0, elementTop - additionalOffset);

        window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
        });

        setActiveSection(id);
        setIsMobileMenuOpen(false);
    };

    const filteredTOCItems = useMemo(() => {
        if (!debouncedSearchTerm) return TOC_ITEMS;
        const searchLower = debouncedSearchTerm.toLowerCase();
        return TOC_ITEMS.filter(item =>
            !item.isHeader && item.label.toLowerCase().includes(searchLower)
        );
    }, [debouncedSearchTerm]);

    return (
        <div className="flex flex-col lg:flex-row relative animate-fadeIn min-h-screen bg-slate-50 dark:bg-[#0f1117]"> {/* Cleaner background */}
            {/* Mobile Menu Overlay */}
            {isMobileMenuOpen && (
                <div
                    className="lg:hidden fixed inset-0 bg-black/60 z-40 backdrop-blur-sm"
                    onClick={() => setIsMobileMenuOpen(false)}
                    aria-hidden="true"
                />
            )}

            {/* Mobile Menu Button */}
            <button
                type="button"
                onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsMobileMenuOpen(!isMobileMenuOpen);
                }}
                className="lg:hidden fixed bottom-6 right-6 z-50 bg-blue-600 text-white rounded-full p-4 shadow-xl hover:bg-blue-700 transition-all cursor-pointer"
                aria-label="Toggle menu"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
            </button>

            {/* Sidebar Navigation */}
            <nav className={`
                ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
                lg:translate-x-0 fixed lg:sticky top-0 lg:top-14 left-0 h-screen lg:h-[calc(100vh-3.5rem)]
                w-64 bg-slate-50/80 dark:bg-[#0f1117]/80 backdrop-blur-md z-50 lg:z-auto
                border-r border-slate-200 dark:border-slate-800
                transition-transform duration-300 ease-in-out flex-shrink-0 no-print
            `}>
                <div className="h-full overflow-y-auto custom-scrollbar p-5 lg:p-4">
                    <div className="mb-6">
                        <div className="relative group">
                            <input
                                type="text"
                                placeholder="Search docs..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-slate-900 dark:text-white placeholder-slate-500 shadow-sm"
                            />
                            <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-3 top-3 h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                    </div>

                    <ul className="space-y-1">
                        {(debouncedSearchTerm ? filteredTOCItems : TOC_ITEMS).map((item) => {
                            if (item.isHeader) {
                                return (
                                    <li key={item.id} className={`text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3 mt-6 first:mt-0 px-2`}>
                                        {item.label}
                                    </li>
                                );
                            }
                            return (
                                <li key={item.id}>
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            scrollToSection(item.id);
                                        }}
                                        className={`w-full text-left block px-3 py-1.5 rounded-md text-sm transition-all duration-200 relative cursor-pointer ${activeSection === item.id
                                            ? 'text-blue-600 dark:text-blue-400 font-medium bg-blue-50 dark:bg-blue-500/10'
                                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                                            }`}
                                        aria-label={`Navigate to ${item.label}`}
                                    >
                                        <span className="relative">{item.label}</span>
                                    </button>
                                </li>
                            );
                        })}
                    </ul>

                    <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800">
                        <button
                            type="button"
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                window.print();
                            }}
                            className="w-full py-2.5 px-4 rounded-xl border-2 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-semibold text-xs hover:bg-gradient-to-r hover:from-slate-100 hover:to-slate-50 dark:hover:from-slate-800 dark:hover:to-slate-700 transition-all flex items-center justify-center gap-2 shadow-sm hover:shadow-md cursor-pointer"
                            aria-label="Print documentation"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                            </svg>
                            Print Manual
                        </button>
                    </div>
                </div>
            </nav>

            {/* Main Content */}
            {/* Main Content */}
            <main className="flex-1 min-w-0 py-12 px-8 lg:px-16 mx-auto max-w-[1200px]">
                <div className="printable-area">
                    <div className="mb-16 border-b border-slate-200 dark:border-slate-800 pb-10">
                        <div className="flex items-center gap-3 mb-6">
                            <span className="px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 text-[10px] font-bold uppercase tracking-wide border border-blue-200 dark:border-blue-500/30">
                                v4.1.0 Enterprise
                            </span>
                            <span className="text-slate-500 dark:text-slate-400 text-xs">Last updated: December 2025</span>
                        </div>
                        <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-6">
                            Operations Manual
                        </h1>
                        <p className="text-lg text-slate-600 dark:text-slate-400 leading-relaxed max-w-2xl font-light">
                            Comprehensive guide for Star Master OS deployment, daily operations, and technical maintenance.
                        </p>
                    </div>

                    {/* --- USER MANUAL SECTION --- */}

                    <Section title="Daily Workflow" id="daily-workflow">
                        <p className="text-sm font-light text-slate-600 dark:text-slate-300 mb-4">Your comprehensive guide to the daily operations of the photography desk. Follow these workflows to ensure smooth operations throughout your shift.</p>

                        <InfoBox type="tip" title="Pro Tip">
                            Bookmark this section for quick reference. Consider printing this page and keeping it at your workstation for easy access during busy periods.
                        </InfoBox>

                        <SubSection title="Start of Shift">
                            <p className="mb-4">Begin each workday with these essential checks to ensure everything is ready for operations:</p>
                            <ol className="list-decimal list-inside space-y-2.5 ml-2">
                                <li className="pl-2"><strong className="text-blue-600 dark:text-blue-400">Launch the App:</strong> Double-click "Star Master OS" on the desktop. Wait for the application to fully load (the backend server starts automatically).</li>
                                <li className="pl-2"><strong className="text-blue-600 dark:text-blue-400">Login:</strong> Enter your email and password. Ensure you select the correct role (Photographer/Team Leader) as this determines your access permissions.</li>
                                <li className="pl-2"><strong className="text-blue-600 dark:text-blue-400">Check Kiosks:</strong> Go to <code className="bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded text-xs font-mono">Settings &gt; Devices &gt; Kiosks</code>. Ensure all tablets show a green "Connected" status. If any show as disconnected, verify the Wi-Fi network and that the Kiosk app is running on the tablet.</li>
                                <li className="pl-2"><strong className="text-blue-600 dark:text-blue-400">Set Targets:</strong> Go to <code className="bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded text-xs font-mono">Photographers</code>, find your profile, and set your Daily Objective if needed. This helps track your productivity throughout the day.</li>
                                <li className="pl-2"><strong className="text-blue-600 dark:text-blue-400">Verify System Status:</strong> Check <code className="bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded text-xs font-mono">Settings &gt; System Status</code> to ensure the database is healthy and the backend server is running properly.</li>
                            </ol>
                        </SubSection>

                        <SubSection title="During Shift">
                            <p className="mb-4">Regular maintenance tasks to keep operations running smoothly:</p>
                            <ul className="list-disc list-inside space-y-2 ml-2">
                                <li className="pl-2"><strong className="text-indigo-600 dark:text-indigo-400">Monitor Orders:</strong> Regularly check the <strong>Orders</strong> section for new "Pending" orders from Kiosks and process them promptly.</li>
                                <li className="pl-2"><strong className="text-indigo-600 dark:text-indigo-400">Queue Management:</strong> Keep an eye on albums in the "Queue" status. Finalize and send to Kiosks as soon as editing is complete.</li>
                                <li className="pl-2"><strong className="text-indigo-600 dark:text-indigo-400">Backup Reminder:</strong> Periodically check that photos are being saved correctly. If you notice any issues, contact your system administrator.</li>
                            </ul>
                        </SubSection>

                        <SubSection title="End of Shift">
                            <p className="mb-4">Complete these tasks before logging out to ensure data integrity and smooth handover:</p>
                            <ol className="list-decimal list-inside space-y-3 marker:text-blue-500 marker:font-bold">
                                <li><strong>Sync Data:</strong> If internet is available, go to <code>Settings &gt; Data & Sync &gt; Cloud Sync</code> and perform a manual sync. This uploads your day's work to the cloud for backup and HQ reporting.</li>
                                <li><strong>Review Orders:</strong> Ensure all "Pending" orders are processed or handed over to the next shift. Mark orders as "Completed" once fulfilled.</li>
                                <li><strong>Finalize Queued Albums:</strong> Complete any albums still in "Queue" status or leave notes for the next photographer.</li>
                                <li><strong>Backup Check:</strong> Verify that the system has performed automatic backups (check <code>Settings &gt; Local Backup</code> if available).</li>
                                <li><strong>Logout:</strong> Click your avatar in the sidebar and select "Switch User" or close the application. This ensures your session is properly terminated.</li>
                            </ol>
                        </SubSection>
                    </Section>

                    <Section title="Importing Photos" id="importing-photos">
                        <p className="text-sm font-light text-slate-600 dark:text-slate-300 mb-4">Learn how to efficiently import photos from SD cards, cameras, or local storage into the system for processing and sale.</p>

                        <SubSection title="Importing from SD Card">
                            <p className="mb-4">The most common workflow for importing photos from a camera's SD card:</p>
                            <ol className="list-decimal list-inside space-y-3 marker:text-blue-500 marker:font-bold">
                                <li><strong>Access Albums:</strong> Click <strong>Albums</strong> in the sidebar to open the albums management page.</li>
                                <li><strong>Start Import:</strong> Click the <strong>Import New</strong> button located in the top right corner of the Albums page.</li>
                                <li><strong>Step 1 - Select Photographer:</strong>
                                    <ul className="list-disc list-inside ml-6 mt-2 space-y-1 marker:text-slate-400">
                                        <li>Select the Photographer who shot the session from the dropdown list.</li>
                                        <li><strong>AI Smart Culling:</strong> Enable this option to automatically skip blurry, out-of-focus, or low-quality photos using AI analysis. This saves time during review.</li>
                                        <li>Click <strong>Next</strong> to proceed.</li>
                                    </ul>
                                </li>
                                <li><strong>Step 2 - Select Source:</strong>
                                    <ul className="list-disc list-inside ml-6 mt-2 space-y-1 marker:text-slate-400">
                                        <li>Select "Local Device" as your import source.</li>
                                        <li>Browse to your SD card folder (typically found at <code>DCIM/100CANON</code> for Canon cameras, or <code>DCIM/100NIKON</code> for Nikon).</li>
                                        <li>The system will scan and display all compatible image files.</li>
                                    </ul>
                                </li>
                                <li><strong>Step 3 - Review & Select:</strong>
                                    <ul className="list-disc list-inside ml-6 mt-2 space-y-1 marker:text-slate-400">
                                        <li>Review the thumbnails of all photos found.</li>
                                        <li>Uncheck any photos you don't want to import (duplicates, test shots, etc.).</li>
                                        <li>You can select all/deselect all using the checkbox in the header.</li>
                                    </ul>
                                </li>
                                <li><strong>Step 4 - Album Details:</strong>
                                    <ul className="list-disc list-inside ml-6 mt-2 space-y-1 marker:text-slate-400">
                                        <li>Enter a descriptive <strong>Album Title</strong> (e.g., "Sunset Family Portrait", "Beach Wedding Ceremony").</li>
                                        <li>Enter the <strong>Room Number</strong> or guest identifier associated with the session.</li>
                                        <li>Optionally add notes or tags for later reference.</li>
                                    </ul>
                                </li>
                                <li><strong>Complete:</strong> Click <strong>Complete Import</strong>. The system will copy photos to the local database and the album will appear in the "Queue" for editing.</li>
                            </ol>

                            <InfoBox type="tip" title="Import Tips">
                                <ul className="list-disc list-inside space-y-1 text-sm">
                                    <li>Import speed depends on photo count and file sizes. Large RAW files take longer than JPEGs.</li>
                                    <li>Always verify the SD card is properly inserted and accessible before starting import.</li>
                                    <li>For large batches (500+ photos), consider importing in smaller sessions to avoid timeouts.</li>
                                    <li>Keep the SD card inserted until import is complete to avoid data corruption.</li>
                                </ul>
                            </InfoBox>
                        </SubSection>

                        <SubSection title="Importing from Network or USB Drive">
                            <p className="mb-4">You can also import photos from network shares or USB drives:</p>
                            <ol className="list-decimal list-inside space-y-2 marker:text-blue-500 marker:font-bold">
                                <li>Follow the same steps as SD card import.</li>
                                <li>When selecting source, browse to the network location or USB drive path.</li>
                                <li>The import process is identical, but transfer speed may vary based on connection type.</li>
                            </ol>
                        </SubSection>

                        <SubSection title="Troubleshooting Import Issues">
                            <ul className="list-disc list-inside space-y-2 marker:text-slate-400">
                                <li><strong>Photos not appearing:</strong> Check that file formats are supported (.jpg, .jpeg, .png, .raw). Convert unsupported formats before importing.</li>
                                <li><strong>Slow import speed:</strong> Close other applications, ensure adequate disk space, and check for antivirus interference.</li>
                                <li><strong>Import fails:</strong> Verify SD card is not corrupted, check available disk space in the installation directory, and ensure the backend server is running.</li>
                            </ul>
                        </SubSection>
                    </Section>

                    <Section title="Editing & QC" id="editing-qc">
                        <p className="text-sm font-light text-slate-600 dark:text-slate-300 mb-4">Before customers can see photos on the Kiosk, they must be processed, edited, and finalized. This section covers the complete editing workflow.</p>

                        <InfoBox type="info" title="Quality Control">
                            QC (Quality Control) is essential for maintaining professional standards. Review each photo for proper exposure, composition, and customer satisfaction before finalizing.
                        </InfoBox>

                        <SubSection title="Opening the Editor">
                            <p className="mb-4">To begin editing an album:</p>
                            <ol className="list-decimal list-inside space-y-2 marker:text-blue-500 marker:font-bold">
                                <li>Navigate to <strong>Albums</strong> and locate an album in the "Queue" status.</li>
                                <li>Click on the album to open it, then click <strong>Edit Album</strong> or double-click any photo.</li>
                                <li>The editor interface will open with the first photo displayed.</li>
                            </ol>
                        </SubSection>

                        <SubSection title="The Editor Interface">
                            <p className="mb-4">Familiarize yourself with the editor layout and controls:</p>
                            <ul className="list-disc list-inside space-y-3 marker:text-slate-400">
                                <li><strong>Main Canvas:</strong> The central area displays the current photo at full resolution. Click and drag to pan when zoomed in.</li>
                                <li><strong>Navigation:</strong>
                                    <ul className="list-disc list-inside ml-6 mt-2 space-y-1 marker:text-slate-400">
                                        <li>Use <strong>Left/Right arrow keys</strong> to move between photos.</li>
                                        <li>Click thumbnail images in the <strong>filmstrip</strong> at the bottom to jump to specific photos.</li>
                                        <li>Use <code>Home</code> and <code>End</code> keys to jump to first/last photo.</li>
                                    </ul>
                                </li>
                                <li><strong>Selection:</strong> Click photos in the filmstrip (or use Ctrl/Cmd + Click) to select multiple photos for batch editing. Selected photos are highlighted.</li>
                                <li><strong>Zoom/Pan:</strong>
                                    <ul className="list-disc list-inside ml-6 mt-2 space-y-1 marker:text-slate-400">
                                        <li><strong>Zoom In:</strong> Scroll mouse wheel up or use the zoom slider.</li>
                                        <li><strong>Zoom Out:</strong> Scroll mouse wheel down or double-click the image.</li>
                                        <li><strong>Pan:</strong> Click and drag the image when zoomed in to navigate around.</li>
                                    </ul>
                                </li>
                                <li><strong>Tool Panel:</strong> Editing tools are located in the right sidebar. Apply adjustments and see real-time previews.</li>
                            </ul>
                        </SubSection>

                        <SubSection title="Basic Editing Tools">
                            <p className="mb-4">Essential adjustments available in the editor:</p>
                            <ul className="list-disc list-inside space-y-2 marker:text-slate-400">
                                <li><strong>Exposure:</strong> Adjust overall brightness. Increase for underexposed photos, decrease for overexposed.</li>
                                <li><strong>Contrast:</strong> Enhance or reduce the difference between light and dark areas.</li>
                                <li><strong>Saturation:</strong> Control color intensity. Use sparingly to maintain natural appearance.</li>
                                <li><strong>Temperature:</strong> Adjust white balance (cooler/warmer tones).</li>
                                <li><strong>Crop:</strong> Resize and recompose the image. Maintain aspect ratios for printing.</li>
                                <li><strong>Rotate:</strong> Fix orientation issues with 90° clockwise/counterclockwise rotation.</li>
                                <li><strong>Filters:</strong> Apply artistic presets (Black & White, Sepia, Vintage, etc.) for creative effects.</li>
                            </ul>

                            <InfoBox type="tip" title="Batch Editing">
                                Select multiple photos before applying adjustments to edit them all at once. This is especially useful for photos shot in the same lighting conditions.
                            </InfoBox>
                        </SubSection>

                        <SubSection title="AI-Powered Tools">
                            <p className="mb-4">Advanced AI features for professional results:</p>
                            <ul className="list-disc list-inside space-y-3 marker:text-slate-400">
                                <li><strong>Auto Adjust:</strong>
                                    <ul className="list-disc list-inside ml-6 mt-2 space-y-1 marker:text-slate-400">
                                        <li>One-click automatic correction of exposure, contrast, and color balance.</li>
                                        <li>AI analyzes the image and applies optimal settings.</li>
                                        <li>Perfect for quick batch processing of similar photos.</li>
                                        <li>You can still fine-tune manually after auto-adjust.</li>
                                    </ul>
                                </li>
                                <li><strong>AI Generative Edit:</strong>
                                    <ul className="list-disc list-inside ml-6 mt-2 space-y-1 marker:text-slate-400">
                                        <li>Select a photo and click "AI Generative Edit".</li>
                                        <li>Type a natural language prompt describing your desired changes (e.g., "Remove the person in the background", "Enhance the sunset colors", "Brighten the faces").</li>
                                        <li>Click <strong>Apply</strong> and wait for AI processing (typically 10-30 seconds).</li>
                                        <li><em className="text-amber-600 dark:text-amber-400">⚠️ Requires Internet connection and may consume API credits.</em></li>
                                        <li>Review the result and accept or revert if not satisfactory.</li>
                                    </ul>
                                </li>
                            </ul>
                        </SubSection>

                        <SubSection title="Quality Control Checklist">
                            <p className="mb-4">Before finalizing, ensure each photo meets these standards:</p>
                            <ul className="list-disc list-inside space-y-2 marker:text-slate-400">
                                <li>✅ Proper exposure (not too dark or bright)</li>
                                <li>✅ Correct white balance (natural skin tones)</li>
                                <li>✅ Sharp focus (no motion blur unless intentional)</li>
                                <li>✅ Proper composition (subject centered, no distractions)</li>
                                <li>✅ No unwanted objects or people in frame</li>
                                <li>✅ Appropriate color saturation (not oversaturated)</li>
                                <li>✅ Correct orientation (not upside down or sideways)</li>
                            </ul>
                        </SubSection>

                        <SubSection title="Saving and Finalizing">
                            <p className="mb-4">Once editing is complete, publish the album to make it available to customers:</p>
                            <ol className="list-decimal list-inside space-y-3 marker:text-blue-500 marker:font-bold">
                                <li><strong>Review:</strong> Double-check all photos in the album meet quality standards.</li>
                                <li><strong>Save Progress:</strong> Edits are automatically saved as you work. You can close and return to edit later if needed.</li>
                                <li><strong>Finalize:</strong> Click <strong>Finalize & Send to Kiosk</strong> in the sidebar or toolbar.</li>
                                <li><strong>Confirmation:</strong> Confirm the action when prompted. This action cannot be easily undone.</li>
                                <li><strong>Broadcast:</strong> The system will:
                                    <ul className="list-disc list-inside ml-6 mt-2 space-y-1 marker:text-slate-400">
                                        <li>Move the album from "Queue" to "Live" status</li>
                                        <li>Send real-time updates to all connected Kiosks via WebSocket</li>
                                        <li>Make photos immediately visible on customer-facing tablets</li>
                                    </ul>
                                </li>
                            </ol>

                            <InfoBox type="warning" title="Finalization Warning">
                                Once an album is finalized, it becomes visible to customers on Kiosks immediately. Ensure all editing and QC is complete before finalizing. You can still edit finalized albums, but changes will be visible to customers in real-time.
                            </InfoBox>
                        </SubSection>
                    </Section>

                    <Section title="Sales & Fulfillment" id="sales-orders">
                        <p className="text-sm font-light text-slate-600 dark:text-slate-300 mb-4">Complete guide to processing customer orders, managing fulfillment, and handling both print and digital product delivery.</p>

                        <SubSection title="Order Processing Overview">
                            <p className="mb-4">Orders can come from two sources:</p>
                            <ul className="list-disc list-inside space-y-2 marker:text-slate-400">
                                <li><strong>Kiosk Orders:</strong> Customers place orders directly on the Touch Kiosk tablets. These appear automatically in the Master Portal.</li>
                                <li><strong>Manual Orders:</strong> Staff can create orders directly in the Master Portal for walk-up customers or phone orders.</li>
                            </ul>
                        </SubSection>

                        <SubSection title="Processing Kiosk Orders">
                            <p className="mb-4">When a customer places an order on a Kiosk, follow this workflow:</p>
                            <ol className="list-decimal list-inside space-y-3 marker:text-blue-500 marker:font-bold">
                                <li><strong>Notification:</strong> A notification toast will appear in the top-right corner of the Master Portal screen, alerting you to a new order. A sound alert may also play depending on your settings.</li>
                                <li><strong>Navigate to Orders:</strong> Click <strong>Orders</strong> in the sidebar. New orders are automatically marked with "Pending" status and appear at the top of the list.</li>
                                <li><strong>Review Order:</strong> Click on the order to open it and view:
                                    <ul className="list-disc list-inside ml-6 mt-2 space-y-1 marker:text-slate-400">
                                        <li>Customer information (Room Number, Name if provided)</li>
                                        <li>Order date and time</li>
                                        <li>List of items (prints, digital downloads, packages)</li>
                                        <li>Total price and payment status</li>
                                    </ul>
                                </li>
                                <li><strong>Verify Items:</strong> Check that all items in the order are correct and available. Note any special requests or customizations.</li>
                                <li><strong>Open Lab Folder:</strong> Click the <strong>Lab Folder</strong> button to open the printing/fulfillment interface for this order.</li>
                            </ol>

                            <InfoBox type="tip" title="Order Priority">
                                Process orders in chronological order (oldest first) to ensure timely fulfillment. Check order timestamps to prioritize urgent requests.
                            </InfoBox>
                        </SubSection>

                        <SubSection title="Lab Print Workflow">
                            <p className="mb-4">Complete fulfillment for print products using the Lab Folder interface:</p>
                            <ol className="list-decimal list-inside space-y-3 marker:text-blue-500 marker:font-bold">
                                <li><strong>Lab Folder View:</strong> In the <strong>Lab Folder</strong>, you'll see all photos that need to be printed, organized by order. Each item displays:
                                    <ul className="list-disc list-inside ml-6 mt-2 space-y-1 marker:text-slate-400">
                                        <li>Photo thumbnail and filename</li>
                                        <li>Print size and quantity</li>
                                        <li>Processing status (Pending/Printed)</li>
                                    </ul>
                                </li>
                                <li><strong>Select Printer:</strong> Ensure your thermal printer or photo printer is connected and selected in the system settings.</li>
                                <li><strong>Print Photos:</strong>
                                    <ul className="list-disc list-inside ml-6 mt-2 space-y-1 marker:text-slate-400">
                                        <li>Click <strong>Print Photo</strong> on each item to send it to the printer.</li>
                                        <li>Wait for confirmation that the print job was sent successfully.</li>
                                        <li>For multiple copies, the system will queue the correct number of prints.</li>
                                    </ul>
                                </li>
                                <li><strong>Verify Prints:</strong> Once printed, visually verify the quality of each print before marking complete.</li>
                                <li><strong>Mark as Printed:</strong> Once verified, the item will automatically be marked green (completed) or you can manually toggle the status.</li>
                                <li><strong>Complete Order:</strong> When all print items are done, click <strong>Mark Completed</strong> to finalize the order. The system will:
                                    <ul className="list-disc list-inside ml-6 mt-2 space-y-1 marker:text-slate-400">
                                        <li>Update order status to "Completed"</li>
                                        <li>Generate a receipt if needed</li>
                                        <li>Record fulfillment in the system logs</li>
                                    </ul>
                                </li>
                            </ol>
                        </SubSection>

                        <SubSection title="Digital Download Fulfillment">
                            <p className="mb-4">For digital products (downloads, USB drives, cloud links):</p>
                            <ol className="list-decimal list-inside space-y-2 marker:text-blue-500 marker:font-bold">
                                <li>Digital items are automatically processed upon order completion.</li>
                                <li>Customers receive download links via email (if configured) or can access them through the Customer Portal.</li>
                                <li>Verify that digital files are properly encoded and accessible before marking orders as complete.</li>
                            </ol>
                        </SubSection>

                        <SubSection title="Creating Manual Orders">
                            <p className="mb-4">To create an order directly in the Master Portal:</p>
                            <ol className="list-decimal list-inside space-y-2 marker:text-blue-500 marker:font-bold">
                                <li>Navigate to <strong>Orders</strong> and click <strong>Create New Order</strong>.</li>
                                <li>Select the album and photos the customer wants to purchase.</li>
                                <li>Add items to the cart (prints, digital downloads, packages).</li>
                                <li>Apply any discounts or special pricing.</li>
                                <li>Complete the order and proceed with fulfillment as above.</li>
                            </ol>
                        </SubSection>

                        <SubSection title="Order Management Tips">
                            <ul className="list-disc list-inside space-y-2 marker:text-slate-400">
                                <li><strong>Batch Processing:</strong> Group similar print orders together for efficient printing.</li>
                                <li><strong>Status Tracking:</strong> Use order statuses (Pending, Processing, Completed, Cancelled) to track workflow.</li>
                                <li><strong>Notes:</strong> Add internal notes to orders for special instructions or customer preferences.</li>
                                <li><strong>Receipts:</strong> Generate and print receipts for completed orders. Receipts can also be emailed if customer email is on file.</li>
                            </ul>
                        </SubSection>
                    </Section>

                    <Section title="Kiosk (Booth) Operations" id="kiosk-operations">
                        <p className="mb-4 text-sm">The Touch Kiosk (often referred to as the "Booth App") is the primary interface for your guests. Version 4.0 introduces powerful AI and biometric features to enhance user experience and security.</p>

                        <SubSection title="AI Face Search">
                            <p>The Kiosk now supports local biometric identification. This allows guests to find their photos instantly without typing a room number.</p>
                            <ul className="list-disc list-inside space-y-3 mt-4 marker:text-slate-400">
                                <li><strong>How it works:</strong> The guest taps "Find Me (AI)" and positions their face in the camera frame. The system generates a secure facial descriptor locally in the browser using machine learning.</li>
                                <li><strong>Privacy:</strong> No facial images are sent to the cloud for search; matching happens securely against the locally synced database on the Master Portal.</li>
                                <li><strong>Configuration:</strong> Enable/Disable this feature globally in <code>Settings &gt; Global Feature Settings</code> or locally on the Kiosk via the Admin menu (tap the lock icon).</li>
                            </ul>
                        </SubSection>

                        <SubSection title="RFID Tap-to-Login">
                            <p>Seamless login using existing hotel wristbands or keycards.</p>
                            <ul className="list-disc list-inside space-y-3 mt-4 marker:text-slate-400">
                                <li><strong>Hardware:</strong> Requires a standard USB RFID reader connected to the tablet/Kiosk via OTG or USB hub.</li>
                                <li><strong>Mapping:</strong> The system maps the RFID UID to the Guest's Room Number or User Profile in the database.</li>
                                <li><strong>Flow:</strong> Guest taps wristband → Instant Login → Shows their specific gallery.</li>
                            </ul>
                        </SubSection>

                        <SubSection title="Attract Mode (Screensaver)">
                            <p>To prevent screen burn-in and attract passersby, the Kiosk enters Attract Mode after a configurable period of inactivity.</p>
                            <ul className="list-disc list-inside space-y-3 mt-4 marker:text-slate-400">
                                <li><strong>Default Timeout:</strong> 60 seconds.</li>
                                <li><strong>Customization:</strong> Change the timeout duration and the background loop in Kiosk Settings (Admin Access).</li>
                                <li><strong>Wake:</strong> A simple touch anywhere on the screen wakes the device and returns to the Welcome Screen.</li>
                            </ul>
                        </SubSection>

                        <SubSection title="Offline Reliability">
                            <p>The Kiosk app uses advanced caching to ensure functionality even during network interruptions.</p>
                            <ul className="list-disc list-inside space-y-3 mt-4 marker:text-slate-400">
                                <li><strong>Network Drop:</strong> If the Wi-Fi connection to the Master Portal drops, the Kiosk queues all orders locally in its internal database.</li>
                                <li><strong>Auto-Sync:</strong> Once connectivity is restored, queued orders are automatically pushed to the Master Portal via the Service Worker bridge.</li>
                                <li><strong>Status:</strong> The connection indicator (bottom left) turns Yellow/Red when offline and Green when connected.</li>
                            </ul>
                        </SubSection>
                    </Section>

                    {/* --- OPERATIONS MANUAL SECTION --- */}
                    <Section title="Operational Laws" id="operational-laws">
                        <p className="text-sm leading-relaxed mb-6 italic opacity-80">These 11 Operational Laws are immutable and govern all development, deployment, and operational decisions in the Star Master ecosystem.</p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <InfoBox type="security" title="Law 01: Dual-Scope Path Guard">
                                Always confirm directory context ([Master] or [Touch]) before execution. Codebases are physically independent.
                            </InfoBox>
                            <InfoBox type="info" title="Law 02: Order/Upload Mirroring">
                                Touch creates orders locally AND pushes to Master via HTTP API (Primary) or Shared Path (Fallback).
                            </InfoBox>
                            <InfoBox type="tip" title="Law 03: Face Recognition Role">
                                Master performs global backend indexing; Touch performs localized client searches only.
                            </InfoBox>
                            <InfoBox type="security" title="Law 04: Scope Integrity">
                                Strictly maintain separate databases and configurations. Never import modules from the "other" app.
                            </InfoBox>
                            <InfoBox type="info" title="Law 07: Master Push Logic">
                                Master-App is solely responsible for initiating all asset transfers to designated Touch-App locations.
                            </InfoBox>
                            <InfoBox type="info" title="Law 08/09: Order Handshake">
                                Touch pushes order files to Master's designated inbox. Master monitor's this folder exclusively.
                            </InfoBox>
                        </div>

                        <SubSection title="The Loop Rule (Law 10)">
                            <p className="text-sm bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-200 dark:border-blue-800 font-bold text-blue-900 dark:text-blue-100 uppercase tracking-widest text-center shadow-inner">
                                "All developers and processes must return to the Core Rules before starting any major task, code generation, or deployment phase."
                            </p>
                        </SubSection>
                    </Section>

                    <Section title="Executive Summary" id="exec-summary">
                        <p className="text-sm leading-relaxed mb-3">Star Master OS is a distributed, offline-first photography management suite designed for high-volume resort and event photography operations. It solves the critical challenge of operating in environments with unstable or expensive internet connectivity by decentralizing the database and server logic.</p>

                        <SubSection title="Core Philosophy">
                            <p className="mb-4">The system is built on three fundamental principles:</p>
                            <ul className="list-disc list-inside space-y-2 marker:text-slate-400">
                                <li><strong>Offline-First Architecture:</strong> All core operations function without internet connectivity. The system is designed to work seamlessly in remote locations, cruise ships, resorts with limited bandwidth, or during network outages.</li>
                                <li><strong>Local Network Independence:</strong> Master Portal and Touch Kiosks communicate via a local Wi-Fi network, eliminating dependence on external internet services for daily operations.</li>
                                <li><strong>Manual Cloud Sync:</strong> Data synchronization with the cloud is opt-in and manual, giving operators full control over when and what data is transmitted, reducing bandwidth costs and ensuring privacy.</li>
                            </ul>
                        </SubSection>

                        <SubSection title="Key Benefits">
                            <ul className="list-disc list-inside space-y-3 marker:text-slate-400">
                                <li><strong>Operational Continuity:</strong> Continue serving customers even when internet connectivity is unavailable or unreliable. No downtime due to network issues.</li>
                                <li><strong>Cost Efficiency:</strong> Minimize expensive satellite or cellular data costs by limiting cloud synchronization to essential reporting periods.</li>
                                <li><strong>Data Privacy:</strong> Sensitive customer photos remain on-premises until explicitly synced. Full control over data residency and compliance.</li>
                                <li><strong>Performance:</strong> Local database and file storage provide instant access to photos and albums, eliminating latency from cloud-based solutions.</li>
                                <li><strong>Scalability:</strong> Support multiple kiosks and photographers from a single Master Portal installation.</li>
                            </ul>
                        </SubSection>

                        <SubSection title="Use Cases">
                            <p className="mb-4">Star Master OS is ideal for:</p>
                            <ul className="list-disc list-inside space-y-2 marker:text-slate-400">
                                <li>Resort and hotel photography services</li>
                                <li>Cruise ship photography operations</li>
                                <li>Event photography (weddings, conferences, parties)</li>
                                <li>Remote location photography studios</li>
                                <li>Any photography business operating in low-bandwidth environments</li>
                            </ul>
                        </SubSection>

                        <p className="mt-4 text-sm leading-relaxed">The system allows photographers to ingest, edit, and sell photos completely offline via a local network. Synchronization with the cloud is performed manually when connectivity is available, ensuring data integrity and operational continuity while maintaining the flexibility to operate independently.</p>
                    </Section>

                    <Section title="System Architecture" id="sys-arch">
                        <p>The ecosystem is composed of four distinct applications running from a single codebase but serving different roles. The architecture follows a <strong>strictly decoupled Master-Touch separation</strong>.</p>

                        <SubSection title="1. Master-App (The Brain)">
                            <ul className="list-disc list-inside space-y-3 marker:text-slate-400">
                                <li><strong>Environment:</strong> Electron/Node.js desktop application.</li>
                                <li><strong>Role:</strong> High-res photo processing, watermarking (Law 13), face indexing (Law 03), and pushing assets (Law 07).</li>
                                <li><strong>Storage:</strong> Structured subfolders by Album ID (Law 12) to prevent directory bloat in 100GB+ libraries (Law 15).</li>
                            </ul>
                        </SubSection>

                        <SubSection title="2. Touch-App (The Body)">
                            <ul className="list-disc list-inside space-y-3 marker:text-slate-400">
                                <li><strong>Environment:</strong> Web-based Kiosk browser app.</li>
                                <li><strong>Role:</strong> Finalized photo display (Law 05) and local order creation (Law 08).</li>
                                <li><strong>Data Fetch:</strong> Strictly limited to its own local sync folder (Law 06). Never pulls directly from Master directories.</li>
                            </ul>
                        </SubSection>

                        <SubSection title="3. Operational Infrastructure">
                            <ul className="list-disc list-inside space-y-3 marker:text-slate-400">
                                <li><strong>Connectivity:</strong> 100% functional without internet. Offline communication via Direct Ethernet or LAN only.</li>
                                <li><strong>Kiosk Mode:</strong> Both apps operate as shell environments, locking down to photography workflow only.</li>
                            </ul>
                        </SubSection>
                    </Section>

                    <Section title="Data Flow Rules" id="data-flow-rules">
                        <p className="mb-6">Data integrity hinges on following specific directional laws to prevent race conditions and cross-contamination.</p>

                        <div className="bg-slate-900 text-slate-100 p-6 rounded-2xl border border-slate-800 font-mono text-xs leading-loose relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                <svg className="w-24 h-24" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" /></svg>
                            </div>
                            <div className="flex items-center gap-4 text-emerald-400 mb-4 border-b border-white/10 pb-2">
                                <span className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></span>
                                <span className="font-bold uppercase tracking-widest text-[10px]">Active Data Flow Matrix</span>
                            </div>
                            <div className="space-y-4">
                                <div className="flex gap-4">
                                    <span className="text-slate-500 w-24">ASSETS:</span>
                                    <span>Master (Local) --&gt; <span className="text-blue-400">[PUSH]</span> --&gt; Touch (local/uploads)</span>
                                </div>
                                <div className="flex gap-4">
                                    <span className="text-slate-500 w-24">ORDERS:</span>
                                    <span>Touch (Local) --&gt; <span className="text-purple-400">[PUSH]</span> --&gt; Master (local/orders/from_touch)</span>
                                </div>
                                <div className="flex gap-4 border-t border-white/5 pt-4">
                                    <span className="text-slate-500 w-24">FACIAL:</span>
                                    <span>Master --&gt; <span className="text-amber-400">[INDEX]</span> | Touch --&gt; <span className="text-amber-400">[SEARCH]</span></span>
                                </div>
                            </div>
                        </div>

                        <ul className="list-disc list-inside space-y-3 mt-8 marker:text-slate-400 text-sm">
                            <li><strong>Law 14 Reminder:</strong> ZIP downloads from browser are forbidden. Always use Master Push for exports.</li>
                            <li><strong>Law 13 Reminder:</strong> Watermarking is decoupled from ingestion to prevent IO blocks.</li>
                        </ul>
                    </Section>

                    <Section title="Application Modules & Features" id="app-modules">
                        <SubSection title="A. Master Portal (The Core)">
                            <p className="mb-4">The operational hub run by photographers. It is optimized for speed and offline reliability.</p>
                            <ul className="list-disc list-inside space-y-2 marker:text-slate-400">
                                <li><strong>Smart Ingest:</strong> Imports photos from SD cards or simulated folders. Reads file metadata.</li>
                                <li><strong>AI Auto-Tagging:</strong> (Online Feature) Uses Google Gemini API to analyze sample photos and suggest creative Album Titles and Categories (e.g., "Sunset Beach Family").</li>
                                <li><strong>Photo Editor:</strong> A non-destructive editor using CSS filters and Canvas. Supports Exposure, Contrast, Saturation, Crop, Rotation, and Filters. Includes AI Generative Edit for removing objects or enhancing lighting.</li>
                                <li><strong>Workflow Pipeline:</strong> Albums move from "Queue" (Draft) to "Live" (Finalized). Finalizing an album broadcasts a WebSocket event to update Kiosks instantly.</li>
                                <li><strong>Point of Sale (POS):</strong> Create orders, apply discounts, manage print products vs digital downloads. Generates printable receipts and lab worksheets.</li>
                                <li><strong>Local Server:</strong> Broadcasts its IP address for Kiosk discovery.</li>
                            </ul>
                        </SubSection>
                        <SubSection title="B. Touch Kiosk (The Experience)">
                            <p className="mb-4">A locked-down, customer-facing tablet interface designed for self-service viewing and ordering.</p>
                            <ul className="list-disc list-inside space-y-2 marker:text-slate-400">
                                <li><strong>Attract Mode (Screensaver):</strong> After a configurable timeout (default 60s) of inactivity, plays an animation to prevent burn-in and attract guests.</li>
                                <li><strong>Room Number Search:</strong> Guests enter their room number to filter the gallery instantly.</li>
                                <li><strong>Secure Cart:</strong> Guests build a cart of prints/digitals. Checkout creates a "Pending" order on the Master Portal for fulfillment.</li>
                                <li><strong>Assistance Request:</strong> A "Call for Help" button sends a real-time alert (Toast Notification + Sound) to the Photographer on the Master Portal.</li>
                            </ul>
                        </SubSection>
                        <SubSection title="C. Management Portal (The HQ)">
                            <p className="mb-4">For business owners and managers to oversee operations across multiple hotels/destinations.</p>
                            <ul className="list-disc list-inside space-y-2 marker:text-slate-400">
                                <li><strong>Global Dashboard:</strong> Aggregates revenue, profit, and costs from all synced destinations.</li>
                                <li><strong>Payroll Engine:</strong> Calculates photographer pay based on Salary or Commission % (configurable per user). Handles Bonuses and Deductions.</li>
                                <li><strong>Warehouse:</strong> Tracks equipment (Cameras, Lenses) assigned to specific photographers or destinations. Status tracking (In Use, Repair, Storage).</li>
                                <li><strong>Financials:</strong> Detailed Profit & Loss reports, Loan tracking (Capital injections), and Expense management.</li>
                            </ul>
                        </SubSection>
                    </Section>

                    <Section title="Technical Mechanisms" id="tech-mechanisms">
                        <p className="text-sm leading-relaxed mb-4">Deep dive into the technical architecture and mechanisms that power Star Master OS. Understanding these concepts helps with troubleshooting and system optimization.</p>

                        <SubSection title="Zero-Block IO Photo Pipeline (Law 13)">
                            <p className="mb-4">To ensure UI responsiveness during high-volume imports (100GB+ libraries), the system decouples heavy asset processing from the main thread.</p>
                            <ul className="list-disc list-inside space-y-2 marker:text-slate-400">
                                <li><strong>Immediate Tiering:</strong> Fast, low-CPU generation of "Tiny" (WebP) and "Thumb" (JPEG) assets happens on import.</li>
                                <li><strong>Background Workers:</strong> Heavy watermarking and high-res fulfillment rendering are queued and executed in background worker threads.</li>
                                <li><strong>Main Thread Integrity:</strong> The database and UI never wait for photo processing to complete, adhering to the "Zero-Block" mandate.</li>
                            </ul>
                        </SubSection>

                        <SubSection title="WebSocket Real-Time Communication">
                            <p className="mb-4">The application uses a native WebSocket server (using the <code>ws</code> library) running on port 3001 for real-time, bi-directional communication between the Master Portal and Touch Kiosks. This enables instant updates without polling or page refreshes.</p>

                            <p className="mt-4 mb-2 font-bold">Architecture Components:</p>
                            <ul className="list-disc list-inside space-y-2 marker:text-slate-400">
                                <li><strong>Server:</strong> WebSocket.Server integrated with the HTTP server in <code>backend/server.js</code>. Handles multiple concurrent client connections.</li>
                                <li><strong>Client:</strong> Native WebSocket client implemented in <code>webSocketService.ts</code> with automatic reconnection logic and error handling.</li>
                                <li><strong>Heartbeat:</strong> PING/PONG mechanism runs every 30 seconds to detect disconnected clients and maintain connection health.</li>
                                <li><strong>Message Types:</strong> Structured message protocol including:
                                    <ul className="list-disc list-inside ml-6 mt-2 space-y-1 marker:text-slate-400">
                                        <li><code>REGISTER_CLIENT</code> - Kiosk registration and identification</li>
                                        <li><code>NEW_ALBUM_FOR_KIOSK</code> - Album finalization notifications</li>
                                        <li><code>ORDER_NOTIFICATION</code> - New order alerts to Master Portal</li>
                                        <li><code>PING/PONG</code> - Connection keepalive</li>
                                    </ul>
                                </li>
                                <li><strong>Connection Management:</strong> Automatic client registration, connection tracking, and graceful disconnection handling.</li>
                            </ul>

                            <p className="mt-4 mb-2 font-bold">Communication Flow:</p>
                            <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-700 font-mono text-sm my-4">
                                <div className="text-blue-600 dark:text-blue-400">Master Portal</div>
                                <div className="text-slate-400 ml-4">↓ sends NEW_ALBUM_FOR_KIOSK</div>
                                <div className="text-purple-600 dark:text-purple-400 ml-8">WebSocket Server (Port 3001)</div>
                                <div className="text-slate-400 ml-4">↓ broadcasts to all clients</div>
                                <div className="text-green-600 dark:text-green-400 ml-12">Connected Kiosks</div>
                                <div className="text-slate-400 ml-16">↓ UI updates in real-time</div>
                            </div>

                            <p className="mt-4 mb-2 font-bold">Key Benefits:</p>
                            <ul className="list-disc list-inside space-y-2 marker:text-slate-400">
                                <li><strong>Bi-directional Communication:</strong> Both Master and Kiosks can send/receive messages in real-time.</li>
                                <li><strong>Automatic Reconnection:</strong> Exponential backoff strategy (1s, 2s, 4s, 8s, max 30s) ensures resilient connections.</li>
                                <li><strong>Low Latency:</strong> Sub-second message delivery for instant UI updates.</li>
                                <li><strong>Network Resilience:</strong> Handles temporary disconnections gracefully without data loss.</li>
                            </ul>
                        </SubSection>

                        <SubSection title="Hybrid Sync Engine">
                            <p className="mb-4">The system maintains data in two parallel states: Local (IndexedDB/SQLite for browser, JSON file for backend) and Remote (PocketBase Cloud). The <code>CloudSync.tsx</code> component orchestrates the "Merge & Push" synchronization logic.</p>

                            <p className="mt-4 mb-2 font-bold">Sync Strategies:</p>
                            <ul className="list-disc list-inside space-y-3 marker:text-slate-400">
                                <li><strong>Users & Settings (Two-way Sync):</strong>
                                    <ul className="list-disc list-inside ml-6 mt-2 space-y-1 marker:text-slate-400">
                                        <li>Cloud configuration overrides local on sync.</li>
                                        <li>Local changes are preserved until next sync.</li>
                                        <li>Useful for centralized user management and global settings.</li>
                                    </ul>
                                </li>
                                <li><strong>Orders & Albums (One-way Push):</strong>
                                    <ul className="list-disc list-inside ml-6 mt-2 space-y-1 marker:text-slate-400">
                                        <li>Local → Cloud only (never overwrites local data).</li>
                                        <li>Enables HQ reporting and aggregation.</li>
                                        <li>Local remains the source of truth for operations.</li>
                                    </ul>
                                </li>
                                <li><strong>Conflict Resolution:</strong>
                                    <ul className="list-disc list-inside ml-6 mt-2 space-y-1 marker:text-slate-400">
                                        <li><strong>Server-wins</strong> strategy for metadata conflicts.</li>
                                        <li><strong>Append-only</strong> for logs and audit trails.</li>
                                        <li>Version tracking prevents data loss during conflicts.</li>
                                    </ul>
                                </li>
                            </ul>

                            <InfoBox type="info" title="Sync Best Practices">
                                <ul className="list-disc list-inside space-y-1 text-sm">
                                    <li>Perform syncs during low-traffic periods to avoid interference.</li>
                                    <li>Verify internet connectivity before starting large syncs.</li>
                                    <li>Monitor sync progress and resolve any errors promptly.</li>
                                    <li>Keep local backups before major sync operations.</li>
                                </ul>
                            </InfoBox>
                        </SubSection>

                        <SubSection title="Offline Image Handling">
                            <p className="mb-4">Efficient storage and retrieval of image data is critical for performance. The system uses a multi-layered approach:</p>

                            <ul className="list-disc list-inside space-y-3 marker:text-slate-400">
                                <li><strong>Primary Storage:</strong>
                                    <ul className="list-disc list-inside ml-6 mt-2 space-y-1 marker:text-slate-400">
                                        <li>High-resolution originals stored on local file system (<code>pb_data/uploads/</code>).</li>
                                        <li>File system storage provides fast sequential access and minimal memory overhead.</li>
                                        <li>Organized by collection and record ID for efficient lookup.</li>
                                    </ul>
                                </li>
                                <li><strong>Browser Cache (IndexedDB):</strong>
                                    <ul className="list-disc list-inside ml-6 mt-2 space-y-1 marker:text-slate-400">
                                        <li>Thumbnails and preview images stored as Blobs in IndexedDB.</li>
                                        <li>Enables instant photo browsing without network requests.</li>
                                        <li>Automatic cache invalidation on album updates.</li>
                                    </ul>
                                </li>
                                <li><strong>Display URLs:</strong>
                                    <ul className="list-disc list-inside ml-6 mt-2 space-y-1 marker:text-slate-400">
                                        <li>Ephemeral <code>blob:</code> URLs generated on-demand for display.</li>
                                        <li>Memory-efficient: URLs are revoked when no longer needed.</li>
                                        <li>Zero network latency for cached images.</li>
                                    </ul>
                                </li>
                                <li><strong>Optimization Features:</strong>
                                    <ul className="list-disc list-inside ml-6 mt-2 space-y-1 marker:text-slate-400">
                                        <li>Lazy loading: Images load as user scrolls through galleries.</li>
                                        <li>Progressive JPEG support for faster initial rendering.</li>
                                        <li>Thumbnail generation on import for instant preview.</li>
                                    </ul>
                                </li>
                            </ul>
                        </SubSection>

                        <SubSection title="Database Architecture">
                            <p className="mb-4">The system uses a lightweight JSON-based database for simplicity and portability:</p>
                            <ul className="list-disc list-inside space-y-2 marker:text-slate-400">
                                <li><strong>File Format:</strong> Single <code>data.json</code> file stores all collections and records.</li>
                                <li><strong>Atomic Writes:</strong> Write-to-temp-then-rename strategy prevents corruption during power loss.</li>
                                <li><strong>In-Memory Indexing:</strong> Fast lookup via JavaScript object keys.</li>
                                <li><strong>Backup Friendly:</strong> Simple file copy creates complete database backup.</li>
                            </ul>
                        </SubSection>
                    </Section>

                    <Section title="Custom Backend Setup" id="backend-setup">
                        <SubSection title="Embedded Node.js Server">
                            <p>The application uses a lightweight, custom Node.js server (Port {DEFAULT_MASTER_PORT}) for local data management, replacing the external PocketBase binary for simplified deployment.</p>
                            <p className="mt-4 font-bold">Architecture:</p>
                            <ul className="list-disc list-inside space-y-2 mt-2 marker:text-slate-400">
                                <li><strong>Script:</strong> <code>backend/server.js</code></li>
                                <li><strong>Database:</strong> JSON-based storage (<code>data.json</code>) for zero-configuration persistence.</li>
                                <li><strong>High-Res Storage:</strong> Uploads are streamed to <code>pb_data/uploads</code> folder.</li>
                                <li><strong>Process:</strong> Automatically spawned by the Electron Main process using <code>child_process.fork()</code>.</li>
                            </ul>
                            <p className="mt-4">This setup removes the need to download or manage external <code>.exe</code> files manually during development or deployment.</p>
                        </SubSection>

                        <SubSection title="Atomic Write Strategy">
                            <p>To prevent data corruption during unexpected power loss (a common scenario in kiosks), the backend implements an atomic write strategy for the JSON database.</p>
                            <ol className="list-decimal list-inside space-y-2 mt-4 text-sm marker:text-slate-400">
                                <li><strong>Write to Temp:</strong> Data is first written to a temporary file (e.g., <code>data.json.tmp</code>).</li>
                                <li><strong>Flush:</strong> The file buffer is flushed to disk to ensure the write is complete.</li>
                                <li><strong>Rename:</strong> The temporary file is atomically renamed to the target file (<code>data.json</code>). This operation is atomic on POSIX and modern Windows file systems.</li>
                                <li><strong>Retry Logic:</strong> If a file lock is encountered (e.g., anti-virus scanning), the system retries the write up to 3 times with exponential backoff.</li>
                            </ol>
                        </SubSection>

                        <SubSection title="API Reference">
                            <p>The custom server exposes a REST-like API compatible with the application's data layer.</p>
                            <div className="overflow-x-auto mt-6 rounded-xl border border-slate-200 dark:border-slate-700">
                                <table className="w-full text-sm text-left text-slate-600 dark:text-slate-300">
                                    <thead className="bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white">
                                        <tr>
                                            <th className="px-6 py-4 font-bold">Method</th>
                                            <th className="px-6 py-4 font-bold">Endpoint</th>
                                            <th className="px-6 py-4 font-bold">Description</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700 bg-white dark:bg-slate-900">
                                        <tr>
                                            <td className="px-6 py-4 font-bold text-green-600">GET</td>
                                            <td className="px-6 py-4 font-mono">/api/health</td>
                                            <td className="px-6 py-4">Server status check.</td>
                                        </tr>
                                        <tr>
                                            <td className="px-6 py-4 font-bold text-green-600">GET</td>
                                            <td className="px-6 py-4 font-mono">/api/collections/:name/records</td>
                                            <td className="px-6 py-4">Fetch records. Supports <code>sort</code>, <code>filter</code>, <code>expand</code>.</td>
                                        </tr>
                                        <tr>
                                            <td className="px-6 py-4 font-bold text-blue-600">POST</td>
                                            <td className="px-6 py-4 font-mono">/api/collections/:name/records</td>
                                            <td className="px-6 py-4">Create record. Supports <code>application/json</code> or <code>multipart/form-data</code>.</td>
                                        </tr>
                                        <tr>
                                            <td className="px-6 py-4 font-bold text-green-600">GET</td>
                                            <td className="px-6 py-4 font-mono">/api/files/:collection/:id/:file</td>
                                            <td className="px-6 py-4">Serve static image files from disk.</td>
                                        </tr>
                                        <tr>
                                            <td className="px-6 py-4 font-bold text-green-600">GET</td>
                                            <td className="px-6 py-4 font-mono">/api/realtime</td>
                                            <td className="px-6 py-4">Server-Sent Events (SSE) stream for live updates.</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </SubSection>
                    </Section>

                    <Section title="Deployment & Building" id="deployment">
                        <p>This guide details how to package the source code into a distributable Windows installer (.exe) for deployment to Master PCs.</p>
                        <SubSection title="Prerequisites">
                            <ul className="list-disc list-inside space-y-2 marker:text-slate-400">
                                <li>Node.js (v18 or higher) installed on the development machine.</li>
                                <li>NPM (Node Package Manager).</li>
                                <li>A valid <code>icon.ico</code> file in the project root directory (required for Windows build).</li>
                            </ul>
                        </SubSection>
                        <SubSection title="Build Command">
                            <p className="mb-4">To generate the production installer, open your terminal in the project root directory and run the following commands:</p>
                            <CodeBlock title="Build" code={`npm install
npm run dist`} />
                            <p className="mt-4">This command uses Electron Builder to compile the React code, bundle the Node.js backend, and package everything into a single NSIS executable installer.</p>
                        </SubSection>
                        <SubSection title="Output Files">
                            <p>After the build process completes (typically 1-2 minutes), the installer will be generated in the <code>dist/</code> folder.</p>
                        </SubSection>

                        <SubSection title="Method 3: Windows Kiosk Mode">
                            <p className="mb-4">For dedicated stations, you can configure Windows to boot directly into the application, locking out the Explorer shell and other apps.</p>
                            <p className="mb-2 font-bold">Automated Setup:</p>
                            <ol className="list-decimal list-inside space-y-2 mb-4 marker:text-slate-400">
                                <li>Open PowerShell as Administrator.</li>
                                <li>Navigate to the project scripts folder: <code>apps/master/scripts/</code></li>
                                <li>Run the setup script:</li>
                            </ol>
                            <CodeBlock title="Kiosk Setup" code={`.\\setup - kiosk.ps1 - AppPath "C:\\Program Files\\star-master-master\\Star Master Master.exe" - EnableAutoLogon`} />

                            <InfoBox type="warning" title="Reboot Required">
                                The system requires a reboot to apply the Shell Launcher configuration. After reboot, the system will auto-login as the 'MasterKioskUser' and launch the app immediately.
                            </InfoBox>
                        </SubSection>
                    </Section>

                    <Section title="File System Structure" id="file-system">
                        <p className="mb-4">Understanding where files are stored is crucial for backups and troubleshooting.</p>
                        <ul className="list-disc list-inside space-y-3 marker:text-slate-400">
                            <li><strong>Application Root:</strong> <code>%LocalAppData%\Programs\star-master-os\</code> - Contains the executable and resources.</li>
                            <li><strong>Database Storage (Portable):</strong> <code>Installation Root\pb_data\</code> - Contains the <code>master.db</code> database and <code>uploads/</code> folder (where all imported photos are stored). This is now stored within the application folder for portability. Backup this folder regularly.</li>
                            <li><strong>Logs:</strong> <code>Installation Root\pb_data\logs\</code> - Application logs for debugging errors.</li>
                            <li><strong>System Files:</strong> <code>Installation Root\pb_data\system\</code> - System configuration files including logo.png for the Master Portal branding.</li>
                        </ul>
                    </Section>

                    <Section title="Data Storage & Schema" id="db-schema">
                        <p className="mb-4">The current implementation uses a file-based JSON database for zero-dependency deployment. The schema is defined implicitly in <code>backend/server.js</code> and stored in <code>pb_data/data.json</code>.</p>
                        <p className="font-bold mt-6">Key Collections (JSON Keys):</p>
                        <ul className="list-disc list-inside space-y-3 mt-4 marker:text-slate-400">
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
title Star Master OS Server
echo Starting Star Master OS...
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
echo Updating Star Master OS...
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
$serviceName = "StarMasterBackend"
$nodePath = "C:\\Program Files\\nodejs\\node.exe"
$scriptPath = "$PSScriptRoot\\backend\\server.js"

New - Service - Name $serviceName - BinaryPathName "$nodePath $scriptPath" - DisplayName "Star Master Backend" - StartupType Automatic
Start - Service $serviceName
Write - Host "Service Installed and Started."`}
                            />
                        </SubSection>
                    </Section>

                    <Section title="Installation Structure" id="installation-structure">
                        <p className="mb-4">Whether deploying via the installer or setting up a portable version, maintaining the correct folder structure is critical for the offline database engine to launch correctly.</p>
                        <SubSection title="Required Directory Layout">
                            <div className="bg-slate-100 dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 font-mono text-sm leading-loose">
                                <div>📁 Installation Root/</div>
                                <div className="pl-6">📄 Star Master OS.exe &nbsp; <span className="text-slate-500">// Main Launcher</span></div>
                                <div className="pl-6">📁 resources/ &nbsp; <span className="text-slate-500">// Electron Resources</span></div>
                                <div className="pl-10">📁 backend/</div>
                                <div className="pl-14">📄 server.js &nbsp; <span className="text-red-500 dark:text-red-400 font-bold">&lt;-- Critical Engine File</span></div>
                                <div className="pl-6">📁 locales/</div>
                                <div className="pl-6">📄 uninstall.exe</div>
                            </div>
                        </SubSection>
                        <SubSection title="Data Persistence Location">
                            <InfoBox type="warning" title="Data Persistence">
                                To ensure portability, the database and photos are now stored directly inside the application folder.
                                <br /><br />
                                <strong>Data Location:</strong> <code>Installation Root\pb_data\</code>
                                <br />
                                <strong>Backup Strategy:</strong> To backup the system, simply copy the entire <code>pb_data</code> folder.
                            </InfoBox>
                        </SubSection>
                    </Section>

                    <Section title="Security & Integrity" id="security">
                        <p>Security in an offline environment focuses on access control and data integrity rather than encryption in transit (since it's local). However, several mechanisms are in place.</p>

                        <SubSection title="Kiosk Admin Protection (Law 16)">
                            <p className="mb-4">Kiosk devices are protected against unauthorized exploration via a dual-layer security model:</p>
                            <ul className="list-disc list-inside space-y-2 marker:text-slate-400">
                                <li><strong>Pin Challenge:</strong> Accessing settings or the admin dashboard on a Kiosk requires a 4-digit PIN.</li>
                                <li><strong>Session Timeout:</strong> Admin sessions automatically expire after 5 minutes of inactivity, returning to the guest gallery.</li>
                                <li><strong>Restricted Shell:</strong> When running in Electron Kiosk mode, system shortcuts (Alt-Tab, Win-D) are blocked at the OS level.</li>
                            </ul>
                        </SubSection>

                        <SubSection title="Directory Traversal Protection">
                            <p>The static file server at <code>/api/files</code> includes checks to prevent accessing files outside the dedicated <code>uploads</code> directory.</p>
                            <CodeBlock title="Security Logic (server.js)" code={`// Block attempts to use ".." or absolute paths
if (filename.includes('..') || filename.includes('/') || filename.includes('\\\\')) {
    res.writeHead(400);
    res.end('Invalid filename security violation');
    return;
} `} />
                        </SubSection>

                        <SubSection title="Extension Whitelisting">
                            <p>When uploading files, the server validates the file extension against a strict allowlist to prevent the execution of malicious scripts (e.g., uploading a .exe or .php file masked as an image).</p>
                            <ul className="list-disc list-inside text-sm text-slate-600 dark:text-slate-300 mt-4">
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
