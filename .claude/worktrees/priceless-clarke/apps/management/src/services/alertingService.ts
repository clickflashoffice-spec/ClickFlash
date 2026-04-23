/**
 * Advanced Alerting & Notifications Service
 * Manages configurable alerts, notifications, and escalation workflows
 */

import { EventEmitter } from "../utils/EventEmitter";

interface AlertRule {
  id: string;
  name: string;
  description?: string;
  condition: {
    metric:
      | "orders"
      | "revenue"
      | "photos"
      | "errors"
      | "uptime"
      | "queue-size"
      | "storage";
    operator: ">" | "<" | ">=" | "<=" | "==" | "!=";
    threshold: number;
    duration?: number; // minutes (for sustained alerts)
  };
  severity: "info" | "warning" | "critical";
  channels: Array<"email" | "sms" | "push" | "webhook" | "slack">;
  recipients: string[]; // User IDs or email addresses
  cooldown: number; // minutes between alerts
  enabled: boolean;
  autoResolve: boolean;
  createdAt: Date;
  lastTriggered?: Date;
}

interface Alert {
  id: string;
  ruleId: string;
  ruleName: string;
  severity: AlertRule["severity"];
  message: string;
  details: Record<string, any>;
  status: "active" | "acknowledged" | "resolved" | "suppressed";
  triggeredAt: Date;
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
  resolvedAt?: Date;
  channelsSent: AlertRule["channels"];
  escalationLevel: number;
}

interface Notification {
  id: string;
  type: "alert" | "system" | "user" | "marketing";
  title: string;
  message: string;
  severity: "info" | "success" | "warning" | "error";
  read: boolean;
  createdAt: Date;
  expiresAt?: Date;
  action?: {
    label: string;
    url: string;
  };
}

interface EscalationPolicy {
  levels: Array<{
    name: string;
    delay: number; // minutes
    recipients: string[];
    channels: AlertRule["channels"];
  }>;
}

interface AlertStats {
  totalAlerts: number;
  activeAlerts: number;
  alertsBySeverity: Record<string, number>;
  averageResolutionTime: number;
  mostTriggeredRules: Array<{ ruleId: string; name: string; count: number }>;
}

class AlertingService extends EventEmitter {
  private rules: Map<string, AlertRule> = new Map();
  private alerts: Map<string, Alert> = new Map();
  private notifications: Map<string, Notification> = new Map();
  private escalationPolicies: Map<string, EscalationPolicy> = new Map();
  private ruleTimers: Map<string, any> = new Map();

  /**
   * Create a new alert rule
   */
  createRule(rule: Omit<AlertRule, "id" | "createdAt">): AlertRule {
    const id = `rule-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const newRule: AlertRule = {
      ...rule,
      id,
      createdAt: new Date(),
    };

    this.rules.set(id, newRule);

    if (newRule.enabled) {
      this.startRuleMonitoring(id);
    }

    this.emit("rule:created", newRule);
    return newRule;
  }

  /**
   * Start monitoring for a rule
   */
  private startRuleMonitoring(ruleId: string): void {
    // Clear existing timer
    this.stopRuleMonitoring(ruleId);

    // In a real implementation, this would:
    // 1. Set up metric collection
    // 2. Check conditions periodically
    // 3. Trigger alerts when conditions are met

    // Simulate monitoring (every minute)
    const timer = setInterval(() => {
      this.evaluateRule(ruleId);
    }, 60000);

    this.ruleTimers.set(ruleId, timer);
  }

  /**
   * Stop monitoring for a rule
   */
  private stopRuleMonitoring(ruleId: string): void {
    const timer = this.ruleTimers.get(ruleId);
    if (timer) {
      clearInterval(timer);
      this.ruleTimers.delete(ruleId);
    }
  }

  /**
   * Evaluate a rule's condition
   */
  private async evaluateRule(ruleId: string): Promise<void> {
    const rule = this.rules.get(ruleId);
    if (!rule || !rule.enabled) return;

    // Check cooldown
    if (rule.lastTriggered) {
      const minutesSince = (Date.now() - rule.lastTriggered.getTime()) / 60000;
      if (minutesSince < rule.cooldown) return;
    }

    // In real implementation, fetch actual metric value
    const metricValue = await this.getMetricValue(rule.condition.metric);

    // Evaluate condition
    const triggered = this.evaluateCondition(
      metricValue,
      rule.condition.operator,
      rule.condition.threshold,
    );

    if (triggered) {
      this.triggerAlert(rule, metricValue);
    }
  }

  /**
   * Evaluate a condition
   */
  private evaluateCondition(
    value: number,
    operator: string,
    threshold: number,
  ): boolean {
    switch (operator) {
      case ">":
        return value > threshold;
      case "<":
        return value < threshold;
      case ">=":
        return value >= threshold;
      case "<=":
        return value <= threshold;
      case "==":
        return value === threshold;
      case "!=":
        return value !== threshold;
      default:
        return false;
    }
  }

  /**
   * Get metric value (simulated)
   */
  private async getMetricValue(metric: string): Promise<number> {
    // In real implementation, fetch from monitoring system
    return Math.random() * 100;
  }

  /**
   * Trigger an alert
   */
  private triggerAlert(rule: AlertRule, metricValue: number): void {
    const alertId = `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const alert: Alert = {
      id: alertId,
      ruleId: rule.id,
      ruleName: rule.name,
      severity: rule.severity,
      message: `${rule.name}: ${rule.condition.metric} is ${rule.condition.operator} ${rule.condition.threshold} (current: ${metricValue})`,
      details: {
        metric: rule.condition.metric,
        operator: rule.condition.operator,
        threshold: rule.condition.threshold,
        currentValue: metricValue,
      },
      status: "active",
      triggeredAt: new Date(),
      channelsSent: [],
      escalationLevel: 0,
    };

    this.alerts.set(alertId, alert);
    rule.lastTriggered = new Date();

    // Send notifications through configured channels
    this.sendNotifications(alert, rule);

    // Start escalation if configured
    if (this.escalationPolicies.has(rule.id)) {
      this.startEscalation(alertId, rule.id);
    }

    this.emit("alert:triggered", alert);
  }

