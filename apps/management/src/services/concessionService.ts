import {
  GearAsset,
  PrintJob,
  PrinterStatus,
  AttractionAnchor,
  ShiftSchedule,
  StaffHousingUnit,
  AcademyCourse,
  JobApplicant,
  SleepingMoneyGallery,
  CashReconciliation,
  ConsumableExpense,
  FraudAlertEvent,
  KeepsakeProductItem,
  GamificationProfile,
  ReviewInterceptionLog,
  AICoachingCard,
  ResortBlogPostItem,
} from '@clickflash/types';

// =============================================================================
// PILLAR 1: OPERATIONS & HARDWARE FLEET
// =============================================================================

export const MOCK_GEAR_ASSETS: GearAsset[] = [
  {
    id: 'gear-1',
    venueId: 'dest-mallorca',
    assetTag: 'CF-CAM-001',
    category: 'BODY',
    model: 'Sony Alpha 7 IV (33MP)',
    serialNumber: 'SN-S7489201',
    conditionRating: 5,
    status: 'CHECKED_OUT',
    assignedToUserId: 'usr-101',
    assignedToName: 'Marco Rossi',
    batteryHealthPercent: 94,
    shutterCount: 14230,
    lastServiceDate: '2026-07-15',
    created: '2026-01-10T08:00:00Z',
    updated: '2026-08-23T10:00:00Z'
  },
  {
    id: 'gear-2',
    venueId: 'dest-mallorca',
    assetTag: 'CF-LENS-004',
    category: 'LENS',
    model: 'Sony FE 24-70mm f/2.8 GM II',
    serialNumber: 'SN-L9832104',
    conditionRating: 5,
    status: 'CHECKED_OUT',
    assignedToUserId: 'usr-101',
    assignedToName: 'Marco Rossi',
    lastServiceDate: '2026-07-15',
    created: '2026-01-10T08:00:00Z',
    updated: '2026-08-23T10:00:00Z'
  },
  {
    id: 'gear-3',
    venueId: 'dest-mallorca',
    assetTag: 'CF-CAM-002',
    category: 'BODY',
    model: 'Canon EOS R6 Mark II',
    serialNumber: 'SN-CR6-9921',
    conditionRating: 4,
    status: 'AVAILABLE',
    batteryHealthPercent: 98,
    shutterCount: 8940,
    lastServiceDate: '2026-06-20',
    created: '2026-02-14T09:00:00Z',
    updated: '2026-08-22T18:00:00Z'
  },
  {
    id: 'gear-4',
    venueId: 'dest-mallorca',
    assetTag: 'CF-STROBE-001',
    category: 'STROBE',
    model: 'Godox AD200Pro II TTL',
    serialNumber: 'SN-GDX-7712',
    conditionRating: 4,
    status: 'AVAILABLE',
    batteryHealthPercent: 100,
    created: '2026-03-01T08:00:00Z',
    updated: '2026-08-20T12:00:00Z'
  }
];

export const MOCK_PRINTERS: PrinterStatus[] = [
  {
    id: 'prn-1',
    name: 'Main Pavilion Kiosk DNP 1',
    model: 'DNP DS620 High-Speed Sublimation',
    status: 'ONLINE',
    paperRemaining: 248,
    ribbonRemainingPercent: 62,
    temperatureCelsius: 38,
    totalPrintsCounter: 4210,
    ipAddress: '192.168.1.140'
  },
  {
    id: 'prn-2',
    name: 'Beach Club Fast Print Hub',
    model: 'DNP RX1HS High-Capacity',
    status: 'PRINTING',
    paperRemaining: 412,
    ribbonRemainingPercent: 88,
    temperatureCelsius: 42,
    totalPrintsCounter: 9840,
    ipAddress: '192.168.1.141'
  },
  {
    id: 'prn-3',
    name: 'Welcome Archway Express',
    model: 'Citizen CY-02 Dye-Sub',
    status: 'PAPER_LOW',
    paperRemaining: 18,
    ribbonRemainingPercent: 24,
    temperatureCelsius: 36,
    totalPrintsCounter: 3120,
    ipAddress: '192.168.1.142'
  }
];

