import { BaseRecord } from './index.js';

// =============================================================================
// PILLAR 1: OPERATIONS & HARDWARE EDGE FLEET
// =============================================================================

export type GearCategory = 'BODY' | 'LENS' | 'BATTERY' | 'STROBE' | 'SD_CARD' | 'ACCESSORY';
export type GearStatus = 'AVAILABLE' | 'CHECKED_OUT' | 'MAINTENANCE' | 'RETIRED';

export interface GearAsset extends BaseRecord {
  venueId: string;
  assetTag: string;
  category: GearCategory;
  model: string;
  serialNumber: string;
  conditionRating: number; // 1 to 5
  status: GearStatus;
  assignedToUserId?: string;
  assignedToName?: string;
  batteryHealthPercent?: number;
  shutterCount?: number;
  lastServiceDate?: string;
}

export interface GearCheckout extends BaseRecord {
  gearId: string;
  userId: string;
  userName: string;
  checkoutTime: string;
  returnTime?: string;
  checkoutCondition: number;
  returnCondition?: number;
  notes?: string;
}

export type PrintJobStatus = 'QUEUED' | 'PRINTING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
export type PrintPaperSize = '4x6' | '6x8' | '8x10' | 'A4';

export interface PrintJob extends BaseRecord {
  venueId: string;
  printerName: string;
  orderId: string;
  photoUrl: string;
  thumbnailUrl?: string;
  guestName?: string;
  paperSize: PrintPaperSize;
  copies: number;
  status: PrintJobStatus;
  priority: number; // 1 to 10
  errorMessage?: string;
  submittedAt: string;
  completedAt?: string;
}

export interface PrinterStatus {
  id: string;
  name: string;
  model: string; // e.g. 'DNP DS620', 'DNP RX1HS', 'Citizen CY-02'
  status: 'ONLINE' | 'PRINTING' | 'PAPER_LOW' | 'RIBBON_LOW' | 'OFFLINE' | 'ERROR';
  paperRemaining: number; // count
  ribbonRemainingPercent: number;
  temperatureCelsius: number;
  totalPrintsCounter: number;
  ipAddress?: string;
}

export interface AttractionAnchor extends BaseRecord {
  venueId: string;
  name: string; // e.g. 'Coaster Mega Drop', 'Zip Line Apex', 'Welcome Archway'
  location: string;
  cameraModel: string;
  rtspStreamUrl?: string;
  triggerType: 'OPTICAL_MOTION' | 'INFRARED_BEAM' | 'BLE_PROXIMITY' | 'MANUAL';
  status: 'ONLINE' | 'TRIGGERING' | 'OFFLINE' | 'DEGRADED';
  fps: number;
  shutterSpeed: string;
  photosCapturedToday: number;
  lastTriggerAt?: string;
}

// =============================================================================
// PILLAR 2: PEOPLE, STAFFING & CONCESSION HR
// =============================================================================

export interface ShiftSchedule extends BaseRecord {
  venueId?: string;
  userId?: string;
  userName?: string;
  userAvatar?: string;
  employeeId?: string;
  employeeName?: string;
  role?: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  assignedZone?: 'MAIN_POOL' | 'BEACH_SUNSET' | 'RESORT_ENTRANCE' | 'CABANAS' | 'KIOSK_POS' | 'ROVING' | string;
  clockInTime?: string;
  clockOutTime?: string;
  clockInGps?: { lat: number; lng: number };
  status?: 'SCHEDULED' | 'CLOCKED_IN' | 'COMPLETED' | 'ABSENT' | 'SWAPPED' | string;
}

export interface ZoneRotationSlot {
  id: string;
  zone: string;
  timeSlot: string; // e.g. '10:00 - 11:30'
  photographerId: string;
  photographerName: string;
  isHighDemand: boolean;
}

export interface StaffHousingUnit extends BaseRecord {
  venueId: string;
  buildingName: string;
  roomNumber: string;
  capacity: number;
  currentOccupancy: number;
  monthlyRentDeduction: number;
  amenities: string[];
  status: 'AVAILABLE' | 'FULL' | 'MAINTENANCE';
}