  /**
   * Send notifications through channels
   */
  private async sendNotifications(
    alert: Alert,
    rule: AlertRule,
  ): Promise<void> {
    for (const channel of rule.channels) {
      try {
        await this.sendToChannel(channel, alert, rule);
        alert.channelsSent.push(channel);
      } catch (error) {
        console.error(`Failed to send alert to ${channel}:`, error);
      }
    }
  }

  /**
   * Send to specific channel
   */
  private async sendToChannel(
    channel: string,
    alert: Alert,
    rule: AlertRule,
  ): Promise<void> {
    switch (channel) {
      case "email":
        // Send email via SMTP
        console.log(`[Alerting] Email sent: ${alert.message}`);
        break;
      case "sms":
        // Send SMS via Twilio/similar
        console.log(`[Alerting] SMS sent: ${alert.message}`);
        break;
      case "push":
        // Send push notification
        console.log(`[Alerting] Push sent: ${alert.message}`);
        break;
      case "slack":
        // Send to Slack webhook
        console.log(`[Alerting] Slack message sent: ${alert.message}`);
        break;
      case "webhook":
        // POST to webhook URL
        console.log(`[Alerting] Webhook called: ${alert.message}`);
        break;
    }
  }

  /**
   * Start escalation process
   */
  private startEscalation(alertId: string, ruleId: string): void {
    const policy = this.escalationPolicies.get(ruleId);
    if (!policy) return;

    let currentLevel = 0;

    const escalate = () => {
      const alert = this.alerts.get(alertId);
      if (!alert || alert.status !== "active") return;

      currentLevel++;
      if (currentLevel >= policy.levels.length) return;

      const level = policy.levels[currentLevel];
      alert.escalationLevel = currentLevel;

      // Send to next level recipients
      for (const recipient of level.recipients) {
        this.sendToChannel(level.channels[0], alert, this.rules.get(ruleId)!);
      }

      // Schedule next escalation
      if (currentLevel < policy.levels.length - 1) {
        setTimeout(escalate, level.delay * 60000);
      }
    };

    // Start after first level delay
    const firstLevel = policy.levels[0];
    setTimeout(escalate, firstLevel.delay * 60000);
  }

  /**
   * Acknowledge an alert
   */
  acknowledgeAlert(alertId: string, userId: string): boolean {
    const alert = this.alerts.get(alertId);
    if (!alert || alert.status !== "active") return false;

    alert.status = "acknowledged";
    alert.acknowledgedAt = new Date();
    alert.acknowledgedBy = userId;

    this.emit("alert:acknowledged", alert);
    return true;
  }

  /**
   * Resolve an alert
   */
  resolveAlert(alertId: string): boolean {
    const alert = this.alerts.get(alertId);
    if (!alert) return false;

    alert.status = "resolved";
    alert.resolvedAt = new Date();

    this.emit("alert:resolved", alert);
    return true;
  }

