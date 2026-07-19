import React, { useState } from "react";
import { CheckCircle2, Star, Zap, Building2, Loader2 } from "lucide-react";
import { pb } from "@/services/pb";
import { logger } from "@/utils/logger";
import type { Photographer } from "../../../types";

interface PricingTableProps {
  currentUser: Photographer;
  currentTier?: "Free" | "Pro" | "Enterprise";
}

const PricingTable: React.FC<PricingTableProps> = ({ currentUser, currentTier = "Free" }) => {
  const [loadingTier, setLoadingTier] = useState<string | null>(null);

  const handleUpgrade = async (tierName: string) => {
    try {
      setLoadingTier(tierName);
      
      const response = await fetch(`${pb.baseUrl}/api/billing/checkout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${pb.authStore.token}`,
        },
        body: JSON.stringify({
          plan: "pro",
          studioName: currentUser.name || "My Studio",
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create checkout session");
      }

      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      logger.error("Checkout error:", error);
      alert("There was an error initiating the checkout process. Please try again.");
    } finally {
      setLoadingTier(null);
    }
  };

  const tiers = [
    {
      name: "Starter",
      icon: <Star className="w-5 h-5 text-slate-400" />,
      price: "Free",
      description: "Perfect for independent photographers just getting started.",
      features: [
        "1 Active Destination",
        "Up to 500 Photos/month",
        "Standard Web Galleries",
        "Email Support",
      ],
      buttonText: currentTier === "Free" ? "Current Plan" : "Downgrade",
      disabled: currentTier === "Free",
      isPopular: false,
    },
    {
      name: "Studio Pro",
      icon: <Zap className="w-5 h-5 text-cyan-400" />,
      price: "$49",
      period: "/month",
      description: "Everything you need to run a professional photography business.",
      features: [
        "Unlimited Destinations",
        "Unlimited Photo Storage",
        "White-labeled Galleries",
        "Priority 24/7 Support",
        "Advanced Analytics",
      ],
      buttonText: currentTier === "Pro" ? "Current Plan" : "Upgrade to Pro",
      disabled: currentTier === "Pro",
      isPopular: true,
    },
    {
      name: "Enterprise",
      icon: <Building2 className="w-5 h-5 text-purple-400" />,
      price: "Custom",
      description: "For high-volume resorts, cruise lines, and theme parks.",
      features: [
        "Dedicated Account Manager",
        "Custom Hardware Integration",
        "On-premise Server Support",
        "SLA Guarantees",
        "Custom SSO & API Access",
      ],
      buttonText: currentTier === "Enterprise" ? "Current Plan" : "Contact Sales",
      disabled: currentTier === "Enterprise",
      isPopular: false,
    },
  ];

  return (
    <div className="w-full">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {tiers.map((tier) => (
          <div 
            key={tier.name}
            className={`relative bg-[#0b101d] border rounded-3xl p-6 flex flex-col ${
              tier.isPopular 
                ? "border-cyan-500/50 shadow-[0_0_30px_rgba(6,182,212,0.15)] transform md:-translate-y-2" 
                : "border-white/10"
            }`}
          >
            {tier.isPopular && (
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2">
                <span className="bg-cyan-500 text-black text-[10px] font-black uppercase tracking-widest py-1 px-3 rounded-full">
                  Most Popular
                </span>
              </div>
            )}
            
            <div className="flex items-center gap-3 mb-4">
              <div className={`p-2 rounded-xl ${tier.isPopular ? "bg-cyan-500/10" : "bg-white/5"}`}>
                {tier.icon}
              </div>
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-200">
                {tier.name}
              </h3>
            </div>
            
            <div className="mb-2">
              <span className="text-4xl font-black tracking-tighter text-white">{tier.price}</span>
              {tier.period && <span className="text-sm text-slate-400 font-medium ml-1">{tier.period}</span>}
            </div>
            
            <p className="text-xs text-slate-400 font-medium mb-6 min-h-[32px]">
              {tier.description}
            </p>
            
            <div className="space-y-3 mb-8 flex-grow">
              {tier.features.map((feature, i) => (
                <div key={i} className="flex items-start gap-3">
                  <CheckCircle2 className={`w-4 h-4 shrink-0 mt-0.5 ${tier.isPopular ? "text-cyan-400" : "text-slate-500"}`} />
                  <span className="text-sm text-slate-300">{feature}</span>
                </div>
              ))}
            </div>
            
            <button
              onClick={() => {
                if (tier.name === "Enterprise") {
                  alert("Please contact enterprise@clicketflash.com");
                } else {
                  handleUpgrade(tier.name);
                }
              }}
              disabled={tier.disabled || loadingTier !== null}
              className={`w-full py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                tier.disabled 
                  ? "bg-white/5 text-slate-500 cursor-not-allowed border border-white/5" 
                  : tier.isPopular
                    ? "bg-cyan-500 text-black hover:bg-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.3)]"
                    : "bg-white/10 text-white hover:bg-white/20 border border-white/10"
              }`}
            >
              {loadingTier === tier.name ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processing...
                </>
              ) : (
                tier.buttonText
              )}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PricingTable;
