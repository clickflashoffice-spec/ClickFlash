import { useState } from 'react';
import { Camera, Award, Sparkles } from 'lucide-react';
import { VisionBridge, type PhotoQualityMetrics } from '@clickflash/ai';

export function VisionCullingTab() {
  const [visionMetrics, setVisionMetrics] = useState<PhotoQualityMetrics>({
    photoId: 'IMG_2026_HERO_042',
    sharpnessScore: 88,
    exposureScore: 92,
    compositionScore: 85,
    eyesOpenConfidence: 0.98,
    smileConfidence: 0.94,
    faceCount: 2
  });
  const cullingResult = VisionBridge.evaluateCulling(visionMetrics);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-bold text-purple-400 flex items-center gap-2">
          <Camera className="w-4 h-4" /> ArcFace Biometric & Culling Lab
        </h3>

        <div className="space-y-3 text-xs">
          <div>
            <label className="text-slate-400 block mb-1">Sharpness ({visionMetrics.sharpnessScore}/100):</label>
            <input
              type="range"
              min="10"
              max="100"
              value={visionMetrics.sharpnessScore}
              onChange={e => setVisionMetrics({ ...visionMetrics, sharpnessScore: Number(e.target.value) })}
              className="w-full accent-purple-500"
            />
          </div>

          <div>
            <label className="text-slate-400 block mb-1">Exposure Balance ({visionMetrics.exposureScore}/100):</label>
            <input
              type="range"
              min="10"
              max="100"
              value={visionMetrics.exposureScore}
              onChange={e => setVisionMetrics({ ...visionMetrics, exposureScore: Number(e.target.value) })}
              className="w-full accent-purple-500"
            />
          </div>

          <div>
            <label className="text-slate-400 block mb-1">Eyes Open Confidence ({Math.round(visionMetrics.eyesOpenConfidence * 100)}%):</label>
            <input
              type="range"
              min="0.1"
              max="1.0"
              step="0.05"
              value={visionMetrics.eyesOpenConfidence}
              onChange={e => setVisionMetrics({ ...visionMetrics, eyesOpenConfidence: Number(e.target.value) })}
              className="w-full accent-purple-500"
            />
          </div>

          <div>
            <label className="text-slate-400 block mb-1">Smile Confidence ({Math.round(visionMetrics.smileConfidence * 100)}%):</label>
            <input
              type="range"
              min="0.1"
              max="1.0"
              step="0.05"
              value={visionMetrics.smileConfidence}
              onChange={e => setVisionMetrics({ ...visionMetrics, smileConfidence: Number(e.target.value) })}
              className="w-full accent-purple-500"
            />
          </div>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-bold text-cyan-400 flex items-center gap-2">
          <Award className="w-4 h-4" /> Automated Grading Result
        </h3>

        <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">Assigned Grade:</span>
            <span className={`text-2xl font-black ${
              cullingResult.grade === 'A+' ? 'text-emerald-400' :
              cullingResult.grade === 'A' ? 'text-cyan-400' :
              cullingResult.grade === 'B' ? 'text-blue-400' :
              cullingResult.grade === 'C' ? 'text-amber-400' : 'text-rose-500'
            }`}>
              {cullingResult.grade}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">Overall Quality Score:</span>
            <span className="font-mono text-slate-200">{cullingResult.overallScore} / 100</span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">Hero Shot Status:</span>
            <span className={`font-semibold flex items-center gap-1 ${cullingResult.isHeroShot ? 'text-amber-400' : 'text-slate-500'}`}>
              {cullingResult.isHeroShot ? <Sparkles className="w-3.5 h-3.5" /> : null}
              {cullingResult.isHeroShot ? 'HERO SHOT' : 'Standard Shot'}
            </span>
          </div>

          {cullingResult.rejectReasons.length > 0 && (
            <div className="bg-rose-950/30 border border-rose-800/40 p-2.5 rounded text-xs text-rose-300">
              <span className="font-bold block mb-1">Rejection Flags:</span>
              <ul className="list-disc list-inside">
                {cullingResult.rejectReasons.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
