import { useState, useEffect } from 'react';
import { IngestionSession } from '../types';

export function useIngestionSession() {
  const [sessions, setSessions] = useState<IngestionSession[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Mocking the Master API fetch for now
    const fetchSessions = async () => {
      setIsLoading(true);
      try {
        // Normally: const response = await fetch('http://localhost:8090/api/ingestion/sessions');
        // const data = await response.json();
        const data: IngestionSession[] = [
          {
            id: 'sess-1',
            date: '2026-08-17',
            source: 'Camera A',
            totalPhotos: 1500,
            keepers: 1200,
            rejectRate: 20,
            status: 'completed',
            duration: '45m',
          },
          {
            id: 'sess-2',
            date: '2026-08-16',
            source: 'Camera B',
            totalPhotos: 800,
            keepers: 600,
            rejectRate: 25,
            status: 'completed',
            duration: '25m',
          }
        ];
        setSessions(data);
      } catch (error) {
        console.error('Failed to fetch sessions', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchSessions();
  }, []);

  return { sessions, isLoading };
}
