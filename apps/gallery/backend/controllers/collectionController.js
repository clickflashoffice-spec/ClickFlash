const crypto = require('crypto');
const { 
    TABLE_MAP, 
    JSON_COLUMNS, 
    COLUMN_MAP, 
    ALLOWED_COLUMNS 
} = require('../config');
const { 
    validateRequest 
} = require('../validation');
const { 
    hashPassword 
} = require('../auth');
const { 
    sendValidationError, 
    sendInvalidInputError, 
    sendDatabaseError, 
    sendError, 
    ERROR_CODES 
} = require('../errorHandler');

/**
 * Controller for Collection CRUD operations
 */
const collectionController = {
    /**
     * Common logic for record creation/update
     */
    async processRecordCreation(req, res, table, data, pathName) {
        const dbManager = req.app.get('dbManager');
        const logger = req.app.get('logger');
        const auditLogger = req.app.get('auditLogger');
        const saveStartTime = Date.now();

        try {
            const isUpdate = req.method === 'PATCH' || (data.id && dbManager.get(`SELECT 1 FROM ${table} WHERE id = ? LIMIT 1`, [data.id]));
            const validation = validateRequest(data, table, isUpdate);
            
            if (!validation.success) {
                if (logger) logger.error('Validation failed', { table, error: validation.error });
                return sendValidationError(res, `Validation failed for ${table}: ${validation.error}`, validation.details);
            }

            const validData = validation.data;
            if (!validData.id && table !== 'users') validData.id = crypto.randomUUID();

            // Hash password if user
            if (table === 'users' && validData.password) {
                validData.password = await hashPassword(validData.password);
            }

            // Handle JSON serialization
            const jsonCols = JSON_COLUMNS[table] || [];
            const rowData = { ...validData };

            Object.keys(rowData).forEach(key => {
                const value = rowData[key];
                if (value !== null && value !== undefined) {
                    if (typeof value === 'object' && !Buffer.isBuffer(value)) {
                        rowData[key] = JSON.stringify(value);
                    }
                }
            });

            const savedRecord = dbManager.transaction(() => {
                const existing = dbManager.get(`SELECT * FROM ${table} WHERE id = ?`, [validData.id]);
                if (existing) {
                    const keys = Object.keys(rowData).filter(k => k !== 'id' && rowData[k] !== undefined);
                    if (keys.length > 0) {
                        const setClause = keys.map(k => `${k} = @${k}`).join(', ');
                        dbManager.run(`UPDATE ${table} SET ${setClause} WHERE id = @id`, rowData);
                    }
                } else {
                    const keys = Object.keys(rowData);
                    const cols = keys.join(', ');
                    const vals = keys.map(k => `@${k}`).join(', ');
                    dbManager.run(`INSERT INTO ${table} (${cols}) VALUES (${vals})`, rowData);
                }
                return dbManager.get(`SELECT * FROM ${table} WHERE id = ?`, [validData.id]);
            });

            // Prepare response data (deserialize JSON)
            const responseData = { ...savedRecord };
            jsonCols.forEach(c => {
                if (responseData[c] && typeof responseData[c] === 'string') {
                    try { responseData[c] = JSON.parse(responseData[c]); } catch(e) {}
                }
            });
            if (responseData.password) delete responseData.password;

            if (logger) logger.info('Save operation completed', { table, recordId: validData.id, duration: `${Date.now() - saveStartTime}ms` });
            res.json(responseData);
        } catch (e) {
            if (logger) logger.error(`CRUD Error for ${pathName}`, { error: e.message });
            if (e.message.includes('UNIQUE constraint')) {
                sendError(res, 409, 'Conflict', 'Record already exists.', ERROR_CODES.CONFLICT);
            } else {
                sendDatabaseError(res, e, `${req.method} operation on ${table}`);
            }
        }
    }
};

module.exports = collectionController;
