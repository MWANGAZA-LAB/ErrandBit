# ErrandBit Database Setup Script for Windows
# This script helps set up PostgreSQL database for ErrandBit

Write-Host "================================" -ForegroundColor Cyan
Write-Host "ErrandBit Database Setup" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Check if PostgreSQL is installed
Write-Host "Checking PostgreSQL installation..." -ForegroundColor Yellow

$psqlPath = Get-Command psql -ErrorAction SilentlyContinue

if (-not $psqlPath) {
    Write-Host "❌ PostgreSQL not found in PATH" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please install PostgreSQL:" -ForegroundColor Yellow
    Write-Host "1. Download from: https://www.postgresql.org/download/windows/" -ForegroundColor White
    Write-Host "2. Run installer (PostgreSQL 14 or higher)" -ForegroundColor White
    Write-Host "3. Install PostGIS extension via Stack Builder" -ForegroundColor White
    Write-Host "4. Add PostgreSQL bin to PATH" -ForegroundColor White
    Write-Host ""
    Write-Host "Or use Docker:" -ForegroundColor Yellow
    Write-Host "docker run --name errandbit-db -e POSTGRES_PASSWORD=yourpassword -p 5432:5432 -d postgis/postgis:14-3.3" -ForegroundColor White
    Write-Host ""
    Write-Host "See DATABASE_SETUP_GUIDE.md for detailed instructions" -ForegroundColor Cyan
    exit 1
}

Write-Host "✓ PostgreSQL found: $($psqlPath.Source)" -ForegroundColor Green
Write-Host ""

# Get database credentials
Write-Host "Database Configuration" -ForegroundColor Cyan
Write-Host "======================" -ForegroundColor Cyan
Write-Host ""

$dbUser = Read-Host "PostgreSQL username (default: postgres)"
if ([string]::IsNullOrWhiteSpace($dbUser)) {
    $dbUser = "postgres"
}

$dbPassword = Read-Host "PostgreSQL password" -AsSecureString
$dbPasswordPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [Runtime.InteropServices.Marshal]::SecureStringToBSTR($dbPassword)
)

$dbHost = Read-Host "Database host (default: localhost)"
if ([string]::IsNullOrWhiteSpace($dbHost)) {
    $dbHost = "localhost"
}

$dbPort = Read-Host "Database port (default: 5432)"
if ([string]::IsNullOrWhiteSpace($dbPort)) {
    $dbPort = "5432"
}

$dbName = Read-Host "Database name (default: errandbit)"
if ([string]::IsNullOrWhiteSpace($dbName)) {
    $dbName = "errandbit"
}

Write-Host ""
Write-Host "Configuration:" -ForegroundColor Cyan
Write-Host "  User: $dbUser" -ForegroundColor White
Write-Host "  Host: $dbHost" -ForegroundColor White
Write-Host "  Port: $dbPort" -ForegroundColor White
Write-Host "  Database: $dbName" -ForegroundColor White
Write-Host ""

# Test connection
Write-Host "Testing PostgreSQL connection..." -ForegroundColor Yellow
$env:PGPASSWORD = $dbPasswordPlain

