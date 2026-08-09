"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TelemetryAnalyzer = void 0;
var TelemetryAnalyzer = /** @class */ (function () {
    function TelemetryAnalyzer(logger) {
        this.logger = logger;
    }
    TelemetryAnalyzer.prototype.trackEvent = function (event) {
        this.logger.info("[EVENT] ".concat(event.eventName), __assign({ category: event.category }, event.properties));
    };
    TelemetryAnalyzer.prototype.trackUserFlow = function (flowId, step, properties) {
        this.logger.info("[FLOW] ".concat(flowId), __assign({ step: step }, properties));
    };
    TelemetryAnalyzer.prototype.trackError = function (error, context) {
        this.logger.error("[ERROR] ".concat(error.name, " - ").concat(context || 'Unknown context'), {
            message: error.message,
            stack: error.stack,
        });
    };
    TelemetryAnalyzer.prototype.trackTiming = function (category, name, durationMs) {
        this.logger.info("[TIMING] ".concat(category, ":").concat(name), { durationMs: durationMs });
    };
    return TelemetryAnalyzer;
}());
exports.TelemetryAnalyzer = TelemetryAnalyzer;
