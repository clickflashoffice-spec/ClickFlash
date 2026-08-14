import React, { useState } from "react";
import { Photographer } from "../../types";
import PricingTable from "./settings/PricingTable";
import UsageWidget from "./settings/UsageWidget";
import { CreditCard, Receipt, Settings as SettingsIcon } from "lucide-react";

interface BillingPageProps {
  currentUser: Photographer;
}

const BillingPage: React.FC<BillingPageProps> = ({ currentUser }) => {
  // In a real app, you would fetch this from your database
  const [currentTier] = useState<"Free" | "Pro" | "Enterprise">("Free");

  return (
    <div className="space-y-8 animate-fade-in text-white max-w-6xl mx-auto">
      <div>
        <h2 className="text-2xl font-black uppercase tracking-widest mb-2">
          Billing & Subscription
        </h2>
        <p className="text-sm text-slate-400 font-medium">
          Manage your ClickFlash subscription, view usage, and update payment methods.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <section>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-black uppercase tracking-widest text-slate-200">
                Plans & Pricing
              </h3>
            </div>
            <PricingTable currentUser={currentUser} currentTier={currentTier} />
          </section>

          <section>
            <h3 className="text-lg font-black uppercase tracking-widest text-slate-200 mb-6">
              Payment Methods & History
            </h3>
            <div className="bg-[#0b101d] border border-white/10 rounded-3xl p-6">
              <div className="flex flex-col md:flex-row gap-6">
                <div className="flex-1 border border-white/5 bg-black/20 rounded-2xl p-5 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                      <CreditCard className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">No payment method</p>
                      <p className="text-xs text-slate-500">Add a card to upgrade</p>
                    </div>
                  </div>
                  <button className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold uppercase tracking-widest transition-colors">
                    Add Card
                  </button>
                </div>
                
                <div className="flex-1 border border-white/5 bg-black/20 rounded-2xl p-5 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
                      <Receipt className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">Billing History</p>
                      <p className="text-xs text-slate-500">View past invoices</p>
                    </div>
                  </div>
                  <button className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold uppercase tracking-widest transition-colors">
                    View
                  </button>
                </div>
              </div>
            </div>
          </section>
        </div>

        <div className="space-y-8">
          <section>
            <UsageWidget currentTier={currentTier} />
          </section>

          <section>
            <div className="bg-slate-900 border border-white/10 rounded-3xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center">
                  <SettingsIcon className="w-4 h-4 text-purple-400" />
                </div>
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">
                  Billing Settings
                </h3>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-slate-200">Email Invoices</p>
                    <p className="text-xs text-slate-500">Send receipts to {currentUser.email}</p>
                  </div>
                  <button className="w-10 h-5 bg-cyan-500 rounded-full relative">
                    <div className="w-3 h-3 bg-white rounded-full absolute top-1 right-1" />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-slate-200">Tax ID</p>
                    <p className="text-xs text-slate-500">Not configured</p>
                  </div>
                  <button className="text-xs font-bold text-cyan-400 hover:text-cyan-300">
                    Add
                  </button>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default BillingPage;
