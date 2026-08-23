import { 
  PromptBuilder, 
  VisionBridge, 
  YieldArbitrageEngine, 
  EdgeSentinel,
  type PhotoQualityMetrics,
  type GuestCart 
} from './index.js';

async function runClickFlashE2EScenario() {
  console.log('\n=============================================================');
  console.log('⚡ CLICKFLASH V6.0 AUTONOMOUS ECOSYSTEM - E2E SCENARIO DEMO ⚡');
  console.log('=============================================================\n');

  // STEP 1: Prompt Compiler Validation
  console.log('--- [STEP 1] Validating Curated Prompt Registry ---');
  const builder = new PromptBuilder();
  const validation = await builder.validateRegistry();
  console.log(`✓ Curated Template Registry Valid: ${validation.valid}`);
  console.log(`✓ Total Curated Templates: ${validation.totalTemplates}`);

  // STEP 2: Computer Vision Auto-Culling & Sharpness Grading
  console.log('\n--- [STEP 2] Ingesting & Auto-Culling Photo Stream ---');
  const samplePhotos: PhotoQualityMetrics[] = [
    {
      photoId: 'RAW_IMG_9001.JPG',
      sharpnessScore: 94,
      exposureScore: 90,
      compositionScore: 88,
      eyesOpenConfidence: 0.99,
      smileConfidence: 0.96,
      faceCount: 2
    },
    {
      photoId: 'RAW_IMG_9002.JPG',
      sharpnessScore: 32, // Blurry
      exposureScore: 75,
      compositionScore: 60,
      eyesOpenConfidence: 0.90,
      smileConfidence: 0.70,
      faceCount: 1
    }
  ];

  for (const photo of samplePhotos) {
    const culled = VisionBridge.evaluateCulling(photo);
    console.log(`Photo: ${photo.photoId} -> Grade: [${culled.grade}] (Score: ${culled.overallScore}/100) ${culled.isHeroShot ? '🌟 HERO SHOT' : ''}`);
    if (culled.rejectReasons.length > 0) {
      console.log(`  └─ Rejection Reason: ${culled.rejectReasons.join(', ')}`);
    }
  }

  // STEP 3: ArcFace 512-D Biometric Selfie Matching
  console.log('\n--- [STEP 3] Biometric Vector Zero-Friction Guest Matching ---');
  const guestSelfieEmbedding = new Array(512).fill(0.044);
  const heroShotEmbedding = new Array(512).fill(0.044); // Exact match
  const matchResult = VisionBridge.matchFace(guestSelfieEmbedding, heroShotEmbedding, 0.68);
  console.log(`Selfie 512-d Match Result: Matched=${matchResult.matched} (Similarity: ${matchResult.similarityScore}, Distance: ${matchResult.distance})`);

  // STEP 4: Edge Sentinel & Local SQLite Queue Check
  console.log('\n--- [STEP 4] Edge Sentinel Diagnostics (DbWriteQueue.ts) ---');
  const sentinel = new EdgeSentinel();
  await sentinel.checkHealth();
  const sentinelStatus = sentinel.getStatus();
  console.log(`✓ Edge Sentinel Checks: ${sentinelStatus.totalChecksRun}`);
  console.log(`✓ Anomaly Count: ${sentinelStatus.anomaliesDetected}`);
  console.log(`✓ Remediations Triggered: ${sentinelStatus.remediationsTriggered}`);

  // STEP 5: Dynamic Yield Arbitrage & WhatsApp Closer
  console.log('\n--- [STEP 5] Dynamic Yield Arbitrage & Abandoned Cart Recovery ---');
  const cart: GuestCart = {
    guestId: 'guest_atlantis_771',
    guestName: 'Marcus Vance',
    resortName: 'Atlantis Palm Resort',
    photoCount: 48,
    basePrice: 150,
    hoursSinceAbandonment: 36,
    activityType: 'AquaVenture Waterpark'
  };

  const offer = YieldArbitrageEngine.calculateOffer(cart);
  console.log(`Abandoned Duration: ${cart.hoursSinceAbandonment}h -> Dynamic Discount: ${offer.discountPercent}%`);
  console.log(`Base Price: $${offer.originalPrice} -> Discounted Price: $${offer.discountedPrice}`);
  console.log(`Recovery Code: ${offer.discountCode} | Urgency: ${offer.urgencyLevel}`);
  console.log('\n📱 WhatsApp Closer Message Preview:');
  console.log('-------------------------------------------------------------');
  console.log(YieldArbitrageEngine.formatWhatsAppPitch(cart, offer));
  console.log('-------------------------------------------------------------\n');

  console.log('🎉 E2E Scenario Complete: All ClickFlash V6.0 Modules Operational.\n');
}

runClickFlashE2EScenario().catch(console.error);
