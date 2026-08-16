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
exports.SharedSeed = void 0;
var better_sqlite3_multiple_ciphers_1 = __importDefault(require("better-sqlite3-multiple-ciphers"));
var path_1 = __importDefault(require("path"));
var fs_1 = __importDefault(require("fs"));
/**
 * SharedSeed: Ensures a clean, predictable state across the ecosystem.
 * Used at the start of Ecosystem E2E tests.
 */
var SharedSeed = /** @class */ (function () {
    function SharedSeed() {
    }
    SharedSeed.resetEcosystem = function () {
        return __awaiter(this, void 0, void 0, function () {
            var TEST_EMAIL, TEST_PASS, masterDbPath, touchDbPath, runMigrationsForDb, masterDb, masterMigrationsDir1, masterMigrationsDir2, touchDb, touchMigrationsDir;
            return __generator(this, function (_a) {
                console.log("[Seed] Resetting Ecosystem Data...");
                TEST_EMAIL = "admin@clickflash.local";
                TEST_PASS = "$2b$12$FIj38CWm5vGhjjrH1WdpH.3E0gh56jdrnKuHsvy4v8OLM5ljBMRaq";
                masterDbPath = path_1.default.resolve(__dirname, "../../../apps/desktop/master/pb_data/master.db");
                touchDbPath = path_1.default.resolve(__dirname, "../../../apps/desktop/touch/pb_data/touch.db");
                // Clear Databases
                [masterDbPath, touchDbPath].forEach(function (dbPath) {
                    try {
                        if (fs_1.default.existsSync(dbPath)) {
                            fs_1.default.unlinkSync(dbPath);
                            console.log("[Seed] Deleted ".concat(path_1.default.basename(dbPath)));
                        }
                        // Also clear journal files if they exist
                        var walPath = "".concat(dbPath, "-wal");
                        var shmPath = "".concat(dbPath, "-shm");
                        if (fs_1.default.existsSync(walPath))
                            fs_1.default.unlinkSync(walPath);
                        if (fs_1.default.existsSync(shmPath))
                            fs_1.default.unlinkSync(shmPath);
                        fs_1.default.mkdirSync(path_1.default.dirname(dbPath), { recursive: true });
                    }
                    catch (e) {
                        if (e.code === 'EBUSY' || e.code === 'EPERM') {
                            console.warn("[Seed] WARNING: Could not delete ".concat(path_1.default.basename(dbPath), ". File is locked. Please stop all Master/Touch backend processes and retry."));
                            // We throw because the rest of the seed will fail if we can't reset
                            throw e;
                        }
                        throw e;
                    }
                });
                runMigrationsForDb = function (db, dirs) {
                    db.exec('CREATE TABLE IF NOT EXISTS migrations (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, applied_at DATETIME DEFAULT CURRENT_TIMESTAMP);');
                    var getApplied = db.prepare('SELECT name FROM migrations');
                    var insertMigration = db.prepare('INSERT INTO migrations (name) VALUES (?)');
                    for (var _i = 0, dirs_1 = dirs; _i < dirs_1.length; _i++) {
                        var dir = dirs_1[_i];
                        if (!fs_1.default.existsSync(dir))
                            continue;
                        var applied = new Set(getApplied.all().map(function (m) { return m.name; }));
                        var files = fs_1.default.readdirSync(dir).sort();
                        var _loop_1 = function (file) {
                            if (!file.endsWith(".sql") || applied.has(file))
                                return "continue";
                            var content = fs_1.default.readFileSync(path_1.default.join(dir, file), "utf8").split(/--\s*Down/i)[0];
                            try {
                                db.transaction(function () {
                                    try {
                                        db.exec(content);
                                    }
                                    catch (err) {
                                        var msg = err.message || '';
                                        if (msg.includes('duplicate column') || msg.includes('already exists') || msg.includes('duplicate column name')) {
                                            // Ignore duplicate column errors like production DB manager
                                        }
                                        else {
                                            throw err;
                                        }
                                    }
                                    insertMigration.run(file);
                                })();
                            }
                            catch (e) {
                                console.error("[Seed] Migration Error in ".concat(file, ":"), e.message);
                            }
                        };
                        for (var _a = 0, files_1 = files; _a < files_1.length; _a++) {
                            var file = files_1[_a];
                            _loop_1(file);
                        }
                    }
                };
                // Initialize Master DB and run migrations
                fs_1.default.mkdirSync(path_1.default.dirname(masterDbPath), { recursive: true });
                masterDb = new better_sqlite3_multiple_ciphers_1.default(masterDbPath);
                masterMigrationsDir1 = path_1.default.resolve(__dirname, "../../../apps/desktop/master/backend/database/migrations");
                masterMigrationsDir2 = path_1.default.resolve(__dirname, "../../../apps/desktop/master/backend/migrations");
                runMigrationsForDb(masterDb, [masterMigrationsDir1, masterMigrationsDir2]);
                // Seed Master with Admin & Test Site
                masterDb.exec("\n      INSERT OR IGNORE INTO users (email, password, name, role, created_at, updated_at) \n      VALUES ('".concat(TEST_EMAIL, "', '").concat(TEST_PASS, "', 'Admin', 'Admin', datetime('now'), datetime('now'));\n      \n      INSERT OR REPLACE INTO settings (id, key, value) VALUES ('1', 'site_id', 'TN-E2E-TEST');\n      INSERT OR REPLACE INTO settings (id, key, value) VALUES ('2', 'desk_id', 'DESK-001');\n\n      INSERT OR IGNORE INTO role_permissions (role, permission) VALUES ('Admin', 'manageAllAlbums');\n      INSERT OR IGNORE INTO role_permissions (role, permission) VALUES ('Admin', 'viewAlbums');\n      INSERT OR IGNORE INTO role_permissions (role, permission) VALUES ('Admin', 'viewDashboard');\n\n      INSERT OR IGNORE INTO kiosks (id, name, status, signingSecret, created_at, updated_at) \n      VALUES ('test-kiosk-1', 'Test Kiosk 1', 'active', 'test-secret', datetime('now'), datetime('now'));\n\n      INSERT OR IGNORE INTO albums (id, title, date, created_at, updated_at)\n      VALUES ('test-album-001', 'Test Album', date('now'), datetime('now'), datetime('now'));\n\n      INSERT OR IGNORE INTO photos (id, albumId, url, thumbnailUrl, created_at)\n      VALUES ('test-photo-001', 'test-album-001', '/test/photo1.jpg', '/test/thumb1.jpg', datetime('now'));\n    "));
                masterDb.close();
                // Initialize Touch DB and run migrations
                fs_1.default.mkdirSync(path_1.default.dirname(touchDbPath), { recursive: true });
                touchDb = new better_sqlite3_multiple_ciphers_1.default(touchDbPath);
                touchMigrationsDir = path_1.default.resolve(__dirname, "../../../apps/desktop/touch/backend/migrations");
                runMigrationsForDb(touchDb, [touchMigrationsDir]);
                // Seed Touch with config
                touchDb.exec("\n      INSERT OR REPLACE INTO settings (id, key, value) VALUES ('s1', 'masterApiUrl', 'http://127.0.0.1:8090');\n      INSERT OR REPLACE INTO settings (id, key, value) VALUES ('s2', 'siteId', 'TN-E2E-TEST');\n      INSERT OR REPLACE INTO settings (id, key, value) VALUES ('s3', 'kioskId', 'test-kiosk-1');\n      INSERT OR REPLACE INTO settings (id, key, value) VALUES ('s4', 'signingSecret', 'test-secret');\n    ");
                touchDb.close();
                console.log("[Seed] Ecosystem Reset Complete.");
                return [2 /*return*/];
            });
        });
    };
    return SharedSeed;
}());
exports.SharedSeed = SharedSeed;