export const MOCK_PRINT_JOBS: PrintJob[] = [
  {
    id: 'pj-101',
    venueId: 'dest-mallorca',
    printerName: 'Main Pavilion Kiosk DNP 1',
    orderId: 'ORD-9821',
    photoUrl: 'https://images.unsplash.com/photo-1533105079780-92b9be482077?w=600',
    guestName: 'Elena Rostova',
    paperSize: '6x8',
    copies: 2,
    status: 'PRINTING',
    priority: 1,
    submittedAt: '2026-08-23T18:42:10Z'
  },
  {
    id: 'pj-102',
    venueId: 'dest-mallorca',
    printerName: 'Beach Club Fast Print Hub',
    orderId: 'ORD-9822',
    photoUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600',
    guestName: 'David & Sarah Miller',
    paperSize: '4x6',
    copies: 4,
    status: 'QUEUED',
    priority: 2,
    submittedAt: '2026-08-23T18:44:00Z'
  },
  {
    id: 'pj-103',
    venueId: 'dest-mallorca',
    printerName: 'Main Pavilion Kiosk DNP 1',
    orderId: 'ORD-9819',
    photoUrl: 'https://images.unsplash.com/photo-1510414842594-a61c69b5ae57?w=600',
    guestName: 'Alexandre Dubois',
    paperSize: '8x10',
    copies: 1,
    status: 'COMPLETED',
    priority: 5,
    submittedAt: '2026-08-23T18:30:15Z',
    completedAt: '2026-08-23T18:31:02Z'
  }
];

export const MOCK_ATTRACTION_ANCHORS: AttractionAnchor[] = [
  {
    id: 'anc-1',
    venueId: 'dest-mallorca',
    name: 'Resort Welcome Archway',
    location: 'Main Entrance Portal',
    cameraModel: 'Sony A6700 4K High-Speed Optical Flow',
    triggerType: 'OPTICAL_MOTION',
    status: 'ONLINE',
    fps: 60,
    shutterSpeed: '1/2000s',
    photosCapturedToday: 842,
    lastTriggerAt: '2026-08-23T18:50:11Z'
  },
  {
    id: 'anc-2',
    venueId: 'dest-mallorca',
    name: 'Splash Water Slide Mega Drop',
    location: 'Waterpark Tower Apex',
    cameraModel: 'Industrial Global Shutter GigE Camera',
    triggerType: 'INFRARED_BEAM',
    status: 'TRIGGERING',
    fps: 120,
    shutterSpeed: '1/4000s',
    photosCapturedToday: 1320,
    lastTriggerAt: '2026-08-23T18:52:40Z'
  }
];

// =============================================================================
// PILLAR 2: PEOPLE, SHIFTS, HOUSING & ACADEMY
// =============================================================================

export const MOCK_SHIFTS: ShiftSchedule[] = [
  {
    id: 'shift-1',
    venueId: 'dest-mallorca',
    userId: 'usr-101',
    userName: 'Marco Rossi',
    userAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120',
    role: 'Lead Action Photographer',
    date: '2026-08-23',
    startTime: '10:00',
    endTime: '18:00',
    assignedZone: 'MAIN_POOL',
    clockInTime: '09:52',
    status: 'CLOCKED_IN'
  },
  {
    id: 'shift-2',
    venueId: 'dest-mallorca',
    userId: 'usr-102',
    userName: 'Sophie Dubois',
    userAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120',
    role: 'Sunset Portrait Specialist',
    date: '2026-08-23',
    startTime: '14:00',
    endTime: '21:00',
    assignedZone: 'BEACH_SUNSET',
    clockInTime: '13:58',
    status: 'CLOCKED_IN'
  },
  {
    id: 'shift-3',
    venueId: 'dest-mallorca',
    userId: 'usr-103',
    userName: 'Lucas Vance',
    userAvatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=120',
    role: 'Kiosk Closer & Sales Tech',
    date: '2026-08-23',
    startTime: '12:00',
    endTime: '20:00',
    assignedZone: 'KIOSK_POS',
    clockInTime: '11:55',
    status: 'CLOCKED_IN'
  }
];

export const MOCK_HOUSING_UNITS: StaffHousingUnit[] = [
  {
    id: 'house-1',
    venueId: 'dest-mallorca',
    buildingName: 'Villa Palm Residences',
    roomNumber: 'A-201',
    capacity: 2,
    currentOccupancy: 2,
    monthlyRentDeduction: 350.00,
    amenities: ['Wi-Fi 6', 'Air Conditioning', 'Kitchenette', 'Private Balcony'],
    status: 'FULL'
  },
  {
    id: 'house-2',
    venueId: 'dest-mallorca',
    buildingName: 'Villa Palm Residences',
    roomNumber: 'A-202',
    capacity: 2,
    currentOccupancy: 1,
    monthlyRentDeduction: 350.00,
    amenities: ['Wi-Fi 6', 'Air Conditioning', 'Private Bathroom'],
    status: 'AVAILABLE'
  },
  {
    id: 'house-3',
    venueId: 'dest-mallorca',
    buildingName: 'Seaside Staff Lodge',
    roomNumber: 'B-104',
    capacity: 3,
    currentOccupancy: 0,
    monthlyRentDeduction: 280.00,
    amenities: ['Wi-Fi 6', 'Laundry Access', 'Shared Lounge'],
    status: 'AVAILABLE'
  }
];

