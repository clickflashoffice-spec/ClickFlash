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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebLogger = exports.LogLevel = void 0;
var logger_1 = require("@clickflash/logger");
var LogLevel;
(function (LogLevel) {
    LogLevel[LogLevel["DEBUG"] = 0] = "DEBUG";
    LogLevel[LogLevel["INFO"] = 1] = "INFO";
    LogLevel[LogLevel["WARN"] = 2] = "WARN";
    LogLevel[LogLevel["ERROR"] = 3] = "ERROR";
    LogLevel[LogLevel["FATAL"] = 4] = "FATAL";
})(LogLevel || (exports.LogLevel = LogLevel = {}));
var WebLogger = /** @class */ (function () {
    function WebLogger(config) {
        var _this = this;
        this.queue = [];
        this.flushTimer = null;
        this.config = __assign({ flushIntervalMs: 5000, level: LogLevel.INFO }, config);
        if (typeof window !== 'undefined') {
            window.addEventListener('beforeunload', function () { return _this.flush(); });
            // Global error handlers
            window.addEventListener('error', function (event) {
                var _a;
                _this.error('Unhandled Error', {
                    message: event.message,
                    filename: event.filename,
                    lineno: event.lineno,
                    colno: event.colno,
                    error: (_a = event.error) === null || _a === void 0 ? void 0 : _a.stack,
                });
            });
            window.addEventListener('unhandledrejection', function (event) {
                _this.error('Unhandled Promise Rejection', {
                    reason: event.reason,
                });
            });
        }
        this.startFlushTimer();
    }
    WebLogger.prototype.startFlushTimer = function () {
        var _this = this;
        if (typeof window !== 'undefined' && !this.flushTimer) {
            this.flushTimer = window.setInterval(function () { return _this.flush(); }, this.config.flushIntervalMs);
        }
    };
    WebLogger.prototype.pushLog = function (levelName, levelValue, message, data) {
        if (levelValue < this.config.level)
            return;
        var entry = {
            timestamp: new Date().toISOString(),
            level: levelName,
            message: message,
            data: typeof this.config.sanitize === 'function' && data !== undefined ? this.config.sanitize(data) : data,
            service: this.config.serviceName,
            url: typeof window !== 'undefined' ? window.location.href : 'unknown',
        };
        this.queue.push(entry);
        // Also log to console in development
        if (process.env.NODE_ENV !== 'production') {
            var consoleMsg = "[".concat(this.config.serviceName, "] ").concat(message);
            if (levelValue === LogLevel.ERROR || levelValue === LogLevel.FATAL)
                logger_1.logger.error(String(consoleMsg) + ' ' + String(data));
            else if (levelValue === LogLevel.WARN)
                logger_1.logger.warn(String(consoleMsg) + ' ' + String(data));
            else if (levelValue === LogLevel.INFO)
                logger_1.logger.info(String(consoleMsg) + ' ' + String(data));
            else
                logger_1.logger.debug(String(consoleMsg) + ' ' + String(data));
        }
        if (this.queue.length >= 50) {
            this.flush();
        }
    };
    WebLogger.prototype.debug = function (message, arg1, arg2) { this.pushLog('DEBUG', LogLevel.DEBUG, message, arg2 !== undefined ? { data: arg1, extra: arg2 } : arg1); };
    WebLogger.prototype.info = function (message, arg1, arg2) { this.pushLog('INFO', LogLevel.INFO, message, arg2 !== undefined ? { data: arg1, extra: arg2 } : arg1); };
    WebLogger.prototype.warn = function (message, arg1, arg2) { this.pushLog('WARN', LogLevel.WARN, message, arg2 !== undefined ? { data: arg1, extra: arg2 } : arg1); };
    WebLogger.prototype.error = function (message, arg1, arg2) { this.pushLog('ERROR', LogLevel.ERROR, message, arg2 !== undefined ? { data: arg1, extra: arg2 } : arg1); };
    WebLogger.prototype.fatal = function (message, arg1, arg2) { this.pushLog('FATAL', LogLevel.FATAL, message, arg2 !== undefined ? { data: arg1, extra: arg2 } : arg1); };
    WebLogger.prototype.flush = function () {
        return __awaiter(this, void 0, void 0, function () {
            var logsToSend, headers, token, blob, err_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (this.queue.length === 0)
                            return [2 /*return*/];
                        logsToSend = __spreadArray([], this.queue, true);
                        this.queue = [];
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 5, , 6]);
                        headers = {
                            'Content-Type': 'application/json',
                        };
                        if (typeof sessionStorage !== 'undefined') {
                            token = sessionStorage.getItem('authToken');
                            if (token) {
                                headers['Authorization'] = "Bearer ".concat(token);
                            }
                        }
                        if (!(typeof navigator !== 'undefined' && navigator.sendBeacon)) return [3 /*break*/, 2];
                        blob = new Blob([JSON.stringify({ logs: logsToSend })], { type: 'application/json' });
                        navigator.sendBeacon(this.config.endpointUrl, blob);
                        return [3 /*break*/, 4];
                    case 2: return [4 /*yield*/, fetch(this.config.endpointUrl, {
                            method: 'POST',
                            headers: headers,
                            body: JSON.stringify({ logs: logsToSend }),
                            keepalive: true,
                        })];
                    case 3:
                        _a.sent();
                        _a.label = 4;
                    case 4: return [3 /*break*/, 6];
                    case 5:
                        err_1 = _a.sent();
                        // If flush fails, push back to queue (limit size to prevent memory leaks)
                        if (this.queue.length < 500) {
                            this.queue = __spreadArray(__spreadArray([], logsToSend, true), this.queue, true);
                        }
                        return [3 /*break*/, 6];
                    case 6: return [2 /*return*/];
                }
            });
        });
    };
    return WebLogger;
}());
exports.WebLogger = WebLogger;
__exportStar(require("./vitals"), exports);
__exportStar(require("./analyzer"), exports);
