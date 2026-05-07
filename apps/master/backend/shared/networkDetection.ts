// backend/shared/networkDetection.ts
import os from 'os';
import { DatabaseManager } from './db';
import { Logger } from './logger';
import AuditLogger from './auditLogger';

interface IPObject { name: string; ip: string; netmask: string; mac: string; }
interface WhitelistConfig { enabled: boolean; ips: string[]; }

export function isPrivateIP(ip: string): boolean {
    if (!ip || typeof ip !== 'string') return false;
    const cleanIp = ip.replace(/^::ffff:/, '');
    if (cleanIp === '127.0.0.1' || cleanIp === '::1' || cleanIp === 'localhost') return true;
    if (cleanIp.startsWith('192.168.') || cleanIp.startsWith('10.')) return true;
    const ip172Match = cleanIp.match(/^172\.(1[6-9]|2[0-9]|3[0-1])\./);
    if (ip172Match) return true;
    if (cleanIp.startsWith('fe80:')) return true;
    return false;
}

export function isIPInCIDR(ip: string, cidr: string): boolean {
    if (!ip || !cidr) return false;
    const [range, prefixLength] = cidr.split('/');
    const prefix = parseInt(prefixLength, 10);
    if (isNaN(prefix)) return false;
    const ipParts = ip.split('.').map(Number);
    const rangeParts = range.split('.').map(Number);
    if (ipParts.length !== 4 || rangeParts.length !== 4) return false;
    const mask = (0xFFFFFFFF << (32 - prefix)) >>> 0;
    const ipNum = (ipParts[0] << 24) + (ipParts[1] << 16) + (ipParts[2] << 8) + ipParts[3];
    const rangeNum = (rangeParts[0] << 24) + (rangeParts[1] << 16) + (rangeParts[2] << 8) + rangeParts[3];
    return (ipNum & mask) === (rangeNum & mask);
}

export function getLocalNetworkIPs(): IPObject[] {
    const interfaces = os.networkInterfaces();
    const ipList: IPObject[] = [];
    Object.keys(interfaces).forEach(name => {
        const networkInterface = interfaces[name];
        if (networkInterface) {
            networkInterface.forEach(net => {
                if (net.family === 'IPv4' && !net.internal) {
                    ipList.push({ name, ip: net.address, netmask: net.netmask, mac: net.mac });
                }
            });
        }
    });
    return ipList;
}

export class NetworkDetectionManager {
    private dbManager: DatabaseManager;
    private auditLogger: AuditLogger;
    private whitelist: Set<string> = new Set();
    private whitelistEnabled: boolean = true;

    constructor(dbManager: DatabaseManager, auditLogger: AuditLogger, _logger: Logger) {
        this.dbManager = dbManager;
        this.auditLogger = auditLogger;
        this.loadWhitelist();
    }

    private loadWhitelist(): void {
        try {
            const setting = this.dbManager.get<{ value: string }>("SELECT value FROM settings WHERE key = 'networkWhitelist'");
            if (setting) {
                const config: WhitelistConfig = JSON.parse(setting.value);
                this.whitelistEnabled = config.enabled !== false;
                this.whitelist = new Set(config.ips || []);
            }
            getLocalNetworkIPs().forEach(ipInfo => this.whitelist.add(ipInfo.ip));
        } catch (error) {
            getLocalNetworkIPs().forEach(ipInfo => this.whitelist.add(ipInfo.ip));
        }
    }

    public isIPAllowed(ip: string, endpoint: string = ''): boolean {
        if (!ip) return false;
        if (isPrivateIP(ip)) return true;
        if (this.whitelistEnabled) {
            if (this.whitelist.has(ip)) return true;
            for (const entry of this.whitelist) {
                if (entry.includes('/') && isIPInCIDR(ip, entry)) return true;
            }
        }
        this.auditLogger.logUnauthorizedAccess(endpoint, ip, 'IP not in whitelist');
        return false;
    }

    private saveWhitelist(): void {
        try {
            const config: WhitelistConfig = { enabled: this.whitelistEnabled, ips: Array.from(this.whitelist) };
            const existing = this.dbManager.get("SELECT * FROM settings WHERE key = 'networkWhitelist'");
            if (existing) {
                this.dbManager.run("UPDATE settings SET value = ?, updated_at = ? WHERE key = 'networkWhitelist'", [JSON.stringify(config), new Date().toISOString()]);
            } else {
                this.dbManager.run("INSERT INTO settings (key, value, created_at, updated_at) VALUES (?, ?, ?, ?)", ['networkWhitelist', JSON.stringify(config), new Date().toISOString(), new Date().toISOString()]);
            }
        } catch (error) { 
            console.warn('[NetworkDetection] Failed to save whitelist:', error instanceof Error ? error.message : String(error));
        }
    }

    public addToWhitelist(ip: string): void { if (ip) { this.whitelist.add(ip); this.saveWhitelist(); } }
    public removeFromWhitelist(ip: string): void { this.whitelist.delete(ip); this.saveWhitelist(); }
}