export const MOCK_ACADEMY_COURSES: AcademyCourse[] = [
  {
    id: 'acad-1',
    title: 'Resort Dynamic Posing & Emotion Capture',
    description: 'Learn rapid 30-second group posing techniques for high-conversion beach & pool memories.',
    category: 'POSING_TECHNIQUE',
    durationMinutes: 45,
    totalModules: 5,
    badgeName: 'Master of Posing',
    badgeIconUrl: '🏆'
  },
  {
    id: 'acad-2',
    title: 'Zero-Friction Sales Psychology & Kiosk Handover',
    description: 'How to present photo passes with emotional value proposition and 40%+ closing rate.',
    category: 'GUEST_SALES',
    durationMinutes: 60,
    totalModules: 6,
    badgeName: 'Top Closer Platinum',
    badgeIconUrl: '💎'
  },
  {
    id: 'acad-3',
    title: 'ClickFlash Edge AI & Mobile Pro Rust Core',
    description: 'Offline-first tethering, BLE auto-linking, and fast-culling operations on the field.',
    category: 'CAMERA_OPS',
    durationMinutes: 30,
    totalModules: 4,
    badgeName: 'Edge Ops Certified',
    badgeIconUrl: '⚡'
  }
];

export const MOCK_APPLICANTS: JobApplicant[] = [
  {
    id: 'app-1',
    venueId: 'dest-mallorca',
    jobTitle: 'Seasonal Action Photographer',
    fullName: 'Mateo Hernandez',
    email: 'mateo.photo@example.com',
    phone: '+34 612 884 921',
    portfolioUrl: 'https://instagram.com/mateo_visuals',
    yearsExperience: 4,
    stage: 'PORTFOLIO_REVIEW',
    rating: 5,
    notes: 'Outstanding action framing in surf and watersports.',
    created: '2026-08-21T10:00:00Z'
  },
  {
    id: 'app-2',
    venueId: 'dest-mallorca',
    jobTitle: 'Resort Portrait Specialist',
    fullName: 'Chiara Bianchi',
    email: 'chiara.b@example.com',
    phone: '+39 340 123 9988',
    portfolioUrl: 'https://chiarabianchi.photo',
    yearsExperience: 3,
    stage: 'INTERVIEW_SCHEDULED',
    rating: 4,
    notes: 'Strong natural light portrait portfolio from Amalfi.',
    created: '2026-08-20T14:30:00Z'
  }
];

// =============================================================================
// PILLAR 3: FINANCIALS & SLEEPING MONEY
// =============================================================================

export const MOCK_SLEEPING_MONEY: SleepingMoneyGallery[] = [
  {
    id: 'slp-1',
    venueId: 'dest-mallorca',
    galleryId: 'gal-7821',
    guestName: 'Lars & Anna Bergstrom',
    guestPhone: '+46 70 123 4567',
    guestEmail: 'lars.bergstrom@example.se',
    photoCount: 48,
    abandonedAt: '2026-08-23T16:15:00Z',
    initialCartValue: 120.00,
    recoveryStage: 'TIER_1_15M',
    channelUsed: 'WHATSAPP',
    lastTouchAt: '2026-08-23T16:30:00Z',
    status: 'CONTACTED'
  },
  {
    id: 'slp-2',
    venueId: 'dest-mallorca',
    galleryId: 'gal-7790',
    guestName: 'Dr. Michael Chen & Family',
    guestPhone: '+1 415 889 2011',
    guestEmail: 'mchen@example.com',
    photoCount: 92,
    abandonedAt: '2026-08-22T18:00:00Z',
    initialCartValue: 180.00,
    recoveredValue: 144.00,
    recoveryStage: 'RECOVERED',
    channelUsed: 'WHATSAPP',
    lastTouchAt: '2026-08-23T11:20:00Z',
    status: 'CONVERTED'
  },
  {
    id: 'slp-3',
    venueId: 'dest-mallorca',
    galleryId: 'gal-7650',
    guestName: 'Isabelle Morel',
    guestEmail: 'isabelle.morel@example.fr',
    photoCount: 34,
    abandonedAt: '2026-08-16T15:00:00Z',
    initialCartValue: 85.00,
    recoveryStage: 'TIER_3_7D',
    channelUsed: 'EMAIL',
    lastTouchAt: '2026-08-23T09:00:00Z',
    status: 'PENDING'
  }
];

