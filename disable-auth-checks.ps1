# Disable Authentication Checks in All Pages
# This script comments out all authentication redirect logic

Write-Host "Disabling authentication checks..." -ForegroundColor Yellow

$files = @(
    "frontend\src\pages\BrowseJobs.tsx",
    "frontend\src\pages\CreateRunnerProfile.tsx",
    "frontend\src\pages\FindRunnersPage.tsx",
    "frontend\src\pages\JobDetailPage.tsx",
    "frontend\src\pages\MyJobsPage.tsx",
    "frontend\src\pages\PaymentPage.tsx",
    "frontend\src\pages\ProfilePage.tsx"
)

foreach ($file in $files) {
    $fullPath = Join-Path $PSScriptRoot $file
    
    if (Test-Path $fullPath) {
        Write-Host "Processing: $file" -ForegroundColor Cyan
        
        $content = Get-Content $fullPath -Raw
        
        # Comment out the authentication check block
        $content = $content -replace `
            '(\s+)if \(!isAuthenticated\) \{\s+navigate\(''/login''\);\s+return;\s+\}', `
            '$1/* AUTHENTICATION BYPASSED - Commented out for testing' + "`n" + `
            '$1if (!isAuthenticated) {' + "`n" + `
            '$1  navigate(''/login'');' + "`n" + `
            '$1  return;' + "`n" + `
            '$1}' + "`n" + `
            '$1*/'
        
        $content | Set-Content $fullPath -NoNewline
        Write-Host "  ✓ Authentication check commented out" -ForegroundColor Green
    } else {
        Write-Host "  ✗ File not found: $file" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Done! All authentication checks have been commented out." -ForegroundColor Green
Write-Host "The app will now work without requiring login." -ForegroundColor Green
