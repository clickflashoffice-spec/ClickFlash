#!/usr/bin/env tsx
/**
 * ClickFlash Yield Arbitrage & Whale Negotiation Benchmark Engine
 * Simulates 10,000 synthetic resort guest checkout journeys to measure gross revenue lift,
 * elasticity curves, and abandoned cart recapture rates.
 */

import { yieldPricingService } from '../packages/utils/src/yieldPricing';
import type { CrowdDensity, WeatherCondition, TimeOfDay, YieldPricingConfig } from '../packages/types/src';

interface GuestProfile {
  id: string;
  isVip: boolean;
  totalPhotos: number;
  willingnessToPay: number; // Max dollars guest is willing to spend
  abandonmentProbability: number;
  timeOfDay: TimeOfDay;
  weather: WeatherCondition;
  crowdDensity: CrowdDensity;
}

const DEFAULT_CONFIG: YieldPricingConfig = {
  destinationId: 'dest_orlando_flagship',
  basePrice: 19.99,
  minPrice: 14.99,
  maxPrice: 49.99,
  algorithm: 'surge',
  rules: {
    crowdDensityMultiplier: {
      'Low': 0.9,
      'Medium': 1.0,
      'High': 1.2,
      'Peak': 1.4
    },
    timeOfDayMultipliers: {
      'Morning': 0.95,
      'Afternoon': 1.15,
      'Evening': 1.25,
      'Night': 1.0
    },
    weatherMultiplier: {
      'Clear': 1.15,
      'Cloudy': 1.0,
      'Rain': 0.85,
      'Storm': 0.75
    }
  },
  isActive: true
};

function generateSyntheticGuests(count: number): GuestProfile[] {
  const times: TimeOfDay[] = ['Morning', 'Afternoon', 'Evening', 'Night'];
  const weathers: WeatherCondition[] = ['Clear', 'Cloudy', 'Rain', 'Storm'];
  const crowds: CrowdDensity[] = ['Low', 'Medium', 'High', 'Peak'];

  const guests: GuestProfile[] = [];
  for (let i = 0; i < count; i++) {
    const isVip = Math.random() < 0.08; // 8% Whale / VIP leads
    const totalPhotos = isVip ? Math.floor(Math.random() * 150) + 50 : Math.floor(Math.random() * 30) + 3;
    const willingnessToPay = isVip
      ? Math.floor(Math.random() * 120) + 60
      : Math.floor(Math.random() * 35) + 12;

    const timeOfDay = times[Math.floor(Math.random() * times.length)];
    const weather = weathers[Math.random() < 0.7 ? 0 : Math.floor(Math.random() * weathers.length)];
    const crowdDensity = crowds[Math.floor(Math.random() * crowds.length)];

    guests.push({
      id: `guest_${i.toString().padStart(5, '0')}`,
      isVip,
      totalPhotos,
      willingnessToPay,
      abandonmentProbability: 0.35 + (Math.random() * 0.3),
      timeOfDay,
      weather,
      crowdDensity
    });
  }
  return guests;
}