export const MOCK_CASH_RECONCILIATION: CashReconciliation = {
  id: 'cash-rec-today',
  venueId: 'dest-mallorca',
  terminalId: 'POS-MAIN-01',
  openedByUserId: 'usr-103',
  openedByUserName: 'Lucas Vance',
  shiftDate: '2026-08-23',
  floatAmount: 200.00,
  cashSalesTotal: 1450.00,
  safeDropAmount: 1000.00,
  expectedInDrawer: 650.00,
  actualCounted: 650.00,
  discrepancyAmount: 0.00,
  witnessUserId: 'usr-101',
  witnessName: 'Marco Rossi',
  status: 'BALANCED'
};

export const MOCK_CONSUMABLES: ConsumableExpense[] = [
  {
    id: 'exp-1',
    venueId: 'dest-mallorca',
    category: 'PRINT_PAPER',
    itemName: 'DNP DS620 4x6 Roll Media Pack (800 prints)',
    quantityUnits: 4,
    costPerUnit: 85.00,
    totalCost: 340.00,
    supplierName: 'DNP Photo Imaging Europe',
    purchaseDate: '2026-08-18'
  },
  {
    id: 'exp-2',
    venueId: 'dest-mallorca',
    category: 'WRISTBANDS_RFID',
    itemName: 'ClickFlash Waterproof NFC/QR Wristbands (500 pack)',
    quantityUnits: 2,
    costPerUnit: 65.00,
    totalCost: 130.00,
    supplierName: 'NFC Pass Direct',
    purchaseDate: '2026-08-10'
  }
];

export const MOCK_FRAUD_ALERTS: FraudAlertEvent[] = [
  {
    id: 'fa-1',
    venueId: 'dest-mallorca',
    severity: 'LOW',
    type: 'CASH_DRAWER_OPEN_NO_SALE',
    description: 'Drawer opened manually without an active POS transaction.',
    terminalId: 'POS-MAIN-01',
    involvedUserName: 'Lucas Vance',
    isResolved: true,
    resolvedAt: '2026-08-23T14:10:00Z',
    created: '2026-08-23T14:05:00Z'
  }
];

// =============================================================================
// PILLAR 4: STORE, GAMIFICATION & REVIEW DEFENSE
// =============================================================================

export const MOCK_KEEPSAKE_PRODUCTS: KeepsakeProductItem[] = [
  {
    id: 'prod-c1',
    venueId: 'dest-mallorca',
    name: '3D Holographic Sub-Surface Laser Crystal',
    type: 'CRYSTAL_3D',
    description: 'High-precision sub-surface laser etching inside pure K9 optical crystal with illuminated LED base.',
    retailPrice: 129.00,
    labCostPrice: 38.00,
    grossMarginPercent: 70.5,
    previewImageUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600',
    fulfillmentLab: 'WHITEWALL',
    isAvailable: true
  },
  {
    id: 'prod-f1',
    venueId: 'dest-mallorca',
    name: 'Custom 3D Photorealistic Figurine (15cm)',
    type: 'FIGURINE_MINI',
    description: 'Full-color composite sandstone 3D print generated directly from guest multi-angle photo burst.',
    retailPrice: 169.00,
    labCostPrice: 48.00,
    grossMarginPercent: 71.6,
    previewImageUrl: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=600',
    fulfillmentLab: 'PRODIGI',
    isAvailable: true
  },
  {
    id: 'prod-m1',
    venueId: 'dest-mallorca',
    name: 'ChromaLuxe HD Metallic Float Panel (40x60cm)',
    type: 'METAL_PRINT',
    description: 'Ultra-high gloss dye-sublimation on aluminum sheet with floating rear wall mount.',
    retailPrice: 99.00,
    labCostPrice: 26.00,
    grossMarginPercent: 73.7,
    previewImageUrl: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=600',
    fulfillmentLab: 'LOXLEY',
    isAvailable: true
  }
];