  /**
   * Suppress an alert
   */
  suppressAlert(alertId: string, duration: number): boolean {
    const alert = this.alerts.get(alertId);
    if (!alert) return false;

    alert.status = "suppressed";

    // Auto-resolve after duration
    setTimeout(() => {
      this.resolveAlert(alertId);
    }, duration * 60000);

    return true;
  }

  /**
   * Create user notification
   */
  createNotification(
    notification: Omit<Notification, "id" | "createdAt" | "read">,
  ): Notification {
    const id = `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const newNotification: Notification = {
      ...notification,
      id,
      createdAt: new Date(),
      read: false,
    };

    this.notifications.set(id, newNotification);
    this.emit("notification:created", newNotification);

    return newNotification;
  }

  /**
   * Mark notification as read
   */
  markNotificationRead(notificationId: string): boolean {
    const notification = this.notifications.get(notificationId);
    if (!notification) return false;

    notification.read = true;
    return true;
  }

  /**
   * Get all active alerts
   */
  getActiveAlerts(): Alert[] {
    return Array.from(this.alerts.values())
      .filter((a) => a.status === "active")
      .sort((a, b) => b.triggeredAt.getTime() - a.triggeredAt.getTime());
  }

  /**
   * Get all alerts
   */
  getAllAlerts(): Alert[] {
    return Array.from(this.alerts.values()).sort(
      (a, b) => b.triggeredAt.getTime() - a.triggeredAt.getTime(),
    );
  }

  /**
   * Get unread notifications
   */
  getUnreadNotifications(): Notification[] {
    return Array.from(this.notifications.values())
      .filter((n) => !n.read)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Get all rules
   */
  getAllRules(): AlertRule[] {
    return Array.from(this.rules.values()).sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );
  }

  /**
   * Update rule
   */
  updateRule(ruleId: string, updates: Partial<AlertRule>): boolean {
    const rule = this.rules.get(ruleId);
    if (!rule) return false;

    Object.assign(rule, updates);

    // Restart monitoring if enabled state changed
    if (updates.enabled !== undefined) {
      if (updates.enabled) {
        this.startRuleMonitoring(ruleId);
      } else {
        this.stopRuleMonitoring(ruleId);
      }
    }

    this.emit("rule:updated", rule);
    return true;
  }

  /**
   * Delete rule
   */
  deleteRule(ruleId: string): boolean {
    const rule = this.rules.get(ruleId);
    if (!rule) return false;

    this.stopRuleMonitoring(ruleId);
    this.rules.delete(ruleId);

    this.emit("rule:deleted", rule);
    return true;
  }

  /**
   * Get alert statistics
   */
  getStats(): AlertStats {
    const alerts = this.getAllAlerts();
    const active = this.getActiveAlerts();

    const bySeverity: Record<string, number> = {};
    alerts.forEach((a) => {
      bySeverity[a.severity] = (bySeverity[a.severity] || 0) + 1;
    });

    // Calculate average resolution time
    const resolvedAlerts = alerts.filter((a) => a.resolvedAt && a.triggeredAt);
    const avgResolutionTime =
      resolvedAlerts.length > 0
        ? resolvedAlerts.reduce(
            (sum, a) =>
              sum + (a.resolvedAt!.getTime() - a.triggeredAt.getTime()),
            0,
          ) /
          resolvedAlerts.length /
          60000 // Convert to minutes
        : 0;

    // Most triggered rules
    const ruleCounts: Record<string, { name: string; count: number }> = {};
    alerts.forEach((a) => {
      if (!ruleCounts[a.ruleId]) {
        ruleCounts[a.ruleId] = { name: a.ruleName, count: 0 };
      }
      ruleCounts[a.ruleId].count++;
    });

    const mostTriggered = Object.entries(ruleCounts)
      .map(([ruleId, data]) => ({ ruleId, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalAlerts: alerts.length,
      activeAlerts: active.length,
      alertsBySeverity: bySeverity,
      averageResolutionTime: Math.round(avgResolutionTime * 100) / 100,
      mostTriggeredRules: mostTriggered,
    };
  }

  /**
   * Cleanup old alerts
   */
  cleanup(maxAgeDays: number = 30): number {
    const cutoff = new Date(Date.now() - maxAgeDays * 24 * 60 * 60 * 1000);
    let removed = 0;

    for (const [id, alert] of this.alerts.entries()) {
      if (
        alert.status === "resolved" &&
        alert.resolvedAt &&
        alert.resolvedAt < cutoff
      ) {
        this.alerts.delete(id);
        removed++;
      }
    }

    return removed;
  }
}

// Export singleton instance
export const alertingService = new AlertingService();
export type { AlertRule, Alert, Notification, EscalationPolicy, AlertStats };
