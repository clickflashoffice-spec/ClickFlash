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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var fs_1 = __importDefault(require("fs"));
var path_1 = __importDefault(require("path"));
var child_process_1 = require("child_process");
/**
 * ClickFlash Ecosystem Reset Script
 * Prepare the environment for a clean E2E test run.
 */
var BASE_DIR = process.cwd();
var APPS = ['master', 'touch', 'management', 'gallery', 'website', 'moneytrash'];
var SharedSeed_1 = require("./utils/SharedSeed");
function reset() {
    return __awaiter(this, void 0, void 0, function () {
        var ports, _i, ports_1, port, stdout, lines, _a, lines_1, line, pid, dataDirs, _b, dataDirs_1, dir, masterEnv;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    console.log('--- ClickFlash Ecosystem Reset ---');
                    ports = [8090, 8091, 5173, 5174, 5175, 3000, 3001, 1883, 1420];
                    console.log("Checking ports: ".concat(ports.join(', '), "..."));
                    for (_i = 0, ports_1 = ports; _i < ports_1.length; _i++) {
                        port = ports_1[_i];
                        try {
                            if (process.platform === 'win32') {
                                stdout = (0, child_process_1.execSync)("netstat -ano | findstr :".concat(port)).toString();
                                lines = stdout.split('\n');
                                for (_a = 0, lines_1 = lines; _a < lines_1.length; _a++) {
                                    line = lines_1[_a];
                                    if (line.includes('LISTENING')) {
                                        pid = line.trim().split(/\s+/).pop();
                                        if (pid) {
                                            console.log("Killing process ".concat(pid, " on port ").concat(port, "..."));
                                            (0, child_process_1.execSync)("taskkill /F /PID ".concat(pid));
                                        }
                                    }
                                }
                            }
                            else {
                                (0, child_process_1.execSync)("lsof -t -i:".concat(port, " | xargs kill -9"), { stdio: 'ignore' });
                            }
                        }
                        catch (e) {
                            // Port likely not in use
                        }
                    }
                    dataDirs = [
                        path_1.default.join(BASE_DIR, 'apps/desktop/master/pb_data'),
                        path_1.default.join(BASE_DIR, 'apps/desktop/touch/pb_data'),
                        path_1.default.join(BASE_DIR, 'apps/management/pb_data'), // If exists
                    ];
                    console.log('Cleaning data directories...');
                    for (_b = 0, dataDirs_1 = dataDirs; _b < dataDirs_1.length; _b++) {
                        dir = dataDirs_1[_b];
                        if (fs_1.default.existsSync(dir)) {
                            console.log("Deleting ".concat(dir, "..."));
                            try {
                                fs_1.default.rmSync(dir, { recursive: true, force: true });
                                fs_1.default.mkdirSync(dir, { recursive: true });
                            }
                            catch (err) {
                                console.warn("Could not fully clean ".concat(dir, ": ").concat(err.message));
                            }
                        }
                    }
                    // 3. Environment Variable Sanity Check
                    console.log('Verifying .env files...');
                    masterEnv = path_1.default.join(BASE_DIR, 'apps/desktop/master/.env');
                    if (!fs_1.default.existsSync(masterEnv)) {
                        console.error('FATAL: apps/desktop/master/.env is missing! Tests will fail.');
                        process.exit(1);
                    }
                    // 4. Seed databases
                    return [4 /*yield*/, SharedSeed_1.SharedSeed.resetEcosystem()];
                case 1:
                    // 4. Seed databases
                    _c.sent();
                    console.log('--- Reset Complete ---');
                    return [2 /*return*/];
            }
        });
    });
}
reset();
