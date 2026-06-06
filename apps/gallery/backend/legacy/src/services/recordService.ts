import http from 'http';
import crypto from 'node:crypto';
import DatabaseManager from '../db.js';
import Logger from '../logger.js';
import AuditLogger from '../auditLogger.js';
import { TABLE_MAP, JSON_COLUMNS, ALLOWED_COLUMNS } from '../config.js';
import { validateRequest } from '../validation.js';
import { hashPassword } from '../auth.js';
import { sendError, sendValidationError, sendInvalidInputError, sendDatabaseError } from '../errorHandler.js';

export class RecordService {
    private db: DatabaseManager;
    private logger: Logger;
    private auditLogger: AuditLogger;

    constructor(db: DatabaseManager, logger: Logger, auditLogger: AuditLogger) {
        this.db = db;
        this.logger = logger;
        this.auditLogger = auditLogger;
    }

    /**
     * List records from a collection with filtering, sorting, and pagination
     */
    async listRecords(res: http.ServerResponse, collection: string, query: URLSearchParams, pathName: string): Promise<void> {
        const table = TABLE_MAP[collection] || collection;

        try {
            // Basic check if table exists
            this.db.query(`SELECT 1 FROM ${table} LIMIT 1`);
        } catch (e: any) {
            this.logger.error(`Table access error for '${table}'`, { collection, error: e.message });
            sendError(res, 500, 'Database Error', `Table '${table}' does not exist.`);
            return;
        }

        const filterParam = query.get('filter');
        const sortParam = query.get('sort');
        const pageParam = query.get('page');
        const perPageParam = query.get('perPage');

        const page = pageParam ? Math.max(1, parseInt(pageParam, 10)) : 1;
        const perPage = perPageParam ? Math.min(500, Math.max(1, parseInt(perPageParam, 10))) : 50;

        let sql = `SELECT * FROM ${table}`;
        let params: any[] = [];
        let countSql = `SELECT COUNT(*) as total FROM ${table}`;
        let countParams: any[] = [];

        // 1. Filtering
        if (filterParam) {
            const match = filterParam.match(/([a-zA-Z0-9_]+)\s*=\s*["']?([^"']+)["']?/);
            if (match) {
                let key = match[1];
                const val = match[2];

                if (!ALLOWED_COLUMNS[table]?.includes(key)) {
                    sendInvalidInputError(res, `Invalid filter column '${key}'.`);
                    return;
                }

                const whereClause = ` WHERE ${key} = ?`;
                sql += whereClause;
                countSql += whereClause;
                params.push(val);
                countParams.push(val);
            }
        }

        // 2. Sorting
        if (sortParam) {
            const desc = sortParam.startsWith('-');
            const key = sortParam.replace(/^[+-]/, '');

            if (ALLOWED_COLUMNS[table]?.includes(key)) {
                sql += ` ORDER BY ${key} ${desc ? 'DESC' : 'ASC'}`;
            } else {
                sendInvalidInputError(res, `Invalid sort column '${key}'.`);
                return;
            }
        }

        // 3. Pagination
        let totalItems: number | null = null;
        if (perPage !== null) {
            const countResult = this.db.query(countSql, countParams) as any[];
            totalItems = (countResult[0] as { total: number })?.total || 0;
            const offset = (page - 1) * perPage;
            sql += ` LIMIT ? OFFSET ?`;
            params.push(perPage, offset);
        }

        const fetchStartTime = Date.now();
        const rows = this.db.query(sql, params);
        const fetchDuration = Date.now() - fetchStartTime;

        // Parse JSON columns
        const jsonCols = JSON_COLUMNS[table] || [];
        const parsedRows = rows.map(row => {
            const parsedRow = { ...row };
            jsonCols.forEach(c => {
                if (parsedRow[c] && typeof parsedRow[c] === 'string') {
                    try {
                        parsedRow[c] = JSON.parse(parsedRow[c]);
                    } catch (e) {
                        this.logger.warn(`Failed to parse JSON column ${c}`, { id: row.id });
                    }
                }
            });
            return parsedRow;
        });

        this.logger.info('Records listed', { table, count: parsedRows.length, duration: `${fetchDuration}ms` });

        res.writeHead(200, { 'Content-Type': 'application/json' });
        if (perPage !== null && totalItems !== null) {
            res.end(JSON.stringify({
                items: parsedRows,
                page,
                perPage,
                totalItems,
                totalPages: Math.ceil(totalItems / perPage)
            }));
        } else {
            res.end(JSON.stringify({ items: parsedRows }));
        }
    }

    /**
     * Process record creation/update (POST/PATCH)
     */
    async processRecordCreation(req: http.IncomingMessage, res: http.ServerResponse, table: string, data: any, pathName: string): Promise<void> {
        try {
            const dataObj = data as Record<string, any>;
            const isUpdate = req.method === 'PATCH' || (dataObj.id && this.db.get(`SELECT 1 FROM ${table} WHERE id = ? LIMIT 1`, [dataObj.id]));
            const validation = validateRequest(dataObj, table, !!isUpdate);

            if (!validation.success) {
                this.logger.error('Validation failed', { table, error: validation.error });
                sendValidationError(res, `Validation failed for ${table}: ${validation.error}`, validation.details);
                return;
            }

            const validData = validation.data;
            if (!validData.id && table !== 'users') {
                validData.id = crypto.randomUUID();
            }

            // Hashing passwords for users
            if (table === 'users' && validData.password) {
                validData.password = await hashPassword(validData.password);
            }

            // JSON Serialization
            const jsonCols = JSON_COLUMNS[table] || [];
            const rowData = { ...validData };
            jsonCols.forEach(c => {
                if (rowData[c] !== undefined && rowData[c] !== null) {
                    if (typeof rowData[c] !== 'string') {
                        rowData[c] = JSON.stringify(rowData[c]);
                    }
                }
            });

            // Save to database
            const keys = Object.keys(rowData);
            if (isUpdate) {
                const id = rowData.id;
                delete rowData.id;
                const updateKeys = Object.keys(rowData);
                const setClause = updateKeys.map(k => `${k} = ?`).join(', ');
                this.db.run(`UPDATE ${table} SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [...Object.values(rowData), id]);
                rowData.id = id;
            } else {
                const placeholders = keys.map(() => '?').join(', ');
                this.db.run(`INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`, Object.values(rowData));
            }

            this.logger.info(`Record ${isUpdate ? 'updated' : 'created'}`, { table, id: rowData.id });
            res.writeHead(isUpdate ? 200 : 201, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(validData));
        } catch (e: any) {
            this.logger.error('Record save failed', { table, error: e.message });
            sendDatabaseError(res, e, `saving ${table} record`);
        }
    }

    /**
     * Delete a record
     */
    async deleteRecord(res: http.ServerResponse, collection: string, id: string): Promise<void> {
        const table = TABLE_MAP[collection] || collection;
        try {
            this.db.run(`DELETE FROM ${table} WHERE id = ?`, [id]);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true }));
        } catch (e: any) {
            this.logger.error('Delete failed', { table, id, error: e.message });
            sendDatabaseError(res, e, `deleting record from ${table}`);
        }
    }
}

export default RecordService;
