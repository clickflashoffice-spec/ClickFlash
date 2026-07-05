@echo off
echo =======================================================
echo      ClickFlash Venue Simulator (Testing Environment)
echo =======================================================
echo Booting Master Backend (Port 8090)...
start cmd /k "cd ..\apps\master && npm run dev:backend"

echo Booting Touch Kiosk (Port 8091)...
start cmd /k "cd ..\apps\touch && npm run dev:full"

echo Booting Guest Gallery (Port 5173)...
start cmd /k "cd ..\apps\gallery && npm run dev"

echo Waiting 10 seconds for servers to start...
timeout /t 10

echo Starting Mock Guest Traffic Generator...
node mock_guest_traffic.js

echo Simulator running! Press any key to exit all nodes.
pause
