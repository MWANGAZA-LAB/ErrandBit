# ErrandBit Authentication Setup Script
# Senior Lead Engineer Implementation
# Run this script to configure authentication

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "ErrandBit Authentication Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if backend .env exists
if (!(Test-Path "backend\.env")) {
    Write-Host "Creating backend .env file..." -ForegroundColor Yellow
    Copy-Item "backend\.env.example" "backend\.env"
    Write-Host "✓ Created backend/.env" -ForegroundColor Green
} else {
    Write-Host "✓ backend/.env already exists" -ForegroundColor Green
}

# Check if frontend .env.local exists
if (!(Test-Path "frontend\.env.local")) {
    Write-Host "Creating frontend .env.local file..." -ForegroundColor Yellow
    "VITE_API_URL=http://localhost:4000" | Out-File -FilePath "frontend\.env.local" -Encoding UTF8
    Write-Host "✓ Created frontend/.env.local" -ForegroundColor Green
} else {
    Write-Host "✓ frontend/.env.local already exists" -ForegroundColor Green
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Twilio Configuration Required" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "To enable SMS OTP authentication, you need:" -ForegroundColor Yellow
Write-Host "1. Twilio Account SID" -ForegroundColor White
Write-Host "2. Twilio Auth Token" -ForegroundColor White
Write-Host "3. Twilio Phone Number" -ForegroundColor White
Write-Host ""
Write-Host "Sign up at: https://www.twilio.com/try-twilio" -ForegroundColor Cyan
Write-Host "Free trial includes $15 credit" -ForegroundColor Green
Write-Host ""

$configureTwilio = Read-Host "Do you want to configure Twilio now? (y/n)"

if ($configureTwilio -eq "y" -or $configureTwilio -eq "Y") {
    Write-Host ""
    Write-Host "Enter your Twilio credentials:" -ForegroundColor Yellow
    Write-Host ""
    
    $accountSid = Read-Host "Twilio Account SID (starts with AC)"
    $authToken = Read-Host "Twilio Auth Token"
    $phoneNumber = Read-Host "Twilio Phone Number (format: +1234567890)"
    
    # Update backend .env
    $envContent = Get-Content "backend\.env"
    $envContent = $envContent -replace "TWILIO_ACCOUNT_SID=.*", "TWILIO_ACCOUNT_SID=$accountSid"
    $envContent = $envContent -replace "TWILIO_AUTH_TOKEN=.*", "TWILIO_AUTH_TOKEN=$authToken"
    $envContent = $envContent -replace "TWILIO_PHONE_NUMBER=.*", "TWILIO_PHONE_NUMBER=$phoneNumber"
    $envContent | Set-Content "backend\.env"
    
    Write-Host ""
    Write-Host "✓ Twilio credentials configured!" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "⚠ Skipping Twilio configuration" -ForegroundColor Yellow
    Write-Host "You can configure it later by editing backend/.env" -ForegroundColor White
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "JWT Secret Configuration" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$configureJWT = Read-Host "Generate a secure JWT secret? (y/n)"

if ($configureJWT -eq "y" -or $configureJWT -eq "Y") {
    # Generate random JWT secret
    $bytes = New-Object byte[] 32
    [Security.Cryptography.RNGCryptoServiceProvider]::Create().GetBytes($bytes)
    $jwtSecret = [System.Convert]::ToBase64String($bytes)
    
    # Update backend .env
    $envContent = Get-Content "backend\.env"
    $envContent = $envContent -replace "JWT_SECRET=.*", "JWT_SECRET=$jwtSecret"
    $envContent | Set-Content "backend\.env"
    
    Write-Host "✓ JWT secret generated and configured!" -ForegroundColor Green
} else {
    Write-Host "⚠ Using default JWT secret (NOT SECURE FOR PRODUCTION)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Database Configuration" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$configureDB = Read-Host "Configure database connection? (y/n)"

if ($configureDB -eq "y" -or $configureDB -eq "Y") {
    Write-Host ""
    $dbUser = Read-Host "PostgreSQL username (default: postgres)"
    if ([string]::IsNullOrWhiteSpace($dbUser)) { $dbUser = "postgres" }
    
    $dbPassword = Read-Host "PostgreSQL password"
    $dbHost = Read-Host "PostgreSQL host (default: localhost)"
    if ([string]::IsNullOrWhiteSpace($dbHost)) { $dbHost = "localhost" }
    
    $dbPort = Read-Host "PostgreSQL port (default: 5432)"
    if ([string]::IsNullOrWhiteSpace($dbPort)) { $dbPort = "5432" }
    
    $dbName = Read-Host "Database name (default: errandbit)"
    if ([string]::IsNullOrWhiteSpace($dbName)) { $dbName = "errandbit" }
    
    $databaseUrl = "postgresql://${dbUser}:${dbPassword}@${dbHost}:${dbPort}/${dbName}"
    
    # Update backend .env
    $envContent = Get-Content "backend\.env"
    $envContent = $envContent -replace "DATABASE_URL=.*", "DATABASE_URL=$databaseUrl"
    $envContent | Set-Content "backend\.env"
    
    Write-Host ""
    Write-Host "✓ Database connection configured!" -ForegroundColor Green
} else {
    Write-Host "⚠ Using default database configuration" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Setup Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Ensure PostgreSQL is running" -ForegroundColor White
Write-Host "2. Run database migration:" -ForegroundColor White
Write-Host "   cd backend" -ForegroundColor Cyan
Write-Host "   npm run migrate" -ForegroundColor Cyan
Write-Host ""
Write-Host "3. Start backend server:" -ForegroundColor White
Write-Host "   cd backend" -ForegroundColor Cyan
Write-Host "   npm run dev" -ForegroundColor Cyan
Write-Host ""
Write-Host "4. Start frontend server:" -ForegroundColor White
Write-Host "   cd frontend" -ForegroundColor Cyan
Write-Host "   npm run dev" -ForegroundColor Cyan
Write-Host ""
Write-Host "5. Open browser:" -ForegroundColor White
Write-Host "   http://localhost:5175" -ForegroundColor Cyan
Write-Host ""
Write-Host "For detailed documentation, see:" -ForegroundColor Yellow
Write-Host "- AUTH_SETUP_COMPLETE.md" -ForegroundColor Cyan
Write-Host "- INSTALLATION.md" -ForegroundColor Cyan
Write-Host "- TESTING_CHECKLIST.md" -ForegroundColor Cyan
Write-Host ""
Write-Host "Happy coding! 🚀" -ForegroundColor Green
