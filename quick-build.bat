@echo off
cls
echo ========================================
echo    🔨 BeastBrowser Quick Build
echo ========================================
echo.

echo 🔨 Building React app...
call npm run build
if errorlevel 1 (
    echo ❌ Build failed!
    pause
    exit /b 1
)

echo.
echo 📦 Creating Windows installer...
call npm run build:win
if errorlevel 1 (
    echo ❌ Installer creation failed!
    pause
    exit /b 1
)

echo.
echo ========================================
echo    ✅ BUILD COMPLETE!
echo ========================================
echo.
echo 📦 Output: build-output\BeastBrowser-Setup-*.exe
echo.

REM Open build folder
start build-output

echo 🎉 Build successful!
pause
