import React, { memo, useState, useEffect, useCallback } from 'react';
import {
  Users,
  ShieldCheck,
  ShieldAlert,
  Clock,
  MapPin,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Fingerprint,
  Wifi,
  WifiOff,
  BarChart3,
  Calendar,
  ChevronDown,
  ChevronUp,
  Filter,
} from 'lucide-react';
import { cloudApiService } from '../../services/cloudApiService';
import { logger } from '@/utils/logger';

// ─── Types ────────────────────────────────────────────────────────────────────

type BiometricMethod = 'face_recognition' | 'pin_fallback' | 'none';
type ShiftStatus = 'clocked_in' | 'clocked_out' | 'on_break' | 'absent';

interface WorkforceShift {
  id: string;
  photographer_id: string;
  photographer_name: string;
  station_id: string;
  station_name: string;
  clock_in: string | null;
  clock_out: string | null;
  status: ShiftStatus;
  biometric_method: BiometricMethod;
  biometric_confidence: number | null;
  face_vector_hash: string | null;
  gps_lat: number | null;
  gps_lng: number | null;
  notes: string | null;
}

interface WorkforceSummary {
  total: number;
  clocked_in: number;
  clocked_out: number;
  on_break: number;
  absent: number;
  biometric_verified: number;
  pin_fallback: number;
  unverified: number;
}

// ─── Utility Helpers ──────────────────────────────────────────────────────────

const CONFIDENCE_THRESHOLD = 0.82;

function formatDuration(clockIn: string | null): string {
  if (!clockIn) return '—';
  const start = new Date(clockIn).getTime();
  const diffMs = Date.now() - start;
  if (diffMs < 0) return '—';
  const hours = Math.floor(diffMs / 3_600_000);
  const mins = Math.floor((diffMs % 3_600_000) / 60_000);
  return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
}

function formatTime(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function googleMapsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const StatCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: number | string;
  color: string;
  sub?: string;
}> = memo(({ icon, label, value, color, sub }) => (
  <div className={`flex-1 min-w-[140px] rounded-xl border ${color} p-4 flex flex-col gap-1`}>
    <div className="flex items-center gap-2 text-sm font-medium opacity-70">{icon}{label}</div>
    <div className="text-3xl font-bold tracking-tight">{value}</div>
    {sub && <div className="text-xs opacity-50">{sub}</div>}
  </div>
));
StatCard.displayName = 'StatCard';

const BiometricBadge: React.FC<{ method: BiometricMethod; confidence: number | null }> = memo(
  ({ method, confidence }) => {
    if (method === 'face_recognition') {
      const ok = confidence !== null && confidence >= CONFIDENCE_THRESHOLD;
      return (
        <span
          title={`Confidence: ${confidence !== null ? (confidence * 100).toFixed(1) : 'N/A'}%`}
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
            ok
              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
              : 'bg-red-500/15 text-red-400 border border-red-500/30'
          }`}
        >
          <Fingerprint className="w-3 h-3" />
          {ok ? 'Face ✓' : 'Face ✗'}
        </span>
      );
    }
    if (method === 'pin_fallback') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
          <AlertTriangle className="w-3 h-3" />
          PIN Fallback
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-500/15 text-slate-400 border border-slate-500/30">
        <ShieldAlert className="w-3 h-3" />
        Unverified
      </span>
    );
  }
);
BiometricBadge.displayName = 'BiometricBadge';

const StatusPill: React.FC<{ status: ShiftStatus }> = memo(({ status }) => {
  const map: Record<ShiftStatus, { cls: string; label: string }> = {
    clocked_in: { cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30', label: 'Clocked In' },
    clocked_out: { cls: 'bg-slate-500/15 text-slate-400 border-slate-500/30', label: 'Clocked Out' },
    on_break: { cls: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30', label: 'On Break' },
    absent: { cls: 'bg-red-500/15 text-red-400 border-red-500/30', label: 'Absent' },
  };
  const { cls, label } = map[status] ?? map.absent;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${cls}`}>
      {label}
    </span>
  );
});
StatusPill.displayName = 'StatusPill';

// ─── Main Component ───────────────────────────────────────────────────────────