export interface HousingAssignment extends BaseRecord {
  housingId: string;
  userId: string;
  userName: string;
  buildingName: string;
  roomNumber: string;
  checkInDate: string;
  checkOutDate?: string;
  depositAmount: number;
  status: 'ACTIVE' | 'CHECKED_OUT';
}

export interface AcademyCourse extends BaseRecord {
  title: string;
  description: string;
  category: 'ONBOARDING' | 'POSING_TECHNIQUE' | 'GUEST_SALES' | 'SAFETY_COMPLIANCE' | 'CAMERA_OPS';
  durationMinutes: number;
  totalModules: number;
  badgeName: string;
  badgeIconUrl?: string;
}

export interface StaffAcademyProgress extends BaseRecord {
  userId: string;
  courseId: string;
  courseTitle: string;
  modulesCompleted: number;
  totalModules: number;
  scorePercent: number;
  certifiedAt?: string;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'CERTIFIED';
}

export interface JobApplicant extends BaseRecord {
  venueId: string;
  jobTitle: string;
  fullName: string;
  email: string;
  phone: string;
  portfolioUrl?: string;
  yearsExperience: number;
  stage: 'APPLIED' | 'PORTFOLIO_REVIEW' | 'INTERVIEW_SCHEDULED' | 'OFFER_SENT' | 'HIRED' | 'REJECTED';
  rating: number; // 1 to 5
  notes?: string;
}

// =============================================================================
// PILLAR 3: FINANCIALS & "SLEEPING MONEY" RECOVERY
// =============================================================================

export interface SleepingMoneyGallery extends BaseRecord {
  venueId?: string;
  galleryId: string;
  guestId?: string;
  guestPhone?: string;
  phone?: string;
  guestEmail?: string;
  email?: string;
  guestName?: string;
  photoCount?: number;
  totalPhotos?: number;
  abandonedAt?: string;
  initialCartValue?: number;
  galleryValue?: number;
  hoursUnsold?: number;
  currentDiscountPercent?: number;
  urgencyLevel?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | string;
  closerSwarmHandoff?: boolean;
  lastMessageSent?: string;
  recoveredValue?: number;
  recoveryStage?: 'TIER_1_15M' | 'TIER_2_24H' | 'TIER_3_7D' | 'RECOVERED' | 'EXPIRED' | string;
  channelUsed?: 'WHATSAPP' | 'EMAIL' | 'SMS' | string;
  lastTouchAt?: string;
  status?: 'PENDING' | 'CONTACTED' | 'CONVERTED' | 'RECOVERED' | 'EXPIRED' | 'PENDING_OFFER' | 'OFFER_SENT' | string;
}

export interface CashReconciliation extends BaseRecord {
  venueId?: string;
  terminalId?: string;
  openedByUserId?: string;
  openedByUserName?: string;
  closedByUserId?: string;
  closedByUserName?: string;
  cashierId?: string;
  cashierName?: string;
  shiftDate: string;
  floatAmount?: number;
  openingFloat?: number;
  cashSalesTotal?: number;
  cashSalesRecorded?: number;
  safeDropAmount?: number;
  safeDrops?: number;
  expectedInDrawer?: number;
  actualCounted?: number;
  closingCashCounted?: number;
  discrepancyAmount?: number;
  discrepancy?: number;
  witnessUserId?: string;
  witnessName?: string;
  verifiedByManagerId?: string;
  notes?: string;
  status?: 'OPEN' | 'BALANCED' | 'DISCREPANCY_FLAGGED' | 'RESOLVED' | 'RECONCILED' | 'INVESTIGATION_REQUIRED' | string;
}

export interface ConsumableExpense extends BaseRecord {
  venueId: string;
  category: 'PRINT_PAPER' | 'INK_RIBBONS' | 'WRISTBANDS_RFID' | 'BATTERIES_SPARES' | 'PACKAGING';
  itemName: string;
  quantityUnits: number;
  costPerUnit: number;
  totalCost: number;
  supplierName: string;
  invoiceNumber?: string;
  purchaseDate: string;
}

