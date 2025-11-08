# ErrandBit Project Cleanup Script
# Removes redundant documentation files

Write-Host "🧹 ErrandBit Project Cleanup" -ForegroundColor Cyan
Write-Host "=============================" -ForegroundColor Cyan
Write-Host ""

$redundantFiles = @(
    "DAY_1_COMPLETE.md",
    "DAY_2_PROGRESS.md",
    "DAY_3_COMPLETE.md",
    "DAY_5_PROGRESS.md",
    "DAY_5_COMPLETE.md",
    "DAY_6_COMPLETE.md",
    "BACKEND_COMPLETE.md",
    "FRONTEND_PROGRESS.md",
    "TYPESCRIPT_MIGRATION.md",
    "TYPESCRIPT_STATUS.md",
    "TYPESCRIPT_COMPLETE.md",
    "CRITICAL_FIXES_SUMMARY.md",
    "DEV_RUNNING.md",
    "LOCAL_RUNNING.md",
    "STATUS_NOV4_1PM.md",
    "NEXT_STEPS_NOV4.md",
    "PROGRESS_SUMMARY.md",
    "PROJECT_STATUS.md",
    "IMPLEMENTATION_STARTED.md",
    "IMPLEMENTATION_SUMMARY.md",
    "IMPLEMENTATION_COMPLETE_NOV4.md",
    "TEST_RESULTS.md",
    "URL_GUIDE.md",
    "CREDENTIALS_CONFIGURED.md",
    "AUTH_SETUP_COMPLETE.md",
    "TESTING_WITHOUT_TWILIO.md",
    "DEV_BYPASS_GUIDE.md",
    "FEDI_INTEGRATION.md",
    "FEDI_IMPLEMENTATION_GUIDE.md"
)

$deleted = 0
$notFound = 0

foreach ($file in $redundantFiles) {
    $filePath = Join-Path $PSScriptRoot $file
    
    if (Test-Path $filePath) {
        Remove-Item $filePath -Force
        Write-Host "✓ Deleted: $file" -ForegroundColor Green
        $deleted++
    } else {
        Write-Host "⚠ Not found: $file" -ForegroundColor Yellow
        $notFound++
    }
}

Write-Host ""
Write-Host "=============================" -ForegroundColor Cyan
Write-Host "Cleanup Summary:" -ForegroundColor Cyan
Write-Host "  Deleted: $deleted files" -ForegroundColor Green
Write-Host "  Not Found: $notFound files" -ForegroundColor Yellow
Write-Host ""
Write-Host "✅ Cleanup complete!" -ForegroundColor Green