try {
    $result = & psql -U $dbUser -h $dbHost -p $dbPort -d postgres -c "SELECT version();" 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Connection successful" -ForegroundColor Green
    } else {
        Write-Host "❌ Connection failed" -ForegroundColor Red
        Write-Host $result -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Connection failed: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Check if database exists
Write-Host "Checking if database exists..." -ForegroundColor Yellow
$dbExists = & psql -U $dbUser -h $dbHost -p $dbPort -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='$dbName';" 2>&1

if ($dbExists -eq "1") {
    Write-Host "⚠ Database '$dbName' already exists" -ForegroundColor Yellow
    $overwrite = Read-Host "Do you want to drop and recreate it? (yes/no)"
    
    if ($overwrite -eq "yes") {
        Write-Host "Dropping database..." -ForegroundColor Yellow
        & psql -U $dbUser -h $dbHost -p $dbPort -d postgres -c "DROP DATABASE $dbName;" 2>&1 | Out-Null
        Write-Host "✓ Database dropped" -ForegroundColor Green
    } else {
        Write-Host "Using existing database" -ForegroundColor Yellow
    }
}

# Create database if it doesn't exist
if ($dbExists -ne "1" -or $overwrite -eq "yes") {
    Write-Host "Creating database '$dbName'..." -ForegroundColor Yellow
    & psql -U $dbUser -h $dbHost -p $dbPort -d postgres -c "CREATE DATABASE $dbName;" 2>&1 | Out-Null
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Database created" -ForegroundColor Green
    } else {
        Write-Host "❌ Failed to create database" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""

# Enable PostGIS
Write-Host "Enabling PostGIS extension..." -ForegroundColor Yellow
& psql -U $dbUser -h $dbHost -p $dbPort -d $dbName -c "CREATE EXTENSION IF NOT EXISTS postgis;" 2>&1 | Out-Null

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ PostGIS enabled" -ForegroundColor Green
} else {
    Write-Host "⚠ PostGIS installation may have failed" -ForegroundColor Yellow
    Write-Host "  Install PostGIS via Stack Builder if needed" -ForegroundColor White
}

# Verify PostGIS
$postgisVersion = & psql -U $dbUser -h $dbHost -p $dbPort -d $dbName -tAc "SELECT PostGIS_version();" 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "  PostGIS version: $postgisVersion" -ForegroundColor White
}

Write-Host ""

# Update .env file
Write-Host "Updating backend/.env file..." -ForegroundColor Yellow

$databaseUrl = "postgresql://${dbUser}:${dbPasswordPlain}@${dbHost}:${dbPort}/${dbName}"
$envPath = "backend\.env"

if (Test-Path $envPath) {
    $envContent = Get-Content $envPath -Raw
    if ($envContent -match "DATABASE_URL=") {
        $envContent = $envContent -replace "DATABASE_URL=.*", "DATABASE_URL=$databaseUrl"
    } else {
        $envContent += "`nDATABASE_URL=$databaseUrl"
    }
    Set-Content -Path $envPath -Value $envContent
} else {
    "PORT=4000`nDATABASE_URL=$databaseUrl" | Out-File -FilePath $envPath -Encoding UTF8
}

Write-Host "✓ .env file updated" -ForegroundColor Green
Write-Host ""

# Run migrations
Write-Host "Running database migrations..." -ForegroundColor Yellow
Write-Host ""

Push-Location backend

try {
    $migrationOutput = npm run migrate 2>&1
    Write-Host $migrationOutput
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "✓ Migrations completed successfully" -ForegroundColor Green
    } else {
        Write-Host ""
        Write-Host "❌ Migrations failed" -ForegroundColor Red
        Pop-Location
        exit 1
    }
} catch {
    Write-Host "❌ Error running migrations: $_" -ForegroundColor Red
    Pop-Location
    exit 1
}

Pop-Location

Write-Host ""

# Verify schema
Write-Host "Verifying database schema..." -ForegroundColor Yellow
Write-Host ""

Push-Location backend

try {
    $verifyOutput = npm run verify-db 2>&1
    Write-Host $verifyOutput
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "✓ Schema verification passed" -ForegroundColor Green
    } else {
        Write-Host ""
        Write-Host "⚠ Schema verification had issues" -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠ Error verifying schema: $_" -ForegroundColor Yellow
}

Pop-Location

Write-Host ""
Write-Host "================================" -ForegroundColor Cyan
Write-Host "Database Setup Complete!" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Database URL: postgresql://$dbUser:****@$dbHost:$dbPort/$dbName" -ForegroundColor White
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Start backend: cd backend && npm run dev" -ForegroundColor White
Write-Host "2. Test health: curl http://localhost:4000/health/deep" -ForegroundColor White
Write-Host "3. Start frontend: cd frontend && npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "See DATABASE_SETUP_GUIDE.md for more information" -ForegroundColor Cyan
Write-Host ""

# Clean up
$env:PGPASSWORD = ""
