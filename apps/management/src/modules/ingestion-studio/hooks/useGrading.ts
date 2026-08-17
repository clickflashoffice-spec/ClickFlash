import { useState } from 'react';
import { useIngestionStore } from '../stores/ingestionStore';

export function useGrading() {
  const [isGrading, setIsGrading] = useState(false);
  const { files, setGradingResults } = useIngestionStore();

  const startGrading = async () => {
    if (files.length === 0) return;
    
    setIsGrading(true);
    // Simulate grading process
    setTimeout(() => {
      const results = files.map((file, index) => {
        const score = Math.floor(Math.random() * 100);
        return {
          id: `grade-${index}`,
          filename: file.name,
          sharpnessScore: score,
          status: score > 70 ? 'keeper' : score > 40 ? 'borderline' : 'reject' as 'keeper' | 'reject' | 'borderline',
        };
      });
      setGradingResults(results);
      setIsGrading(false);
    }, 2000);
  };

  return { isGrading, startGrading };
}