const WorkforceDashboard: React.FC = memo(() => {
  const [shifts, setShifts] = useState<WorkforceShift[]>([]);
  const [summary, setSummary] = useState<WorkforceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [filterStatus, setFilterStatus] = useState<ShiftStatus | 'all'>('all');
  const [filterBiometric, setFilterBiometric] = useState<BiometricMethod | 'all'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [biometricEnforcement, setBiometricEnforcement] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch live shifts from cloud API — uses /api/shifts endpoint
      const response = await cloudApiService.get('/api/shifts?limit=100&includePhotographer=true');
      const raw: WorkforceShift[] = Array.isArray(response?.data) ? response.data : [];
      setShifts(raw);

      // Compute summary locally
      const s: WorkforceSummary = {
        total: raw.length,
        clocked_in: raw.filter((x) => x.status === 'clocked_in').length,
        clocked_out: raw.filter((x) => x.status === 'clocked_out').length,
        on_break: raw.filter((x) => x.status === 'on_break').length,
        absent: raw.filter((x) => x.status === 'absent').length,
        biometric_verified: raw.filter((x) => x.biometric_method === 'face_recognition' && (x.biometric_confidence ?? 0) >= CONFIDENCE_THRESHOLD).length,
        pin_fallback: raw.filter((x) => x.biometric_method === 'pin_fallback').length,
        unverified: raw.filter((x) => x.biometric_method === 'none').length,
      };
      setSummary(s);
      setLastRefresh(new Date());
    } catch (err: any) {
      logger.error('[WorkforceDashboard] Failed to fetch shift data', { args: [err?.message] });
      setError(err?.message ?? 'Failed to load workforce data. Check cloud connectivity.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => { fetchData(); }, [fetchData]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchData, 30_000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchData]);

  const filteredShifts = shifts.filter((s) => {
    if (filterStatus !== 'all' && s.status !== filterStatus) return false;
    if (filterBiometric !== 'all' && s.biometric_method !== filterBiometric) return false;
    return true;
  });

  const biometricViolations = shifts.filter(
    (s) => s.status === 'clocked_in' && s.biometric_method !== 'face_recognition'
  );

  return (
    <div className="min-h-screen bg-[#070b14] text-white p-6 space-y-6">

      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-cyan-400" />
            Workforce Dashboard
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Real-time attendance, biometric verification, and GPS tracking
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Biometric Enforcement Toggle */}
          <button
            onClick={() => setBiometricEnforcement((v) => !v)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium transition-all ${
              biometricEnforcement
                ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-400'
                : 'bg-slate-800 border-slate-700 text-slate-400'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            Biometric {biometricEnforcement ? 'ON' : 'OFF'}
          </button>

          {/* Auto-refresh toggle */}
          <button
            onClick={() => setAutoRefresh((v) => !v)}
            title="Toggle auto-refresh (30s)"
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm transition-all ${
              autoRefresh
                ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400'
                : 'bg-slate-800 border-slate-700 text-slate-400'
            }`}
          >
            {autoRefresh ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
            {autoRefresh ? 'Live' : 'Paused'}
          </button>

          {/* Manual refresh */}
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-sm text-slate-300 hover:bg-slate-700 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Last refresh */}
      <div className="text-xs text-slate-500 -mt-2">
        Last updated: {lastRefresh.toLocaleTimeString()}
      </div>

      {/* ── Error Banner ── */}
      {error && (
        <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl px-4 py-3 text-sm">
          <XCircle className="w-5 h-5 shrink-0" />
          {error}
        </div>
      )}

      {/* ── Biometric Enforcement Alert ── */}
      {biometricEnforcement && biometricViolations.length > 0 && (
        <div className="flex items-start gap-3 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-xl px-4 py-3 text-sm">
          <ShieldAlert className="w-5 h-5 mt-0.5 shrink-0" />
          <div>
            <span className="font-semibold">{biometricViolations.length} active shift{biometricViolations.length > 1 ? 's' : ''} without face verification.</span>
            {' '}Photographers using PIN fallback or no biometrics:{' '}
            <span className="font-mono">{biometricViolations.map((v) => v.photographer_name).join(', ')}</span>
          </div>
        </div>
      )}

      {/* ── Summary Cards ── */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatCard
            icon={<Users className="w-4 h-4" />}
            label="Total"
            value={summary.total}
            color="border-slate-700 text-white"
          />
          <StatCard
            icon={<CheckCircle2 className="w-4 h-4" />}
            label="Clocked In"
            value={summary.clocked_in}
            color="border-emerald-500/30 text-emerald-400"
          />
          <StatCard
            icon={<Clock className="w-4 h-4" />}
            label="On Break"
            value={summary.on_break}
            color="border-cyan-500/30 text-cyan-400"
          />
          <StatCard
            icon={<XCircle className="w-4 h-4" />}
            label="Absent"
            value={summary.absent}
            color="border-red-500/30 text-red-400"
          />
          <StatCard
            icon={<Fingerprint className="w-4 h-4" />}
            label="Face Verified"
            value={summary.biometric_verified}
            color="border-violet-500/30 text-violet-400"
            sub={`of ${summary.clocked_in} active`}
          />
          <StatCard
            icon={<AlertTriangle className="w-4 h-4" />}
            label="PIN Fallback"
            value={summary.pin_fallback}
            color="border-amber-500/30 text-amber-400"
          />
        </div>
      )}

      {/* ── Filters ── */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <Filter className="w-4 h-4" />
          Filter:
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as ShiftStatus | 'all')}
          className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
          aria-label="Filter by shift status"
        >
          <option value="all">All Statuses</option>
          <option value="clocked_in">Clocked In</option>
          <option value="clocked_out">Clocked Out</option>
          <option value="on_break">On Break</option>
          <option value="absent">Absent</option>
        </select>
        <select
          value={filterBiometric}
          onChange={(e) => setFilterBiometric(e.target.value as BiometricMethod | 'all')}
          className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
          aria-label="Filter by biometric method"
        >
          <option value="all">All Biometrics</option>
          <option value="face_recognition">Face Recognition</option>
          <option value="pin_fallback">PIN Fallback</option>
          <option value="none">Unverified</option>
        </select>
        <span className="text-xs text-slate-500 ml-auto">
          {filteredShifts.length} of {shifts.length} records
        </span>
      </div>

      {/* ── Shift Table ── */}
      <div className="rounded-xl border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-900/80 border-b border-slate-800">
              <tr className="text-left text-slate-400 text-xs uppercase tracking-wider">
                <th className="px-4 py-3 w-8" />
                <th className="px-4 py-3">Photographer</th>
                <th className="px-4 py-3">Station</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Clock In</th>
                <th className="px-4 py-3">Duration</th>
                <th className="px-4 py-3">Biometric</th>
                <th className="px-4 py-3">GPS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading && shifts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                    <RefreshCw className="w-5 h-5 animate-spin inline mr-2" />
                    Loading workforce data…
                  </td>
                </tr>
              ) : filteredShifts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                    <BarChart3 className="w-6 h-6 inline mb-1 opacity-40" />
                    <br />
                    No shifts match current filters
                  </td>
                </tr>
              ) : (
                filteredShifts.map((shift) => {
                  const isExpanded = expandedId === shift.id;
                  return (
                    <React.Fragment key={shift.id}>
                      <tr
                        className={`transition-colors cursor-pointer ${
                          isExpanded
                            ? 'bg-slate-800/50'
                            : 'hover:bg-slate-800/30'
                        }`}
                        onClick={() => setExpandedId(isExpanded ? null : shift.id)}
                      >
                        {/* Expand */}
                        <td className="px-4 py-3 text-slate-500">
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </td>

                        {/* Photographer */}
                        <td className="px-4 py-3 font-medium">
                          <div>{shift.photographer_name}</div>
                          <div className="text-xs text-slate-500 font-mono">{shift.photographer_id}</div>
                        </td>

                        {/* Station */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                            <span>{shift.station_name || shift.station_id}</span>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3">
                          <StatusPill status={shift.status} />
                        </td>

                        {/* Clock In */}
                        <td className="px-4 py-3 text-slate-300 font-mono text-xs">
                          {formatTime(shift.clock_in)}
                        </td>

                        {/* Duration */}
                        <td className="px-4 py-3 text-slate-300 font-mono text-xs">
                          {shift.status === 'clocked_in' ? formatDuration(shift.clock_in) : '—'}
                        </td>

                        {/* Biometric */}
                        <td className="px-4 py-3">
                          <BiometricBadge
                            method={shift.biometric_method}
                            confidence={shift.biometric_confidence}
                          />
                        </td>

                        {/* GPS */}
                        <td className="px-4 py-3">
                          {shift.gps_lat !== null && shift.gps_lng !== null ? (
                            <a
                              href={googleMapsUrl(shift.gps_lat, shift.gps_lng)}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300 text-xs transition-colors"
                            >
                              <MapPin className="w-3.5 h-3.5" />
                              Map
                            </a>
                          ) : (
                            <span className="text-slate-600 text-xs">—</span>
                          )}
                        </td>
                      </tr>

                      {/* Expanded detail row */}
                      {isExpanded && (
                        <tr className="bg-slate-900/60">
                          <td colSpan={8} className="px-6 py-4">
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                              <div>
                                <div className="text-slate-500 mb-1">Shift ID</div>
                                <div className="font-mono text-slate-300">{shift.id}</div>
                              </div>
                              <div>
                                <div className="text-slate-500 mb-1">Clock Out</div>
                                <div className="font-mono text-slate-300">{formatTime(shift.clock_out)}</div>
                              </div>
                              <div>
                                <div className="text-slate-500 mb-1">Face Vector Hash</div>
                                <div className="font-mono text-slate-400 truncate max-w-[180px]">
                                  {shift.face_vector_hash ?? '—'}
                                </div>
                              </div>
                              <div>
                                <div className="text-slate-500 mb-1">Confidence Score</div>
                                <div className={`font-mono font-semibold ${
                                  (shift.biometric_confidence ?? 0) >= CONFIDENCE_THRESHOLD
                                    ? 'text-emerald-400'
                                    : 'text-red-400'
                                }`}>
                                  {shift.biometric_confidence !== null
                                    ? `${(shift.biometric_confidence * 100).toFixed(2)}%`
                                    : '—'}
                                </div>
                              </div>
                              <div>
                                <div className="text-slate-500 mb-1">GPS Coordinates</div>
                                <div className="font-mono text-slate-300">
                                  {shift.gps_lat !== null
                                    ? `${shift.gps_lat.toFixed(5)}, ${shift.gps_lng?.toFixed(5)}`
                                    : '—'}
                                </div>
                              </div>
                              {shift.notes && (
                                <div className="col-span-full">
                                  <div className="text-slate-500 mb-1">Notes</div>
                                  <div className="text-slate-300">{shift.notes}</div>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
});

WorkforceDashboard.displayName = 'WorkforceDashboard';
export default WorkforceDashboard;
