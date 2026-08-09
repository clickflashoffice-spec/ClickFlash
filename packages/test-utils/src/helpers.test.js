"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
var vitest_1 = require("vitest");
var helpers_js_1 = require("./helpers.js");
(0, vitest_1.describe)('wait', function () {
    (0, vitest_1.it)('resolves after specified ms', function () { return __awaiter(void 0, void 0, void 0, function () {
        var start;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    start = Date.now();
                    return [4 /*yield*/, (0, helpers_js_1.wait)(50)];
                case 1:
                    _a.sent();
                    (0, vitest_1.expect)(Date.now() - start).toBeGreaterThanOrEqual(45);
                    return [2 /*return*/];
            }
        });
    }); });
});
(0, vitest_1.describe)('createDeferred', function () {
    (0, vitest_1.it)('resolves with value', function () { return __awaiter(void 0, void 0, void 0, function () {
        var _a, promise, resolve;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _a = (0, helpers_js_1.createDeferred)(), promise = _a.promise, resolve = _a.resolve;
                    resolve('hello');
                    return [4 /*yield*/, (0, vitest_1.expect)(promise).resolves.toBe('hello')];
                case 1:
                    _b.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, vitest_1.it)('rejects with reason', function () { return __awaiter(void 0, void 0, void 0, function () {
        var _a, promise, reject;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _a = (0, helpers_js_1.createDeferred)(), promise = _a.promise, reject = _a.reject;
                    reject(new Error('fail'));
                    return [4 /*yield*/, (0, vitest_1.expect)(promise).rejects.toThrow('fail')];
                case 1:
                    _b.sent();
                    return [2 /*return*/];
            }
        });
    }); });
});
(0, vitest_1.describe)('generateId', function () {
    (0, vitest_1.it)('generates unique ids', function () {
        var id1 = (0, helpers_js_1.generateId)();
        var id2 = (0, helpers_js_1.generateId)();
        (0, vitest_1.expect)(id1).not.toBe(id2);
        (0, vitest_1.expect)(typeof id1).toBe('string');
        (0, vitest_1.expect)(id1.length).toBeGreaterThan(0);
    });
});
(0, vitest_1.describe)('clamp', function () {
    (0, vitest_1.it)('clamps to min', function () {
        (0, vitest_1.expect)((0, helpers_js_1.clamp)(-5, 0, 10)).toBe(0);
    });
    (0, vitest_1.it)('clamps to max', function () {
        (0, vitest_1.expect)((0, helpers_js_1.clamp)(15, 0, 10)).toBe(10);
    });
    (0, vitest_1.it)('returns value within range', function () {
        (0, vitest_1.expect)((0, helpers_js_1.clamp)(5, 0, 10)).toBe(5);
    });
});
