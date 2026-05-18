import React, { useState, useEffect, useCallback, memo } from "react";
import { apiService } from "../../services/apiService.ts";
import { useCurrency } from "../CurrencyContext.tsx";
import Card from "../common/Card.tsx";
import Spinner from "../common/Spinner.tsx";
import { HOTELS } from "../../constants.ts";

interface PricingOverride {
  id: string;
  product_id: string;
  hotel_id: string;
  price: number;
}

interface SeasonalRate {
  id: string;
  name: string;
  hotel_id: string | null;
  multiplier: number;
  start_date: string;
  end_date: string;
  priority: number;
  is_active: number;
}

interface Product {
  id: string;
  name: string;
  price: number;
  category?: string;
}

/**
 * PricingRulesPanel — Manage hotel-specific overrides and seasonal rate multipliers.
 * Renders as a tab inside ProductsPage.
 */
const PricingRulesPanel: React.FC = () => {
  const { formatCurrency } = useCurrency();
  const [products, setProducts] = useState<Product[]>([]);
  const [overrides, setOverrides] = useState<PricingOverride[]>([]);
  const [seasonalRates, setSeasonalRates] = useState<SeasonalRate[]>([]);
  const [loading, setLoading] = useState(true);

  // Override form
  const [overrideProductId, setOverrideProductId] = useState("");
  const [overrideHotelId, setOverrideHotelId] = useState("");
  const [overridePrice, setOverridePrice] = useState("");

  // Seasonal rate form
  const [rateName, setRateName] = useState("");
  const [rateHotelId, setRateHotelId] = useState("");
  const [rateMultiplier, setRateMultiplier] = useState("1.0");
  const [rateStartDate, setRateStartDate] = useState("");
  const [rateEndDate, setRateEndDate] = useState("");
  const [ratePriority, setRatePriority] = useState("0");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [productsData, overridesData, ratesData] = await Promise.all([
        apiService.getProducts(),
        apiService.getCollection("pricing_overrides"),
        apiService.getCollection("seasonal_rates"),
      ]);
      setProducts(productsData);
      setOverrides((overridesData?.items || []) as PricingOverride[]);
      setSeasonalRates((ratesData?.items || []) as SeasonalRate[]);
    } catch (e) {
      console.error("Failed to load pricing data", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSaveOverride = async () => {
    if (!overrideProductId || !overrideHotelId || !overridePrice) return;
    try {
      await apiService.createRecord("pricing_overrides", {
        id: crypto.randomUUID(),
        product_id: overrideProductId,
        hotel_id: overrideHotelId,
        price: parseFloat(overridePrice),
      });
      setOverrideProductId("");
      setOverrideHotelId("");
      setOverridePrice("");
      fetchData();
    } catch (e) {
      console.error("Failed to save override", e);
    }
  };

  const handleDeleteOverride = async (id: string) => {
    try {
      await apiService.deleteRecord("pricing_overrides", id);
      fetchData();
    } catch (e) {
      console.error("Failed to delete override", e);
    }
  };

  const handleSaveRate = async () => {
    if (!rateName || !rateStartDate || !rateEndDate) return;
    try {
      await apiService.createRecord("seasonal_rates", {
        id: crypto.randomUUID(),
        name: rateName,
        hotel_id: rateHotelId || null,
        multiplier: parseFloat(rateMultiplier) || 1.0,
        start_date: rateStartDate,
        end_date: rateEndDate,
        priority: parseInt(ratePriority, 10) || 0,
        is_active: 1,
      });
      setRateName("");
      setRateHotelId("");
      setRateMultiplier("1.0");
      setRateStartDate("");
      setRateEndDate("");
      setRatePriority("0");
      fetchData();
    } catch (e) {
      console.error("Failed to save seasonal rate", e);
    }
  };

  const handleToggleRate = async (rate: SeasonalRate) => {
    try {
      await apiService.updateRecord("seasonal_rates", rate.id, {
        is_active: rate.is_active ? 0 : 1,
      });
      fetchData();
    } catch (e) {
      console.error("Failed to toggle rate", e);
    }
  };

  const handleDeleteRate = async (id: string) => {
    try {
      await apiService.deleteRecord("seasonal_rates", id);
      fetchData();
    } catch (e) {
      console.error("Failed to delete rate", e);
    }
  };

  const getProductName = (id: string) => products.find((p) => p.id === id)?.name || id;
  const getHotelName = (id: string | null) => {
    if (!id) return "All Hotels";
    return HOTELS.find((h) => h.id === id)?.name || id;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Hotel Price Overrides */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 mb-4">Hotel Price Overrides</h2>
        <p className="text-sm text-slate-500 mb-4">
          Set different prices for specific hotels. When a hotel has an override, it takes precedence over the base product price.
        </p>

        <Card className="mb-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Product</label>
              <select
                value={overrideProductId}
                onChange={(e) => setOverrideProductId(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-cyan-500"
              >
                <option value="">Select product...</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} ({formatCurrency(p.price)})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Hotel</label>
              <select
                value={overrideHotelId}
                onChange={(e) => setOverrideHotelId(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-cyan-500"
              >
                <option value="">Select hotel...</option>
                {HOTELS.map((h) => (
                  <option key={h.id} value={h.id}>{h.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Override Price</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={overridePrice}
                onChange={(e) => setOverridePrice(e.target.value)}
                placeholder="0.00"
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>
            <button
              onClick={handleSaveOverride}
              disabled={!overrideProductId || !overrideHotelId || !overridePrice}
              className="bg-cyan-600 hover:bg-cyan-700 disabled:bg-slate-300 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm"
            >
              Add Override
            </button>
          </div>
        </Card>

        {overrides.length > 0 ? (
          <Card className="!p-0">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="p-3 text-xs font-bold text-slate-500 uppercase">Product</th>
                  <th className="p-3 text-xs font-bold text-slate-500 uppercase">Hotel</th>
                  <th className="p-3 text-xs font-bold text-slate-500 uppercase text-right">Base Price</th>
                  <th className="p-3 text-xs font-bold text-slate-500 uppercase text-right">Override Price</th>
                  <th className="p-3 text-xs font-bold text-slate-500 uppercase text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {overrides.map((o) => {
                  const product = products.find((p) => p.id === o.product_id);
                  return (
                    <tr key={o.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="p-3 font-semibold text-slate-900">{getProductName(o.product_id)}</td>
                      <td className="p-3 text-slate-600">{getHotelName(o.hotel_id)}</td>
                      <td className="p-3 text-right text-slate-400 line-through">{product ? formatCurrency(product.price) : "-"}</td>
                      <td className="p-3 text-right font-bold text-green-600">{formatCurrency(o.price)}</td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => handleDeleteOverride(o.id)}
                          className="text-red-500 hover:text-red-700 text-sm font-semibold"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
        ) : (
          <Card>
            <p className="text-center text-slate-400 py-4">No hotel-specific price overrides configured.</p>
          </Card>
        )}
      </div>

      {/* Seasonal Rates */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 mb-4">Seasonal Rate Multipliers</h2>
        <p className="text-sm text-slate-500 mb-4">
          Apply percentage adjustments for date ranges. A multiplier of 1.2 means +20% on all prices during that period. Higher priority wins when ranges overlap.
        </p>

        <Card className="mb-4">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3 items-end">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Season Name</label>
              <input
                type="text"
                value={rateName}
                onChange={(e) => setRateName(e.target.value)}
                placeholder="Summer Peak 2026"
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Hotel (optional)</label>
              <select
                value={rateHotelId}
                onChange={(e) => setRateHotelId(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-cyan-500"
              >
                <option value="">All Hotels</option>
                {HOTELS.map((h) => (
                  <option key={h.id} value={h.id}>{h.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Multiplier</label>
              <input
                type="number"
                step="0.05"
                min="0.1"
                max="3.0"
                value={rateMultiplier}
                onChange={(e) => setRateMultiplier(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Start Date</label>
              <input
                type="date"
                value={rateStartDate}
                onChange={(e) => setRateStartDate(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">End Date</label>
              <input
                type="date"
                value={rateEndDate}
                onChange={(e) => setRateEndDate(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>
            <button
              onClick={handleSaveRate}
              disabled={!rateName || !rateStartDate || !rateEndDate}
              className="bg-cyan-600 hover:bg-cyan-700 disabled:bg-slate-300 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm"
            >
              Add Season
            </button>
          </div>
        </Card>

        {seasonalRates.length > 0 ? (
          <Card className="!p-0">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="p-3 text-xs font-bold text-slate-500 uppercase">Season</th>
                  <th className="p-3 text-xs font-bold text-slate-500 uppercase">Hotel</th>
                  <th className="p-3 text-xs font-bold text-slate-500 uppercase text-center">Multiplier</th>
                  <th className="p-3 text-xs font-bold text-slate-500 uppercase">Period</th>
                  <th className="p-3 text-xs font-bold text-slate-500 uppercase text-center">Status</th>
                  <th className="p-3 text-xs font-bold text-slate-500 uppercase text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {seasonalRates.map((r) => {
                  const pctChange = ((r.multiplier - 1) * 100).toFixed(0);
                  const isIncrease = r.multiplier > 1;
                  const isDecrease = r.multiplier < 1;
                  return (
                    <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="p-3 font-semibold text-slate-900">{r.name}</td>
                      <td className="p-3 text-slate-600">{getHotelName(r.hotel_id)}</td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${
                          isIncrease ? "bg-red-50 text-red-600" :
                          isDecrease ? "bg-green-50 text-green-600" :
                          "bg-slate-100 text-slate-600"
                        }`}>
                          {isIncrease ? "+" : ""}{pctChange}%
                        </span>
                      </td>
                      <td className="p-3 text-slate-600 text-sm">{r.start_date} to {r.end_date}</td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => handleToggleRate(r)}
                          className={`px-2.5 py-1 rounded-full text-xs font-bold transition-colors ${
                            r.is_active
                              ? "bg-green-100 text-green-700 hover:bg-green-200"
                              : "bg-slate-100 text-slate-400 hover:bg-slate-200"
                          }`}
                        >
                          {r.is_active ? "Active" : "Inactive"}
                        </button>
                      </td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => handleDeleteRate(r.id)}
                          className="text-red-500 hover:text-red-700 text-sm font-semibold"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
        ) : (
          <Card>
            <p className="text-center text-slate-400 py-4">No seasonal rate multipliers configured.</p>
          </Card>
        )}
      </div>
    </div>
  );
};

PricingRulesPanel.displayName = "PricingRulesPanel";
export default memo(PricingRulesPanel);
