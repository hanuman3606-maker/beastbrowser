@echo off
cls
echo ========================================
echo    🚀 BeastBrowser Release Script
echo ========================================
echo.

REM Get current version
for /f "delims=" %%i in ('node -p "require('./package.json').version"') do set CURRENT_VERSION=%%i
echo Current version: %CURRENT_VERSION%
echo.

REM Ask for new version
set /p NEW_VERSION="Enter new version (e.g., 2.0.4): "

if "%NEW_VERSION%"=="" (
    echo ❌ No version specified!
    pause
    exit /b 1
)

echo.
echo ========================================
echo    📝 Step 1: Updating Version
echo ========================================
call npm version %NEW_VERSION% --no-git-tag-version
if errorlevel 1 (
    echo ❌ Failed to update version!
    pause
    exit /b 1
)
echo ✅ Version updated to %NEW_VERSION%

echo.
echo ========================================
echo    🔨 Step 2: Building Application
echo ========================================
call npm run build
if errorlevel 1 (
    echo ❌ Build failed!
    pause
    exit /b 1
)
echo ✅ Build complete

echo.
echo ========================================
echo    📦 Step 3: Creating Installer
echo ========================================
call npm run build:win
if errorlevel 1 (
    echo ❌ Installer creation failed!
    pause
    exit /b 1
)
echo ✅ Installer created

echo.
echo ========================================
echo    📤 Step 4: Git Commit and Tag
echo ========================================
git add package.json package-lock.json
git commit -m "Release v%NEW_VERSION%"
if errorlevel 1 (
    echo ⚠️ Nothing to commit or commit failed
)

git tag v%NEW_VERSION%
if errorlevel 1 (
    echo ❌ Failed to create tag!
    pause
    exit /b 1
)
echo ✅ Git tag created: v%NEW_VERSION%

echo.
echo ========================================
echo    🌐 Step 5: Push to GitHub
echo ========================================
git push origin main
if errorlevel 1 (
    echo ⚠️ Push to main failed or already up to date
)

git push origin v%NEW_VERSION%
if errorlevel 1 (
    echo ❌ Failed to push tag!
    pause
    exit /b 1
)
echo ✅ Pushed to GitHub

echo.
echo ========================================
echo    ✅ RELEASE COMPLETE!
echo ========================================
echo.
echo 📦 Build output location:
echo    build-output\BeastBrowser-Setup-%NEW_VERSION%.exe
echo    build-output\latest.yml
echo.
echo 🎯 Next steps:
echo    1. GitHub Actions will automatically create the release
echo    2. Wait 5-10 minutes for the build to complete
echo    3. Check: https://github.com/rohitmen394/beastbrowser/releases
echo    4. Verify the release has both .exe and .yml files
echo    5. Test auto-update on an older version
echo.
echo 🎉 Users will now get automatic update notifications!
echo.
pause
