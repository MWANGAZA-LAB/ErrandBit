# ErrandBit - Configure Authentication Credentials
# This script will set up your Twilio and JWT credentials

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "ErrandBit Credential Configuration" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Load environment variables from .env file
$envFile = Join-Path $PSScriptRoot "backend\.env"
if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        $name, $value = $_.Split('=', 2)
        if ($name -and $value) {
            [System.Environment]::SetEnvironmentVariable($name.Trim(), $value.Trim())
        }
    }
}

# Get credentials from environment variables
$TWILIO_ACCOUNT_SID = $env:TWILIO_ACCOUNT_SID
$TWILIO_AUTH_TOKEN = $env:TWILIO_AUTH_TOKEN
$TWILIO_PHONE_NUMBER = $env:TWILIO_PHONE_NUMBER

# Generate a secure JWT secret (256-bit)
Write-Host "Generating secure JWT secret..." -ForegroundColor Yellow
$bytes = New-Object byte[] 32
[Security.Cryptography.RNGCryptoServiceProvider]::Create().GetBytes($bytes)
$JWT_SECRET = [System.Convert]::ToBase64String($bytes)
Write-Host "✓ JWT secret generated" -ForegroundColor Green

# Create backend .env file if it doesn't exist
if (!(Test-Path "backend\.env")) {
    Write-Host "Creating backend/.env file..." -ForegroundColor Yellow
    Copy-Item "backend\.env.example" "backend\.env"
    Write-Host "✓ Created backend/.env" -ForegroundColor Green
}

# Read current .env content
$envContent = Get-Content "backend\.env" -Raw

# Update Twilio credentials
$envContent = $envContent -replace "TWILIO_ACCOUNT_SID=.*", "TWILIO_ACCOUNT_SID=$TWILIO_ACCOUNT_SID"
$envContent = $envContent -replace "TWILIO_AUTH_TOKEN=.*", "TWILIO_AUTH_TOKEN=$TWILIO_AUTH_TOKEN"
$envContent = $envContent -replace "TWILIO_PHONE_NUMBER=.*", "TWILIO_PHONE_NUMBER=$TWILIO_PHONE_NUMBER"

# Update JWT secret
$envContent = $envContent -replace "JWT_SECRET=.*", "JWT_SECRET=$JWT_SECRET"

# Update CORS origins for current ports
$envContent = $envContent -replace "ALLOWED_ORIGINS=.*", "ALLOWED_ORIGINS=http://localhost:5173,http://localhost:5174,http://localhost:5175"

# Save updated .env
$envContent | Set-Content "backend\.env" -NoNewline

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Configuration Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Configured credentials:" -ForegroundColor Yellow
Write-Host "✓ Twilio Account SID: [Loaded from environment]" -ForegroundColor Green
Write-Host "✓ Twilio Auth Token: [Loaded from environment]" -ForegroundColor Green
Write-Host "✓ Twilio Phone Number: $TWILIO_PHONE_NUMBER" -ForegroundColor Yellow
Write-Host "✓ JWT Secret: [Generated securely]" -ForegroundColor Green
Write-Host "✓ CORS Origins: Updated for local development" -ForegroundColor Green
Write-Host ""
Write-Host "⚠️  IMPORTANT: Update TWILIO_PHONE_NUMBER" -ForegroundColor Red
Write-Host "   Edit backend/.env and set your actual Twilio phone number" -ForegroundColor Yellow
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Get your Twilio phone number from: https://console.twilio.com/" -ForegroundColor White
Write-Host "2. Update TWILIO_PHONE_NUMBER in backend/.env" -ForegroundColor White
Write-Host "3. Ensure PostgreSQL is running" -ForegroundColor White
Write-Host "4. Run database migration: cd backend; npm run migrate" -ForegroundColor White
Write-Host "5. Start backend server: cd backend; npm run dev" -ForegroundColor White
Write-Host "6. Start frontend server: cd frontend; npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "Test authentication at: http://localhost:5175" -ForegroundColor Cyan
Write-Host ""
