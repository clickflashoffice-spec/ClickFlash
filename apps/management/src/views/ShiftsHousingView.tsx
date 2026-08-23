import { useState } from 'react';
import { Home, GraduationCap, UserPlus, Clock, MapPin, Award } from 'lucide-react';
import { MOCK_SHIFTS, MOCK_HOUSING_UNITS, MOCK_ACADEMY_COURSES, MOCK_APPLICANTS } from '../services/concessionService';
import { ShiftSchedule, StaffHousingUnit, AcademyCourse, JobApplicant } from '@clickflash/types';

export function ShiftsHousingView() {
  const [activeTab, setActiveTab] = useState<'shifts' | 'housing' | 'academy' | 'recruitment'>('shifts');
  const [shifts, setShifts] = useState<ShiftSchedule[]>(MOCK_SHIFTS);
  const [housing] = useState<StaffHousingUnit[]>(MOCK_HOUSING_UNITS);
  const [courses] = useState<AcademyCourse[]>(MOCK_ACADEMY_COURSES);
  const [applicants, setApplicants] = useState<JobApplicant[]>(MOCK_APPLICANTS);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-indigo-400">
            People, Shifts & Concession HR Operations
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Dynamic zone rotations, staff dormitory management, training certification tracks, and seasonal ATS hiring.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('shifts')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeTab === 'shifts' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            Shifts & Zones
          </button>
          <button
            onClick={() => setActiveTab('housing')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeTab === 'housing' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Home className="w-3.5 h-3.5" />
            Staff Housing
          </button>
          <button
            onClick={() => setActiveTab('academy')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeTab === 'academy' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5" />
            Academy
          </button>
          <button
            onClick={() => setActiveTab('recruitment')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeTab === 'recruitment' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            Recruitment ATS
          </button>
        </div>
      </div>

      {/* Tab 1: Shifts & Zone Rotations */}
      {activeTab === 'shifts' && (
        <div className="space-y-4">
          <div className="p-4 bg-purple-950/20 border border-purple-800/30 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MapPin className="w-5 h-5 text-purple-400" />
              <div>
                <h3 className="font-semibold text-white text-sm">Automated 90-Minute Zone Rotation Engine</h3>
                <p className="text-xs text-slate-400">
                  Rotates field photographers between High-Demand capture points (Main Pool) and cooler areas (Lobby) to sustain high energy.
                </p>
              </div>
            </div>
            <span className="px-3 py-1 bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded-full text-xs font-semibold">
              Active Rotation: Slot 3 (14:30 - 16:00)
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {shifts.map((shift) => (
              <div key={shift.id} className="p-5 bg-slate-900/60 border border-slate-800 rounded-xl space-y-3">
                <div className="flex items-center gap-3">
                  <img src={shift.userAvatar} alt={shift.userName} className="w-10 h-10 rounded-full object-cover border border-slate-700" />
                  <div>
                    <h3 className="font-semibold text-white text-sm">{shift.userName}</h3>
                    <p className="text-xs text-slate-400">{shift.role}</p>
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-slate-800 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Scheduled Hours:</span>
                    <span className="font-medium text-slate-200">{shift.startTime} - {shift.endTime}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Current Assigned Zone:</span>
                    <span className="font-semibold text-purple-400 px-2 py-0.5 bg-purple-500/10 rounded">
                      {shift.assignedZone}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Clock-In Verification:</span>
                    <span className="text-emerald-400 font-medium">{shift.clockInTime} (On Time)</span>
                  </div>
                </div>

                <button 
                  onClick={() => {
                    const zones: ShiftSchedule['assignedZone'][] = ['MAIN_POOL', 'BEACH_SUNSET', 'RESORT_ENTRANCE', 'CABANAS', 'KIOSK_POS', 'ROVING'];
                    const nextZone = zones[(zones.indexOf(shift.assignedZone) + 1) % zones.length];
                    setShifts(prev => prev.map(s => s.id === shift.id ? { ...s, assignedZone: nextZone } : s));
                  }}
                  className="w-full py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 rounded-lg transition-colors"
                >
                  Rotate Zone Now →
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 2: Staff Housing */}
      {activeTab === 'housing' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {housing.map((unit) => (
              <div key={unit.id} className="p-5 bg-slate-900/60 border border-slate-800 rounded-xl space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-white text-base">{unit.buildingName}</h3>
                    <p className="text-xs text-slate-400 font-mono">Room {unit.roomNumber}</p>
                  </div>
                  <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                    unit.status === 'FULL'
                      ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  }`}>
                    {unit.status}
                  </span>
                </div>

                <div className="space-y-1.5 pt-2 border-t border-slate-800 text-xs text-slate-300">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Occupancy:</span>
                    <span className="font-medium">{unit.currentOccupancy} / {unit.capacity} residents</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Monthly Payroll Offset:</span>
                    <span className="font-medium text-emerald-400">€{unit.monthlyRentDeduction.toFixed(2)}/mo</span>
                  </div>
                  <div className="pt-2 flex flex-wrap gap-1">
                    {unit.amenities.map(a => (
                      <span key={a} className="px-2 py-0.5 text-[10px] bg-slate-800 rounded text-slate-400">{a}</span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Academy Courses */}
      {activeTab === 'academy' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {courses.map((course) => (
            <div key={course.id} className="p-5 bg-slate-900/60 border border-slate-800 rounded-xl space-y-3 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-2xl">{course.badgeIconUrl}</span>
                  <span className="px-2 py-0.5 text-[10px] font-semibold bg-indigo-500/10 text-indigo-400 rounded">
                    {course.category}
                  </span>
                </div>
                <h3 className="font-semibold text-white text-base">{course.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{course.description}</p>
              </div>

              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                <span className="text-slate-400">{course.totalModules} modules ({course.durationMinutes} min)</span>
                <span className="font-semibold text-indigo-300 flex items-center gap-1">
                  <Award className="w-3.5 h-3.5" />
                  {course.badgeName}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab 4: Recruitment ATS */}
      {activeTab === 'recruitment' && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
            <h2 className="font-semibold text-white text-base">Seasonal Talent Inbound Pipeline</h2>
            <span className="text-xs text-slate-400">{applicants.length} candidates in review</span>
          </div>

          <div className="divide-y divide-slate-800/60">
            {applicants.map((app) => (
              <div key={app.id} className="p-5 flex items-center justify-between hover:bg-slate-800/20 transition-colors">
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-white text-sm">{app.fullName}</h3>
                    <span className="px-2 py-0.5 text-xs font-semibold bg-blue-500/10 text-blue-400 rounded-full">
                      {app.jobTitle}
                    </span>
                    <span className="text-xs text-amber-400 font-medium">{'★'.repeat(app.rating)}</span>
                  </div>
                  <p className="text-xs text-slate-400">{app.email} • {app.phone} • {app.yearsExperience} yrs experience</p>
                  <p className="text-xs text-slate-300 italic">"{app.notes}"</p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-800 text-slate-300">
                    {app.stage}
                  </span>
                  <button 
                    onClick={() => {
                      setApplicants(prev => prev.map(a => a.id === app.id ? { ...a, stage: 'HIRED' } : a));
                    }}
                    className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-medium transition-colors"
                  >
                    Approve & Hire
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
