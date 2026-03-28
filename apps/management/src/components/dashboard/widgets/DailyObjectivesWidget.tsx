
import React, { useRef, useLayoutEffect } from 'react';
import Card from '../../common/Card.tsx';
import { Photographer, Album } from '../../../types.ts';

interface DailyObjectivesWidgetProps {
  currentUser: Photographer;
  albums: Album[];
}

const DailyObjectivesWidget: React.FC<DailyObjectivesWidgetProps> = ({ currentUser, albums }) => {

  const todayString = new Date().toISOString().split('T')[0];
  const photosToday = albums
    .filter(album => album.photographerId === currentUser.id && album.date === todayString)
    .reduce((total, album) => total + album.photos.length, 0);

  const target = currentUser.dailyPhotoTarget || 0;
  const progress = target > 0 ? (photosToday / target) * 100 : 0;
  const progressPercentage = Math.min(progress, 100);
  const barRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (barRef.current) {
      barRef.current.style.setProperty('--progress-width', `${progressPercentage}%`);
    }
  }, [progressPercentage]);

  return (
    <Card className="h-full flex flex-col relative overflow-hidden group">
      <div className="absolute -top-12 -right-12 w-32 h-32 bg-cyan-500/5 blur-[50px] rounded-full group-hover:bg-cyan-500/10 transition-all duration-700"></div>

      <div className="mb-6">
        <h3 className="text-sm font-black uppercase tracking-[0.2em] text-foreground">Objective Tracker</h3>
        <p className="text-[10px] text-muted-foreground font-bold mt-1 uppercase tracking-wider">Quota Performance</p>
      </div>

      <div className="flex-grow flex flex-col justify-center relative z-10">
        <div className="flex items-baseline justify-center space-x-2 mb-8">
          <span className="text-6xl font-black text-foreground tracking-tighter shadow-sm">{photosToday}</span>
          <span className="text-lg font-black text-muted-foreground uppercase opacity-50 tracking-widest pl-2">/ {target}</span>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between items-end px-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-cyan-500">{progressPercentage.toFixed(0)}% Achieved</span>
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{target - photosToday > 0 ? `${target - photosToday} Remaining` : 'Quota Met'}</span>
          </div>
          <div className="w-full bg-slate-200 dark:bg-white/5 rounded-2xl h-4 relative overflow-hidden border border-white/5 p-1 shadow-inner">
            <div
              ref={barRef}
              className="bg-gradient-to-r from-cyan-600 to-blue-500 h-full rounded-xl transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(6,182,212,0.3)] relative overflow-hidden [width:var(--progress-width)]"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"></div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 pt-4 border-t border-white/5 flex items-center justify-between text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
        <span>Session: Morning</span>
        <span className="text-green-500 font-black">Online</span>
      </div>
    </Card>
  );
};

export default React.memo(DailyObjectivesWidget);

