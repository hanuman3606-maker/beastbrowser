@echo off
echo ========================================
echo   BEAST BROWSER - QUICK FIX
echo ========================================
echo.
echo This will:
echo 1. Kill all Chrome processes
echo 2. Delete profile cache
echo 3. Start fresh
echo.
pause

echo.
echo [1/3] Killing Chrome processes...
taskkill /F /IM chrome.exe /T >nul 2>&1
if %errorlevel% == 0 (
    echo     Done! Chrome processes killed.
) else (
    echo     No Chrome processes found (already stopped)
)

echo.
echo [2/3] Deleting profile cache...
set PROFILE_DIR=%USERPROFILE%\BeastBrowser\ChromeProfiles
if exist "%PROFILE_DIR%" (
    rmdir /s /q "%PROFILE_DIR%"
    echo     Done! Profile cache deleted.
    echo     Location: %PROFILE_DIR%
) else (
    echo     Profile cache not found (already deleted)
)

echo.
echo [3/3] Ready to test!
echo.
echo ========================================
echo   NEXT STEPS:
echo ========================================
echo.
echo 1. Run: npm run electron-dev
echo 2. Create NEW profile
echo 3. Launch profile
echo 4. Type "hello" in address bar
echo 5. Press Enter
echo 6. Should Google search (not http://hello/)
echo.
echo ========================================
pause