export function runYieldBenchmark(guestCount = 10000) {
  console.log('\n================================================================');
  console.log(`📊 ClickFlash Yield Arbitrage Benchmark (${guestCount.toLocaleString()} Guests)`);
  console.log('================================================================\n');

  const guests = generateSyntheticGuests(guestCount);

  // 1. Model A: Legacy Static Baseline ($19.99 flat, 0 recovery)
  let modelARevenue = 0;
  let modelASales = 0;
  let modelAAbandoned = 0;

  for (const guest of guests) {
    const price = 19.99;
    const willAbandon = Math.random() < guest.abandonmentProbability;

    if (willAbandon) {
      modelAAbandoned++;
    } else if (guest.willingnessToPay >= price) {
      modelARevenue += price;
      modelASales++;
    }
  }

  // 2. Model B: Dynamic Multi-Tier Yield (No WhatsApp Swarm)
  let modelBRevenue = 0;
  let modelBSales = 0;
  let modelBAbandoned = 0;

  for (const guest of guests) {
    const price = yieldPricingService.evaluateYield(DEFAULT_CONFIG, {
      crowdDensity: guest.crowdDensity,
      timeOfDay: guest.timeOfDay,
      weather: guest.weather
    });

    const willAbandon = Math.random() < guest.abandonmentProbability;
    if (willAbandon) {
      modelBAbandoned++;
    } else if (guest.willingnessToPay >= price) {
      modelBRevenue += price;
      modelBSales++;
    }
  }

  // 3. Model C: Autonomous ClickFlash Ecosystem (Dynamic Yield + WhatsApp Closer Swarm + Whale Bundles)
  let modelCRevenue = 0;
  let modelCSales = 0;
  let modelCRecovered = 0;
  let whaleBundlesSold = 0;

  for (const guest of guests) {
    let price = yieldPricingService.evaluateYield(DEFAULT_CONFIG, {
      crowdDensity: guest.crowdDensity,
      timeOfDay: guest.timeOfDay,
      weather: guest.weather
    });

    // Whale VIP Upsell: Guests with 50+ photos get offered the All-Inclusive VIP Photobook ($89-$149)
    if (guest.isVip && guest.willingnessToPay >= 79) {
      price = 89.00;
    }

    const willAbandon = Math.random() < guest.abandonmentProbability;

    if (!willAbandon && guest.willingnessToPay >= price) {
      modelCRevenue += price;
      modelCSales++;
      if (guest.isVip) whaleBundlesSold++;
    } else if (willAbandon) {
      // WhatsApp Closer Swarm engages abandoned cart with personalized 20% discount (MEMORIES20)
      const discountedPrice = Math.round(price * 0.8 * 100) / 100;
      const swarmConversionChance = 0.42; // 42% closer bot conversion rate

      if (Math.random() < swarmConversionChance && guest.willingnessToPay >= discountedPrice) {
        modelCRevenue += discountedPrice;
        modelCSales++;
        modelCRecovered++;
        if (guest.isVip) whaleBundlesSold++;
      }
    }
  }

  const yieldLiftB = ((modelBRevenue - modelARevenue) / modelARevenue) * 100;
  const yieldLiftC = ((modelCRevenue - modelARevenue) / modelARevenue) * 100;

  console.log('📈 Benchmark Results Summary:');
  console.log('----------------------------------------------------------------');
  console.log(`1️⃣ Model A (Legacy Static $19.99):`);
  console.log(`   - Gross Revenue:      $${modelARevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
  console.log(`   - Converted Sales:    ${modelASales.toLocaleString()} orders`);
  console.log(`   - Abandoned Carts:    ${modelAAbandoned.toLocaleString()} lost`);
  console.log('');
  console.log(`2️⃣ Model B (Dynamic Yield Pricing):`);
  console.log(`   - Gross Revenue:      $${modelBRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
  console.log(`   - Revenue Lift:       +${yieldLiftB.toFixed(1)}%`);
  console.log('');
  console.log(`3️⃣ Model C (ClickFlash Ecosystem V7.0 - Dynamic Yield + WhatsApp Swarm + Whale Upsell):`);
  console.log(`   - Gross Revenue:      $${modelCRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
  console.log(`   - Total Converted:    ${modelCSales.toLocaleString()} orders`);
  console.log(`   - WhatsApp Recovered: ${modelCRecovered.toLocaleString()} abandoned carts closed`);
  console.log(`   - VIP Whale Packages: ${whaleBundlesSold.toLocaleString()} high-ticket bundles ($89)`);
  console.log(`   - Net Ecosystem Lift: +${yieldLiftC.toFixed(1)}% 🚀`);
  console.log('================================================================\n');

  return {
    modelARevenue,
    modelBRevenue,
    modelCRevenue,
    yieldLiftC,
    modelCRecovered,
    whaleBundlesSold
  };
}

if (process.argv[1] && process.argv[1].includes('benchmark-yield-arbitrage')) {
  runYieldBenchmark(10000);
}