export const MOCK_GAMIFICATION_PROFILES: GamificationProfile[] = [
  {
    id: 'gp-1',
    userId: 'usr-101',
    userName: 'Marco Rossi',
    userAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120',
    venueId: 'dest-mallorca',
    currentLevel: 14,
    currentXp: 8450,
    nextLevelXp: 10000,
    rankPosition: 1,
    dailyPhotosCaptured: 342,
    dailyConversions: 28,
    dailyRevenueGenerated: 2140.00,
    badges: [
      { id: 'b1', title: 'Top Closer Platinum', description: 'Surpassed €2,000 in a single shift', icon: '💎', unlockedAt: '2026-08-23' },
      { id: 'b2', title: 'Hero Snapper', description: 'Captured 300+ emotion-verified photos', icon: '📸', unlockedAt: '2026-08-22' },
      { id: 'b3', title: 'Speed Demon', description: 'Zero upload lag under 1.5s', icon: '⚡', unlockedAt: '2026-08-20' }
    ]
  },
  {
    id: 'gp-2',
    userId: 'usr-102',
    userName: 'Sophie Dubois',
    userAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120',
    venueId: 'dest-mallorca',
    currentLevel: 12,
    currentXp: 6920,
    nextLevelXp: 8000,
    rankPosition: 2,
    dailyPhotosCaptured: 289,
    dailyConversions: 24,
    dailyRevenueGenerated: 1820.00,
    badges: [
      { id: 'b4', title: 'Sunset Queen', description: 'Highest portrait rating at golden hour', icon: '🌅', unlockedAt: '2026-08-21' }
    ]
  }
];

export const MOCK_REVIEW_INTERCEPTIONS: ReviewInterceptionLog[] = [
  {
    id: 'rev-1',
    venueId: 'dest-mallorca',
    guestName: 'Henrik Larsson',
    ratingScore: 2,
    feedbackText: 'Waited 10 minutes at the beach kiosk because only one printer was running.',
    routingResult: 'INTERNAL_RESOLUTION_INTERCEPTED',
    compensationOffered: 'Instant 2x Free High-Res Download Voucher + €10 Resort Cafe Credit',
    isResolvedByManager: true,
    created: '2026-08-23T15:20:00Z'
  },
  {
    id: 'rev-2',
    venueId: 'dest-mallorca',
    guestName: 'Jessica Taylor',
    ratingScore: 5,
    feedbackText: 'Marco took the most breathtaking sunset photos of our family! Unbelievable quality!',
    routingResult: 'GOOGLE_TRIPADVISOR_REDIRECT',
    isResolvedByManager: true,
    created: '2026-08-23T17:40:00Z'
  }
];

// =============================================================================
// PILLAR 5: AI SUITE
// =============================================================================

export const MOCK_AI_COACHING_CARDS: AICoachingCard[] = [
  {
    id: 'coach-1',
    photographerId: 'usr-101',
    photographerName: 'Marco Rossi',
    photoUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600',
    compositionScore: 95,
    smileEyeContactScore: 92,
    horizonTiltDegrees: 0.4,
    lightingScore: 90,
    overallGrade: 'A+',
    coachingTips: [
      'Perfect golden hour rim-lighting on subjects.',
      'Rule of thirds placement of the child walking creates great emotional flow.'
    ],
    evaluatedAt: '2026-08-23T17:15:00Z'
  },
  {
    id: 'coach-2',
    photographerId: 'usr-103',
    photographerName: 'Lucas Vance',
    photoUrl: 'https://images.unsplash.com/photo-1510414842594-a61c69b5ae57?w=600',
    compositionScore: 74,
    smileEyeContactScore: 80,
    horizonTiltDegrees: 3.8,
    lightingScore: 68,
    overallGrade: 'B',
    coachingTips: [
      'Horizon tilt detected at 3.8° — level camera before burst.',
      'Slight backlight shadow on faces — consider AD200Pro fill-flash at 1/32 power.'
    ],
    evaluatedAt: '2026-08-23T16:40:00Z'
  }
];

export const MOCK_RESORT_BLOGS: ResortBlogPostItem[] = [
  {
    id: 'blog-1',
    venueId: 'dest-mallorca',
    title: 'The Ultimate Guide to Capturing Golden Hour Magic in Mallorca',
    slug: 'golden-hour-magic-mallorca-guide',
    summary: 'Discover the top 5 secret viewpoints, ideal lens focal lengths, and lighting angles to capture family memories that last forever.',
    contentMarkdown: `## Golden Hour by the Mediterranean\n\nEvery evening at 19:45, the Balearic sun dips below the turquoise coves of Mallorca...`,
    heroImageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800',
    keywords: ['Mallorca Resort Photography', 'Golden Hour Family Photos', 'ClickFlash Luxury Memories'],
    status: 'PUBLISHED',
    publishedAt: '2026-08-20',
    seoScore: 94
  }
];
