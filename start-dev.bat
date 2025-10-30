@echo off
echo Starting ErrandBit Development Servers...
echo.
echo Backend will run on: http://localhost:4000
echo Frontend will run on: http://localhost:5173
echo.
echo Opening two terminal windows...
echo.

start "ErrandBit Backend" cmd /k "cd backend && npm run dev"
timeout /t 2 /nobreak > nul
start "ErrandBit Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo Both servers are starting in separate windows.
echo Close this window or press any key to exit.
pause > nul
