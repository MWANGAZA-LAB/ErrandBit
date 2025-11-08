# Cleanup redundant markdown documentation files
# Keep only essential documentation

Write-Host "Cleaning up redundant markdown files..." -ForegroundColor Cyan

# Files to KEEP (essential documentation)
$keepFiles = @(
    "README.md",
    "CHANGELOG.md",
    "DATABASE_SETUP_GUIDE.md",
    "CODE_ANALYSIS_FIXES_COMPLETE.md",
    "PHASE3_REPOSITORIES_COMPLETE.md",
    "DEVELOPMENT_GUIDE.md",
    "TESTING_GUIDE.md"
)

# Files to REMOVE (redundant/outdated)
$removeFiles = @(
    "FINAL_PROJECT_STATUS.md",
    "EXECUTIVE_SUMMARY.md",
    "GEOLOCATION_INTEGRATION_COMPLETE.md",
    "PHASE3_INITIAL_SETUP_COMPLETE.md",
    "PHASE3_COMPLETE.md",
    "PHASE2_PROGRESS.md",
    "PHASE2_COMPLETION_REPORT.md",
    "PHASE2_COMPLETE.md",
    "PHASE1_PROGRESS.md",
    "PHASE1_FINAL_REPORT.md",
    "PHASE1_COMPLETION_REPORT.md",
    "PHASE1_COMPLETE_SUMMARY.md",
    "AUTH_COMPLETELY_BYPASSED.md",
    "DEPLOYMENT_READY.md",
    "PROJECT_STATUS.md",
    "SECURITY_IMPLEMENTATION.md",
    "REFACTORING_SUMMARY.md",
    "REFACTORING_PROGRESS.md",
    "TWILIO_REMOVED.md",
    "IMPLEMENTATION_COMPLETE_NOV4.md",
    "GEOLOCATION_FEATURE.md",
    "PHASE_0_MILESTONE.md",
    "PHASE3_SESSION_SUMMARY.md",
    "PHASE3_PROGRESS.md",
    "PRE_DEPLOYMENT_CHECKLIST.md",
    "PHASE_0_ROADMAP.md",
    "PROJECT_DIAGNOSTIC_REPORT.md",
    "INSTALLATION.md",
    "NEXT_STEPS.md",
    "OPEN_FREE_PLATFORM.md",
    "REFACTORING_EXAMPLES.md",
    "READY_TO_TEST.md",
    "QUICK_START.md",
    "REFACTORING_PLAN.md",
    "TESTING_CHECKLIST.md"
)

$removed = 0
$notFound = 0

foreach ($file in $removeFiles) {
    $filePath = Join-Path $PSScriptRoot $file
    if (Test-Path $filePath) {
        Remove-Item $filePath -Force
        Write-Host "  ✓ Removed: $file" -ForegroundColor Green
        $removed++
    } else {
        Write-Host "  - Not found: $file" -ForegroundColor Yellow
        $notFound++
    }
}

Write-Host ""
Write-Host "Cleanup complete!" -ForegroundColor Cyan
Write-Host "  Removed: $removed files" -ForegroundColor Green
Write-Host "  Not found: $notFound files" -ForegroundColor Yellow
Write-Host ""
Write-Host "Keeping essential documentation:" -ForegroundColor Cyan
foreach ($file in $keepFiles) {
    if (Test-Path (Join-Path $PSScriptRoot $file)) {
        Write-Host "  ✓ $file" -ForegroundColor Green
    }
}
