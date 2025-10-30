@echo off
REM ErrandBit Database Setup - Simple Batch Version

echo ================================
echo ErrandBit Database Setup
echo ================================
echo.

REM Check if PostgreSQL is installed
where psql >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] PostgreSQL not found in PATH
    echo.
    echo Please install PostgreSQL:
    echo 1. Download from: https://www.postgresql.org/download/windows/
    echo 2. Run installer ^(PostgreSQL 14 or higher^)
    echo 3. Install PostGIS extension via Stack Builder
    echo 4. Add PostgreSQL bin to PATH
    echo.
    echo See DATABASE_SETUP_GUIDE.md for detailed instructions
    pause
    exit /b 1
)

echo [OK] PostgreSQL found
echo.

REM Run PowerShell setup script
echo Running setup script...
echo.

powershell -ExecutionPolicy Bypass -File setup-database.ps1

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ================================
    echo Setup completed successfully!
    echo ================================
) else (
    echo.
    echo ================================
    echo Setup encountered errors
    echo ================================
    echo See DATABASE_SETUP_GUIDE.md for troubleshooting
)

echo.
pause
