#pragma once

#include "http/HttpServer.h"
#include "http/Router.h"
#include "database/DatabaseManager.h"

namespace ClickFlash {

class LedgerController {
public:
    static void registerRoutes(Router& router) {
        router.get("/api/ledger", handleGetLedger);
        router.post("/api/ledger/adjust", handleAdjust);
        router.get("/api/ledger/summary", handleSummary);
        router.get("/api/ledger/periods", handlePeriods);
    }
    
    static void handleGetLedger(const HttpRequest& req, HttpResponse& res) {
        QString photographerId = req.query.value("photographerId");
        QString startDate = req.query.value("startDate");
        QString endDate = req.query.value("endDate");
        
        DatabaseManager& db = DatabaseManager::instance();
        
        QString query = "SELECT * FROM photographer_ledger WHERE 1=1";
        QVariantMap params;
        
        if (!photographerId.isEmpty()) {
            query += " AND photographer_id = :photographerId";
            params["photographerId"] = photographerId;
        }
        if (!startDate.isEmpty()) {
            query += " AND date >= :startDate";
            params["startDate"] = startDate;
        }
        if (!endDate.isEmpty()) {
            query += " AND date <= :endDate";
            params["endDate"] = endDate;
        }
        query += " ORDER BY date DESC, created_at DESC";
        
        auto results = db.executeQueryMultiple(query, params);
        
        QVariantList entries;
        for (const QVariantMap& row : results) {
            entries.append(QVariantMap({
                {"id", row.value("id").toInt()},
                {"photographerId", row.value("photographerId").toInt()},
                {"period", row.value("period")},
                {"salary", row.value("salary").toDouble()},
                {"commission", row.value("commission").toDouble()},
                {"bonus", row.value("bonus").toDouble()},
                {"deductions", row.value("deductions").toDouble()},
                {"total", row.value("total").toDouble()},
                {"paid", row.value("paid").toInt() == 1},
                {"date", row.value("date")},
                {"createdAt", row.value("created_at")}
            }));
        }
        
        res.setJson(QVariantMap({
            {"success", true},
            {"data", entries},
            {"count", entries.size()}
        }));
    }
    
    static void handleAdjust(const HttpRequest& req, HttpResponse& res) {
        QString photographerId = req.body.value("photographerId").toString();
        QString type = req.body.value("type").toString();
        double amount = req.body.value("amount").toDouble();
        QString description = req.body.value("description").toString();
        QString date = req.body.value("date").toString();
        
        if (photographerId.isEmpty() || type.isEmpty() || description.isEmpty()) {
            res.setError(400, "Missing required fields");
            return;
        }
        
        QStringList validTypes = {"Bonus", "Deduction", "Salary", "Payout", "Correction"};
        if (!validTypes.contains(type)) {
            res.setError(400, "Invalid adjustment type");
            return;
        }
        
        if (date.isEmpty()) {
            date = QDate::currentDate().toString("yyyy-MM-dd");
        }
        
        DatabaseManager& db = DatabaseManager::instance();
        
        QString period = QDate::currentDate().toString("yyyy-MM");
        
        db.execute(
            "INSERT INTO photographer_ledger (photographer_id, period, type, amount, description, date, created_at) "
            "VALUES (:photographerId, :period, :type, :amount, :description, :date, CURRENT_TIMESTAMP)",
            {
                {"photographerId", photographerId.toInt()},
                {"period", period},
                {"type", type},
                {"amount", QString::number(amount, 'f', 2)},
                {"description", description},
                {"date", date}
            }
        );
        
        res.setJson(QVariantMap({
            {"success", true},
            {"message", "Adjustment added"}
        }));
    }
    
    static void handleSummary(const HttpRequest& req, HttpResponse& res) {
        QString photographerId = req.query.value("photographerId");
        
        DatabaseManager& db = DatabaseManager::instance();
        
        QString query = "SELECT "
            "COALESCE(SUM(salary), 0) as totalSalary, "
            "COALESCE(SUM(commission), 0) as totalCommission, "
            "COALESCE(SUM(bonus), 0) as totalBonus, "
            "COALESCE(SUM(deductions), 0) as totalDeductions, "
            "COALESCE(SUM(total), 0) as grandTotal, "
            "COALESCE(SUM(CASE WHEN paid = 0 THEN total ELSE 0 END), 0) as outstanding "
            "FROM photographer_ledger WHERE 1=1";
        
        QVariantMap params;
        if (!photographerId.isEmpty()) {
            query += " AND photographer_id = :photographerId";
            params["photographerId"] = photographerId.toInt();
        }
        
        auto result = db.executeQuery(query, params);
        
        res.setJson(QVariantMap({
            {"totalSalary", result.value("totalSalary").toDouble()},
            {"totalCommission", result.value("totalCommission").toDouble()},
            {"totalBonus", result.value("totalBonus").toDouble()},
            {"totalDeductions", result.value("totalDeductions").toDouble()},
            {"grandTotal", result.value("grandTotal").toDouble()},
            {"outstanding", result.value("outstanding").toDouble()}
        }));
    }
    
    static void handlePeriods(const HttpRequest& req, HttpResponse& res) {
        Q_UNUSED(req);
        
        DatabaseManager& db = DatabaseManager::instance();
        
        auto results = db.executeQueryMultiple(
            "SELECT DISTINCT period FROM photographer_ledger ORDER BY period DESC LIMIT 12"
        );
        
        QVariantList periods;
        for (const QVariantMap& row : results) {
            periods.append(row.value("period"));
        }
        
        res.setJson(QVariantMap({
            {"periods", periods},
            {"count", periods.size()}
        }));
    }
};

} // namespace ClickFlash