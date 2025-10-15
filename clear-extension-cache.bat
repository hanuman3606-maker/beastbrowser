@echo off
echo ========================================
echo  Beast Browser Extension Cache Cleaner
echo ========================================
echo.

set PROFILE_DIR=%USERPROFILE%\BeastBrowser\ChromeProfiles

if not exist "%PROFILE_DIR%" (
    echo Profile directory not found: %PROFILE_DIR%
    echo.
    echo No cache to clear!
    pause
    exit /b
)

echo Looking for extension caches in: %PROFILE_DIR%
echo.

set COUNT=0

for /d %%D in ("%PROFILE_DIR%\*") do (
    if exist "%%D\BeastVersionSpoofExtension" (
        echo Found: %%D\BeastVersionSpoofExtension
        rmdir /s /q "%%D\BeastVersionSpoofExtension"
        if not exist "%%D\BeastVersionSpoofExtension" (
            echo  [DELETED] Version Spoof Extension cache cleared!
            set /a COUNT+=1
        ) else (
            echo  [FAILED] Could not delete. Close browser first!
        )
        echo.
    )
    
    if exist "%%D\BeastTimezoneExtension" (
        echo Found: %%D\BeastTimezoneExtension
        rmdir /s /q "%%D\BeastTimezoneExtension"
        if not exist "%%D\BeastTimezoneExtension" (
            echo  [DELETED] Timezone Extension cache cleared!
            set /a COUNT+=1
        )
        echo.
    )
)

echo.
if %COUNT% EQU 0 (
    echo No extension caches found to clear.
) else (
    echo Total caches cleared: %COUNT%
    echo.
    echo SUCCESS! Extension caches have been cleared.
    echo Now restart the app to load fresh extensions.
)

echo.
echo ========================================
pause
