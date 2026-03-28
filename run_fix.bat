@echo off
echo Running Migration...
node apps/master/backend/scripts/run_migration.js
if %errorlevel% neq 0 exit /b %errorlevel%

echo Running Seeding...
node apps/master/backend/scripts/seed_debug_data.js
if %errorlevel% neq 0 exit /b %errorlevel%

echo Done.
