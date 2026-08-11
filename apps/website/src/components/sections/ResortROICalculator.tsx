'use client';

import React, { useState } from 'react';
import { Calculator, TrendingUp, Sparkles, DollarSign, Building2, Users } from 'lucide-react';

export function ResortROICalculator() {
  const [roomsCount, setRoomsCount] = useState(250);
  const [occupancyRate, setOccupancyRate] = useState(80);
  const [avgPackagePrice, setAvgPackagePrice] = useState(49);
  const [captureRate, setCaptureRate] = useState(35); // 35% with ClickFlash AI Kiosks

  // Calculations
  const monthlyGuests = Math.round((roomsCount * (occupancyRate / 100) * 2.2 * 30) / 4); // Avg 4-day stay
  const purchasingGuests = Math.round(monthlyGuests * (captureRate / 100));
  const monthlyPhotoRevenue = purchasingGuests * avgPackagePrice;
  const annualPhotoRevenue = monthlyPhotoRevenue * 12;

  // Comparison with legacy photo concession (12% capture rate, €35 avg price)
  const legacyMonthlyRevenue = Math.round(monthlyGuests * 0.12 * 35);
  const legacyAnnualRevenue = legacyMonthlyRevenue * 12;
  const annualUplift = annualPhotoRevenue - legacyAnnualRevenue;

  return (
    <section className="py-24 bg-gradient-to-b from-zinc-950 via-zinc-900 to-black text-white relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-4">
            <Calculator className="w-3.5 h-3.5" />
            Resort Financial Calculator
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight">
            Calculate Your Resort's <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">Photo Revenue Potential</span>
          </h2>
          <p className="mt-4 text-lg text-zinc-400">
            See how ClickFlash AI Kiosks and automated face search increase capture rates from 12% to over 35%.
          </p>
        </div>

        {/* Calculator Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Sliders Area */}
          <div className="lg:col-span-7 bg-zinc-900/70 border border-zinc-800 rounded-3xl p-8 backdrop-blur-xl space-y-8">
            {/* Rooms Slider */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <label className="text-sm font-bold text-zinc-300 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-cyan-400" />
                  Total Resort Rooms / Villas
                </label>
                <span className="text-lg font-black text-white">{roomsCount} rooms</span>
              </div>
              <input
                type="range"
                min="50"
                max="1000"
                step="25"
                value={roomsCount}
                onChange={(e) => setRoomsCount(Number(e.target.value))}
                className="w-full h-2 bg-zinc-750 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
              <div className="flex justify-between text-xs text-zinc-400 mt-1 font-medium">
                <span>50 Rooms</span>
                <span>500 Rooms</span>
                <span>1,000+ Rooms</span>
              </div>
            </div>

            {/* Occupancy Rate */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <label className="text-sm font-bold text-zinc-300 flex items-center gap-2">
                  <Users className="w-4 h-4 text-emerald-400" />
                  Average Annual Occupancy
                </label>
                <span className="text-lg font-black text-white">{occupancyRate}%</span>
              </div>
              <input
                type="range"
                min="40"
                max="100"
                step="5"
                value={occupancyRate}
                onChange={(e) => setOccupancyRate(Number(e.target.value))}
                className="w-full h-2 bg-zinc-750 rounded-lg appearance-none cursor-pointer accent-emerald-400"
              />
              <div className="flex justify-between text-xs text-zinc-400 mt-1 font-medium">
                <span>40% (Off-Peak)</span>
                <span>75% (Standard)</span>
                <span>100% (Full)</span>
              </div>
            </div>

            {/* Package Price */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <label className="text-sm font-bold text-zinc-300 flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-amber-400" />
                  Average Digital Photo Package Price
                </label>
                <span className="text-lg font-black text-white">€{avgPackagePrice}</span>
              </div>
              <input
                type="range"
                min="25"
                max="120"
                step="5"
                value={avgPackagePrice}
                onChange={(e) => setAvgPackagePrice(Number(e.target.value))}
                className="w-full h-2 bg-zinc-750 rounded-lg appearance-none cursor-pointer accent-amber-400"
              />
              <div className="flex justify-between text-xs text-zinc-400 mt-1 font-medium">
                <span>€25 (Starter)</span>
                <span>€50 (Standard)</span>
                <span>€120 (VIP All-Inclusive)</span>
              </div>
            </div>

            {/* ClickFlash AI Capture Rate */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <label className="text-sm font-bold text-zinc-300 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  ClickFlash AI Conversion Capture Rate
                </label>
                <span className="text-lg font-black text-purple-400">{captureRate}%</span>
              </div>
              <input
                type="range"
                min="20"
                max="55"
                step="1"
                value={captureRate}
                onChange={(e) => setCaptureRate(Number(e.target.value))}
                className="w-full h-2 bg-zinc-750 rounded-lg appearance-none cursor-pointer accent-purple-400"
              />
              <div className="flex justify-between text-xs text-zinc-400 mt-1 font-medium">
                <span>20% (Conservative)</span>
                <span>35% (Average AI)</span>
                <span>55% (High-Touch Resort)</span>
              </div>
            </div>
          </div>

          {/* Result Card */}
          <div className="lg:col-span-5 bg-gradient-to-b from-emerald-950/40 via-zinc-900 to-zinc-950 border border-emerald-500/30 rounded-3xl p-8 backdrop-blur-xl shadow-2xl relative">
            <div className="space-y-6">
              <div>
                <span className="text-xs font-black uppercase tracking-wider text-emerald-400">
                  Projected Annual Photo Revenue
                </span>
                <div className="text-4xl sm:text-5xl font-black text-white tracking-tight mt-2">
                  €{annualPhotoRevenue.toLocaleString()}
                </div>
                <div className="text-sm text-zinc-400 mt-1">
                  ~€{monthlyPhotoRevenue.toLocaleString()} / month in direct high-margin revenue
                </div>
              </div>

              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                  <TrendingUp className="w-4 h-4" />
                  +€{annualUplift.toLocaleString()} Annual Uplift
                </div>
                <p className="text-xs text-zinc-300 mt-1 leading-relaxed">
                  Compared to traditional legacy photo concessions with static print folders.
                </p>
              </div>

              {/* Breakdown */}
              <div className="space-y-3 pt-2 border-t border-zinc-800 text-sm">
                <div className="flex justify-between text-zinc-400">
                  <span>Estimated Monthly Guest Groups:</span>
                  <span className="font-semibold text-zinc-200">{monthlyGuests.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Active Purchasing Families:</span>
                  <span className="font-semibold text-zinc-200">{purchasingGuests.toLocaleString()} / mo</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Software & AI Operating Margin:</span>
                  <span className="font-semibold text-emerald-400">&gt;88%</span>
                </div>
              </div>

              <button
                onClick={() => {
                  const el = document.getElementById('contact');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-black font-extrabold text-base hover:opacity-90 transition-opacity shadow-lg shadow-emerald-500/20"
              >
                Schedule Resort Pilot Demo →
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
