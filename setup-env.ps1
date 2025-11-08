# ErrandBit Environment Setup Script
# Run this to configure your .env file with a secure JWT secret

Write-Host "🔧 Setting up ErrandBit environment..." -ForegroundColor Cyan

# Generate secure JWT secret
$jwtSecret = [Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))

# Read the .env.example file
$envExample = Get-Content "backend\.env.example" -Raw

# Replace the placeholder JWT_SECRET with the generated one
$envContent = $envExample -replace 'your-super-secret-jwt-key-change-this-in-production', $jwtSecret

# Write to .env file
$envContent | Set-Content "backend\.env"

Write-Host "✅ Environment file created at backend\.env" -ForegroundColor Green
Write-Host "✅ JWT_SECRET has been set to a secure random value" -ForegroundColor Green
Write-Host ""
Write-Host "⚠️  IMPORTANT: Update the following in backend\.env:" -ForegroundColor Yellow
Write-Host "   - DATABASE_URL (if different from default)" -ForegroundColor Yellow
Write-Host "   - TWILIO credentials (if using SMS verification)" -ForegroundColor Yellow
Write-Host ""
Write-Host "📝 Your JWT_SECRET: $jwtSecret" -ForegroundColor Cyan
Write-Host "   (This has been saved to backend\.env)" -ForegroundColor Gray
