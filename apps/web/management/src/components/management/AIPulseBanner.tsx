import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ArrowRight, Activity, AlertTriangle, Zap } from "lucide-react";

interface AIPulseBannerProps {
  insights: {
    id: string;
    type: "opportunity" | "warning" | "anomaly";
    message: string;
    actionLabel: string;
    onAction: () => void;
  }[];
}

const AIPulseBanner: React.FC<AIPulseBannerProps> = ({ insights }) => {
  const [currentIndex, setCurrentIndex] = React.useState(0);

  React.useEffect(() => {
    if (insights.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % insights.length);
    }, 8000);
    return () => clearInterval(interval);
  }, [insights.length]);

  if (!insights.length) return null;

  const currentInsight = insights[currentIndex];

  const getIcon = (type: string) => {
    switch (type) {
      case "opportunity": return <Zap className="w-5 h-5 text-emerald-400" />;
      case "warning": return <AlertTriangle className="w-5 h-5 text-amber-400" />;
      case "anomaly": return <Activity className="w-5 h-5 text-sky-400" />;
      default: return <Sparkles className="w-5 h-5 text-violet-400" />;
    }
  };

  const getBgColor = (type: string) => {
    switch (type) {
      case "opportunity": return "from-emerald-500/10 to-transparent border-emerald-500/20";
      case "warning": return "from-amber-500/10 to-transparent border-amber-500/20";
      case "anomaly": return "from-sky-500/10 to-transparent border-sky-500/20";
      default: return "from-violet-500/10 to-transparent border-violet-500/20";
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-8 overflow-hidden rounded-2xl relative"
    >
      <div className="absolute inset-0 bg-white/5 backdrop-blur-xl" />
      <div className="relative px-6 py-4 flex items-center justify-between border border-white/10 rounded-2xl bg-gradient-to-r from-white/5 to-transparent shadow-2xl">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentInsight.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
            className={`flex items-center gap-4 flex-1`}
          >
            <div className={`p-2 rounded-xl bg-gradient-to-br ${getBgColor(currentInsight.type)} border`}>
              {getIcon(currentInsight.type)}
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1 flex items-center gap-2">
                <Sparkles className="w-3 h-3 text-sky-400" />
                PixelFounder AI Pulse
              </p>
              <p className="text-sm font-medium text-white">{currentInsight.message}</p>
            </div>
          </motion.div>
        </AnimatePresence>

        <AnimatePresence mode="wait">
          <motion.button
            key={currentInsight.id + "-btn"}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            onClick={currentInsight.onAction}
            className="group flex items-center gap-2 px-4 py-2 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/20 rounded-xl transition-all"
          >
            <span className="text-xs font-bold text-sky-400 uppercase tracking-wider">{currentInsight.actionLabel}</span>
            <ArrowRight className="w-4 h-4 text-sky-400 group-hover:translate-x-1 transition-transform" />
          </motion.button>
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default AIPulseBanner;
