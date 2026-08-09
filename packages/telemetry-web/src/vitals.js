"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeWebVitals = initializeWebVitals;
var web_vitals_1 = require("web-vitals");
function initializeWebVitals(logger) {
    var reportMetric = function (metric) {
        logger.info("Web Vitals: ".concat(metric.name), {
            metric: metric.name,
            value: metric.value,
            rating: metric.rating,
            id: metric.id,
        });
    };
    (0, web_vitals_1.onCLS)(reportMetric);
    (0, web_vitals_1.onFID)(reportMetric);
    (0, web_vitals_1.onLCP)(reportMetric);
    (0, web_vitals_1.onTTFB)(reportMetric);
    (0, web_vitals_1.onFCP)(reportMetric);
}