export interface FraudAlertEvent extends BaseRecord {
  venueId: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  type: 'UNAUTHORIZED_PRINT' | 'CASH_DRAWER_OPEN_NO_SALE' | 'EXCESSIVE_COMPLIMENTARY' | 'UNLINKED_PHOTO_DELIVERY';
  description: string;
  terminalId?: string;
  involvedUserId?: string;
  involvedUserName?: string;
  evidenceSnapshotUrl?: string;
  isResolved: boolean;
  resolvedByUserId?: string;
  resolvedAt?: string;
}

// =============================================================================
// PILLAR 4: SALES, KEEPSAKES & GAMIFICATION
// =============================================================================

export interface KeepsakeProductItem extends BaseRecord {
  venueId: string;
  name: string;
  type: 'CRYSTAL_3D' | 'FIGURINE_MINI' | 'METAL_PRINT' | 'PHOTO_ALBUM_LUX' | 'CANVAS_WRAP';
  description: string;
  retailPrice: number;
  labCostPrice: number;
  grossMarginPercent: number;
  previewImageUrl: string;
  fulfillmentLab: 'WHITEWALL' | 'PRODIGI' | 'LOXLEY' | 'LOCAL_EDGE';
  isAvailable: boolean;
}

export interface GamificationProfile extends BaseRecord {
  userId: string;
  userName: string;
  userAvatar?: string;
  venueId: string;
  currentLevel: number;
  currentXp: number;
  nextLevelXp: number;
  rankPosition: number;
  dailyPhotosCaptured: number;
  dailyConversions: number;
  dailyRevenueGenerated: number;
  badges: Array<{
    id: string;
    title: string;
    description: string;
    icon: string;
    unlockedAt: string;
  }>;
}

export interface ReviewInterceptionLog extends BaseRecord {
  venueId: string;
  guestName: string;
  guestEmail?: string;
  guestPhone?: string;
  ratingScore: number; // 1 to 5
  feedbackText: string;
  routingResult: 'GOOGLE_TRIPADVISOR_REDIRECT' | 'INTERNAL_RESOLUTION_INTERCEPTED';
  compensationOffered?: string; // e.g. 'Free Digital Upgrade Voucher'
  isResolvedByManager: boolean;
}

// =============================================================================
// PILLAR 5: AI SUITE & CONTENT INTELLIGENCE
// =============================================================================

export interface AICoachingCard extends BaseRecord {
  id: string;
  photographerId: string;
  photographerName?: string;
  photoUrl?: string;
  photoId?: string;
  compositionScore: number; // 0 to 100
  ruleOfThirdsScore?: number; // 0 to 100
  smileEyeContactScore: number; // 0 to 100
  smileClarityPercent?: number;
  exposureQualityScore?: number;
  horizonTiltDegrees: number;
  lightingScore: number; // 0 to 100
  overallGrade: 'A+' | 'A' | 'B' | 'C' | 'RETAKE' | string;
  coachingTips: string[];
  actionableFeedback?: string[];
  suggestedRetouchPreset?: string;
  evaluatedAt: string;
}

export interface ResortBlogPostItem extends BaseRecord {
  venueId: string;
  title: string;
  slug: string;
  summary: string;
  contentMarkdown: string;
  heroImageUrl: string;
  keywords: string[];
  status: 'DRAFT' | 'PUBLISHED' | 'SCHEDULED';
  publishedAt?: string;
  seoScore: number;
}

export interface BotBridgeNotification {
  id: string;
  channel: 'TELEGRAM' | 'WHATSAPP';
  recipientId: string;
  topic: 'MORNING_BRIEFING' | 'CRITICAL_ALERT' | 'SHIFT_NOTIFICATION' | 'REVENUE_PULSE';
  title: string;
  message: string;
  sentAt: string;
  delivered: boolean;
}

// Backward compatibility aliases
export type AiCoachAnalysis = AICoachingCard;
export type SleepingMoneyLead = SleepingMoneyGallery;
export type CashDrawerRecord = CashReconciliation;
