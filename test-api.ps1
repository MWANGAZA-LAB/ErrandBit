# ErrandBit API Test Script
# Tests all critical endpoints after database setup

Write-Host "🧪 ErrandBit API Test Suite" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

$baseUrl = "http://localhost:4000"
$testEmail = "test-$(Get-Random)@example.com"
$testPassword = "SecurePass123"

# Test 1: Health Check
Write-Host "Test 1: Health Check" -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "$baseUrl/health" -Method GET
    if ($health.ok) {
        Write-Host "✅ PASS: Health check successful" -ForegroundColor Green
    } else {
        Write-Host "❌ FAIL: Health check returned ok=false" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ FAIL: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 2: Deep Health Check (with database)
Write-Host "Test 2: Deep Health Check (Database)" -ForegroundColor Yellow
try {
    $deepHealth = Invoke-RestMethod -Uri "$baseUrl/health/deep" -Method GET
    if ($deepHealth.ok -and $deepHealth.db.connected) {
        Write-Host "✅ PASS: Database connected" -ForegroundColor Green
    } else {
        Write-Host "❌ FAIL: Database not connected" -ForegroundColor Red
        Write-Host "   Please set up database before continuing" -ForegroundColor Yellow
        exit 1
    }
} catch {
    Write-Host "❌ FAIL: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "   Database not configured. See NEXT_STEPS_NOV4.md" -ForegroundColor Yellow
    exit 1
}
Write-Host ""

# Test 3: User Registration
Write-Host "Test 3: User Registration" -ForegroundColor Yellow
try {
    $registerBody = @{
        role = "runner"
        auth_method = "email"
        email = $testEmail
        password = $testPassword
    } | ConvertTo-Json

    $registerResponse = Invoke-RestMethod -Uri "$baseUrl/auth/register" -Method POST -Body $registerBody -ContentType "application/json"
    
    if ($registerResponse.token -and $registerResponse.user) {
        Write-Host "✅ PASS: User registered successfully" -ForegroundColor Green
        Write-Host "   User ID: $($registerResponse.user.id)" -ForegroundColor Gray
        Write-Host "   Email: $($registerResponse.user.email)" -ForegroundColor Gray
        $token = $registerResponse.token
    } else {
        Write-Host "❌ FAIL: Registration response missing token or user" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ FAIL: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 4: User Login
Write-Host "Test 4: User Login" -ForegroundColor Yellow
try {
    $loginBody = @{
        auth_method = "email"
        email = $testEmail
        password = $testPassword
    } | ConvertTo-Json

    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method POST -Body $loginBody -ContentType "application/json"
    
    if ($loginResponse.token) {
        Write-Host "✅ PASS: Login successful" -ForegroundColor Green
        $token = $loginResponse.token
    } else {
        Write-Host "❌ FAIL: Login response missing token" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ FAIL: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 5: Get Current User (Protected Route)
Write-Host "Test 5: Get Current User (Protected Route)" -ForegroundColor Yellow
try {
    $headers = @{
        "Authorization" = "Bearer $token"
    }

    $meResponse = Invoke-RestMethod -Uri "$baseUrl/auth/me" -Method GET -Headers $headers
    
    if ($meResponse.user) {
        Write-Host "✅ PASS: Protected route accessible with token" -ForegroundColor Green
        Write-Host "   User: $($meResponse.user.email)" -ForegroundColor Gray
    } else {
        Write-Host "❌ FAIL: User data not returned" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ FAIL: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 6: Create Runner Profile
Write-Host "Test 6: Create Runner Profile" -ForegroundColor Yellow
try {
    $runnerBody = @{
        display_name = "Test Runner"
        bio = "Test bio for automated testing"
        lightning_address = "test@getalby.com"
        hourly_rate_cents = 2500
        tags = @("delivery", "shopping")
        location = @{
            lat = 30.2672
            lng = -97.7431
        }
    } | ConvertTo-Json

    $headers = @{
        "Authorization" = "Bearer $token"
    }

    $runnerResponse = Invoke-RestMethod -Uri "$baseUrl/runners" -Method POST -Body $runnerBody -ContentType "application/json" -Headers $headers
    
    if ($runnerResponse.runner) {
        Write-Host "✅ PASS: Runner profile created" -ForegroundColor Green
        Write-Host "   Runner ID: $($runnerResponse.runner.id)" -ForegroundColor Gray
        Write-Host "   Name: $($runnerResponse.runner.display_name)" -ForegroundColor Gray
        $runnerId = $runnerResponse.runner.id
    } else {
        Write-Host "❌ FAIL: Runner profile not created" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ FAIL: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 7: Get Runner by ID
Write-Host "Test 7: Get Runner by ID" -ForegroundColor Yellow
try {
    $getRunnerResponse = Invoke-RestMethod -Uri "$baseUrl/runners/$runnerId" -Method GET
    
    if ($getRunnerResponse.id -eq $runnerId) {
        Write-Host "✅ PASS: Runner retrieved successfully" -ForegroundColor Green
        Write-Host "   Rating: $($getRunnerResponse.avg_rating)" -ForegroundColor Gray
    } else {
        Write-Host "❌ FAIL: Runner not found or ID mismatch" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ FAIL: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 8: Search Runners
Write-Host "Test 8: Search Runners (Geospatial)" -ForegroundColor Yellow
try {
    $searchResponse = Invoke-RestMethod -Uri "$baseUrl/runners?lat=30.2672&lng=-97.7431&radius_km=10" -Method GET
    
    if ($searchResponse.results) {
        Write-Host "✅ PASS: Runner search successful" -ForegroundColor Green
        Write-Host "   Found: $($searchResponse.total) runners" -ForegroundColor Gray
    } else {
        Write-Host "❌ FAIL: Search returned no results" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ FAIL: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 9: Input Validation
Write-Host "Test 9: Input Validation (Should Fail)" -ForegroundColor Yellow
try {
    $invalidBody = @{
        role = "runner"
        auth_method = "email"
        email = "not-an-email"
        password = "weak"
    } | ConvertTo-Json

    $validationResponse = Invoke-RestMethod -Uri "$baseUrl/auth/register" -Method POST -Body $invalidBody -ContentType "application/json"
    Write-Host "❌ FAIL: Validation should have rejected invalid data" -ForegroundColor Red
} catch {
    if ($_.Exception.Response.StatusCode -eq 400) {
        Write-Host "✅ PASS: Input validation working correctly" -ForegroundColor Green
    } else {
        Write-Host "❌ FAIL: Unexpected error: $($_.Exception.Message)" -ForegroundColor Red
    }
}
Write-Host ""

# Test 10: Rate Limiting
Write-Host "Test 10: Rate Limiting" -ForegroundColor Yellow
$rateLimitHit = $false
try {
    1..10 | ForEach-Object {
        try {
            $body = @{
                auth_method = "email"
                email = "test@example.com"
                password = "wrong"
            } | ConvertTo-Json
            
            Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method POST -Body $body -ContentType "application/json" -ErrorAction Stop
        } catch {
            if ($_.Exception.Response.StatusCode -eq 429) {
                $rateLimitHit = $true
            }
        }
    }
    
    if ($rateLimitHit) {
        Write-Host "✅ PASS: Rate limiting is working" -ForegroundColor Green
    } else {
        Write-Host "⚠️  WARNING: Rate limit not hit (may need more requests)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ FAIL: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Summary
Write-Host "================================" -ForegroundColor Cyan
Write-Host "🎉 Test Suite Complete!" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Review any failed tests above" -ForegroundColor White
Write-Host "2. Test payment endpoints (requires Lightning setup)" -ForegroundColor White
Write-Host "3. Set up monitoring (Sentry)" -ForegroundColor White
Write-Host "4. Deploy to staging" -ForegroundColor White
Write-Host ""
Write-Host "See NEXT_STEPS_NOV4.md for detailed instructions" -ForegroundColor Gray
