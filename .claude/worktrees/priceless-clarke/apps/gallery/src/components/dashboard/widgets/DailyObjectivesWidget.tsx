import React from 'react';
import Card from '../../common/Card';
import { Photographer, Album } from '../../../types';

interface DailyObjectivesWidgetProps {
  currentUser: Photographer;
  albums: Album[];
}

const DailyObjectivesWidget: React.FC<DailyObjectivesWidgetProps> = ({ currentUser, albums }) => {

  const todayString = new Date().toISOString().split('T')[0];
  const photosToday = albums
    .filter(album => String(album.photographerId) === currentUser.id && album.date === todayString)
    .reduce((total, album) => total + album.photos.length, 0);

  const target = currentUser.dailyPhotoTarget || 0;
  const progress = target > 0 ? (photosToday / target) * 100 : 0;
  const progressPercentage = Math.min(progress, 100);

  return (
    <Card className="h-full flex flex-col">
      <h3 className="text-lg font-bold mb-2">Today's Objective</h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Your personal photo target for today.</p>
      <div className="flex-grow flex flex-col justify-center">
        <div className="text-center">
          <span className="text-5xl font-bold text-blue-500 dark:text-blue-400">{photosToday}</span>
          <span className="text-xl font-semibold text-slate-400 dark:text-slate-500"> / {target} photos</span>
        </div>
        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5 mt-4">
          <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${progressPercentage}%` }}></div>
        </div>
      </div>
    </Card>
  );
};

export default DailyObjectivesWidget;
