export interface AuditCheck {
  id: string;
  name: string;
  category: AuditCategory;
  severity: "critical" | "warning" | "info";
  description: string;
  run: () => Promise<AuditResult>;
}

export interface AuditResult {
  passed: boolean;
  status: "pass" | "fail" | "warn" | "skip";
  message: string;
  details?: Record<string, any>;
  remediation?: string;
  duration: number; // ms
}

export interface AuditReport {
  id: string;
  timestamp: string;
  version: string;
  hostname: string;
  platform: string;
  totalChecks: number;
  passed: number;
  failed: number;
  warnings: number;
  skipped: number;
  duration: number;
  categories: Record<AuditCategory, CategorySummary>;
  checks: AuditResultEntry[];
  summary: string;
}

export interface AuditResultEntry extends AuditResult {
  checkId: string;
  checkName: string;
  category: AuditCategory;
  severity: string;
}

export interface CategorySummary {
  total: number;
  passed: number;
  failed: number;
  warnings: number;
}

export type AuditCategory =
  | "database"
  | "security"
  | "filesystem"
  | "network"
  | "performance"
  | "configuration"
  | "dependencies"
  | "electron"
  | "services"
  | "backup";
