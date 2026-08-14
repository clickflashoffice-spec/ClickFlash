import { Card } from "@clickflash/ui";
import React, { useState, useEffect } from 'react';

import { Photographer, Album, DailyObjective } from '../../../types';
import { objectiveService } from '../../../services/api/objectiveService';

interface DailyObjectivesWidgetProps {
  currentUser: Photographer;
  albums: Album[];
}

const DailyObjectivesWidget: React.FC<DailyObjectivesWidgetProps> = ({ currentUser, albums }) => {
  const [dailyObjective, setDailyObjective] = useState<DailyObjective | null>(null);

  useEffect(() => {
    const fetchObjective = async () => {
      if (!currentUser.id) return;
      const today = new Date().toISOString().split('T')[0];
      const obj = await objectiveService.getObjectiveForDate(String(currentUser.id), today);
      if (obj) setDailyObjective(obj);
    };
    fetchObjective();
  }, [currentUser.id, albums]); // Refresh when albums change (import completes)

  const defaultTarget = currentUser.dailyPhotoTarget || 0;
  // Current target in DB is the REMAINING count
  const remainingTarget = dailyObjective ? dailyObjective.target : defaultTarget;
  const progress = defaultTarget > 0 ? ((defaultTarget - remainingTarget) / defaultTarget) * 100 : 0;
  const progressPercentage = Math.min(Math.max(progress, 0), 100);

  return (
    <Card className="h-full flex flex-col">
      <h3 className="text-sm sm:text-base md:text-lg font-bold mb-1.5 sm:mb-2">Today's Objective</h3>
      <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mb-3 sm:mb-4">Your personal photo target for today.</p>
      <div className="flex-grow flex flex-col justify-center">
        <div className="text-center">
          <span className="text-3xl sm:text-4xl md:text-5xl font-bold text-blue-500 dark:text-blue-400">{defaultTarget - remainingTarget}</span>
          <span className="text-base sm:text-lg md:text-xl font-semibold text-slate-400 dark:text-slate-500"> / {defaultTarget} photos</span>
        </div>
        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 sm:h-2.5 mt-3 sm:mt-4 overflow-hidden">
          <div
            className="bg-blue-600 h-full rounded-full transition-all duration-500"
            style={{ width: `${progressPercentage}%` }}
          ></div>
        </div>
      </div>
    </Card>
  );
};

export default DailyObjectivesWidget;
