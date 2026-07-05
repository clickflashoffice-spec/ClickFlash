import { onCLS, onFID, onLCP, onTTFB, onFCP, Metric } from 'web-vitals';
import { WebLogger } from './index';

export function initializeWebVitals(logger: WebLogger) {
  const reportMetric = (metric: Metric) => {
    logger.info(`Web Vitals: ${metric.name}`, {
      metric: metric.name,
      value: metric.value,
      rating: metric.rating,
      id: metric.id,
    });
  };

  onCLS(reportMetric);
  onFID(reportMetric);
  onLCP(reportMetric);
  onTTFB(reportMetric);
  onFCP(reportMetric);
}
