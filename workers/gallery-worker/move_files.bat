@echo off
if not exist src mkdir src
move db.js src\
move auth.js src\
move server.js src\
move logger.js src\
move auditLogger.js src\
move errorHandler.js src\
move rateLimiter.js src\
move validation.js src\
move routes src\
move services src\
move shared src\
move workers src\
move migrations src\
move __tests__ src\
echo SUCCESS
