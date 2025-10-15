# GitHub Release Script for BeastBrowser
# Usage: .\github-release.ps1 -Token YOUR_GITHUB_TOKEN

param(
    [Parameter(Mandatory=$true)]
    [string]$Token,
    
    [string]$Repo = "rohitmen394/beastbrowser",
    [string]$Version = "v2.0.3"
)

# Colors
function Write-Success { Write-Host $args -ForegroundColor Green }
function Write-Info { Write-Host $args -ForegroundColor Cyan }
function Write-Warning { Write-Host $args -ForegroundColor Yellow }
function Write-Error { Write-Host $args -ForegroundColor Red }

Write-Info "🚀 Starting GitHub Release Process"
Write-Info "Repository: $Repo"
Write-Info "Version: $Version"
Write-Info ""

# Check if build files exist
$exePath = "build-output\BeastBrowser-Setup-2.0.3.exe"
$ymlPath = "build-output\latest.yml"

if (-not (Test-Path $exePath)) {
    Write-Error "❌ Error: $exePath not found!"
    Write-Warning "Run 'npm run build:win' first"
    exit 1
}

if (-not (Test-Path $ymlPath)) {
    Write-Error "❌ Error: $ymlPath not found!"
    exit 1
}

Write-Success "✅ Build files found"

# Step 1: Create Release
Write-Info "`n📝 Creating GitHub release..."

$releaseData = @{
    tag_name = $Version
    name = "BeastBrowser $Version"
    body = @"
🚀 BeastBrowser $Version

## Features
✨ Anti-detection browser with ungoogled-chromium 139
🔐 Proxy support (HTTP/HTTPS/SOCKS5)
👤 Profile management system
🤖 RPA automation capabilities

## Download
📥 **BeastBrowser-Setup-2.0.3.exe** - Windows Installer (64-bit)

## Installation
1. Download BeastBrowser-Setup-2.0.3.exe
2. Run installer
3. Follow setup wizard
4. Launch BeastBrowser!

## System Requirements
- Windows 10/11 (64-bit)
- 4 GB RAM minimum
- 500 MB disk space
"@
    draft = $false
    prerelease = $false
} | ConvertTo-Json

$headers = @{
    Authorization = "Bearer $Token"
    Accept = "application/vnd.github+json"
}

try {
    $release = Invoke-RestMethod -Uri "https://api.github.com/repos/$Repo/releases" -Method Post -Headers $headers -Body $releaseData -ContentType "application/json"
    Write-Success "✅ Release created successfully!"
    Write-Info "   URL: $($release.html_url)"
} catch {
    Write-Error "❌ Failed to create release!"
    Write-Error $_.Exception.Message
    exit 1
}

# Step 2: Upload Installer
Write-Info "`n📦 Uploading installer (this may take a few minutes)..."
$uploadUrl = $release.upload_url -replace '\{\?name,label\}', "?name=BeastBrowser-Setup-2.0.3.exe"

$exeHeaders = @{
    Authorization = "Bearer $Token"
    "Content-Type" = "application/octet-stream"
}

try {
    $result = Invoke-RestMethod -Uri $uploadUrl -Method Post -Headers $exeHeaders -InFile $exePath
    Write-Success "✅ Installer uploaded successfully!"
    Write-Info "   Size: $([math]::Round((Get-Item $exePath).Length / 1MB, 2)) MB"
} catch {
    Write-Error "❌ Failed to upload installer!"
    Write-Error $_.Exception.Message
    exit 1
}

# Step 3: Upload latest.yml
Write-Info "`n📋 Uploading latest.yml (for auto-updates)..."
$uploadUrl = $release.upload_url -replace '\{\?name,label\}', "?name=latest.yml"

$ymlHeaders = @{
    Authorization = "Bearer $Token"
    "Content-Type" = "text/yaml"
}

try {
    $result = Invoke-RestMethod -Uri $uploadUrl -Method Post -Headers $ymlHeaders -InFile $ymlPath
    Write-Success "✅ latest.yml uploaded successfully!"
} catch {
    Write-Error "❌ Failed to upload latest.yml!"
    Write-Error $_.Exception.Message
    exit 1
}

# Success!
Write-Success "`n🎉 Release complete!"
Write-Info ""
Write-Info "📦 Release URL:"
Write-Success "   $($release.html_url)"
Write-Info ""
Write-Info "📥 Download link:"
Write-Success "   https://github.com/$Repo/releases/download/$Version/BeastBrowser-Setup-2.0.3.exe"
Write-Info ""
Write-Success "✅ Users will now receive auto-update notifications!"
