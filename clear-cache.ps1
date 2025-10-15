# Beast Browser Extension Cache Cleaner (PowerShell)
Write-Host "========================================"
Write-Host " Beast Browser Extension Cache Cleaner"
Write-Host "========================================"
Write-Host ""

$profileDir = Join-Path $env:USERPROFILE "BeastBrowser\ChromeProfiles"

if (-not (Test-Path $profileDir)) {
    Write-Host "Profile directory not found: $profileDir"
    Write-Host ""
    Write-Host "No cache to clear!"
    Read-Host "Press Enter to exit"
    exit
}

Write-Host "Looking for extension caches in: $profileDir"
Write-Host ""

$count = 0
$profiles = Get-ChildItem -Path $profileDir -Directory

foreach ($profile in $profiles) {
    $versionSpoofExt = Join-Path $profile.FullName "BeastVersionSpoofExtension"
    $timezoneExt = Join-Path $profile.FullName "BeastTimezoneExtension"
    
    if (Test-Path $versionSpoofExt) {
        Write-Host "Found: $versionSpoofExt"
        try {
            Remove-Item -Path $versionSpoofExt -Recurse -Force
            Write-Host "  [DELETED] Version Spoof Extension cache cleared!" -ForegroundColor Green
            $count++
        } catch {
            Write-Host "  [FAILED] Could not delete. Close browser first!" -ForegroundColor Red
        }
        Write-Host ""
    }
    
    if (Test-Path $timezoneExt) {
        Write-Host "Found: $timezoneExt"
        try {
            Remove-Item -Path $timezoneExt -Recurse -Force
            Write-Host "  [DELETED] Timezone Extension cache cleared!" -ForegroundColor Green
            $count++
        } catch {
            Write-Host "  [FAILED] Could not delete. Close browser first!" -ForegroundColor Red
        }
        Write-Host ""
    }
}

Write-Host ""
if ($count -eq 0) {
    Write-Host "No extension caches found to clear."
} else {
    Write-Host "Total caches cleared: $count"
    Write-Host ""
    Write-Host "SUCCESS! Extension caches have been cleared." -ForegroundColor Green
    Write-Host "Now restart the app to load fresh extensions."
}

Write-Host ""
Write-Host "========================================"
Read-Host "Press Enter to exit"
