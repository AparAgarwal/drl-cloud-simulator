# Full System Start - Opens all connections, no training
# Starts: Bridge (API), Dashboard (Frontend)
# Training runs only when clicked in the frontend

$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "   DRL Cloud Simulator - Full System Start" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

# Check if Node.js/npm is installed
$npmCmd = Get-Command npm -ErrorAction SilentlyContinue
if (-not $npmCmd) {
    Write-Host "ERROR: npm not found in PATH" -ForegroundColor Red
    Write-Host "Please install Node.js from https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}

# Use npm.cmd instead of npm wrapper
$npmPath = "npm.cmd"

# Paths
$bridgePath = Join-Path $root 'bridge'
$dashboardPath = Join-Path $root 'dashboard'
$srcPath = Join-Path $root 'src'

# Check dependencies
$bridgeNodeModules = Test-Path "$bridgePath\node_modules"
$dashboardNodeModules = Test-Path "$dashboardPath\node_modules"

if (-not $bridgeNodeModules) {
    Write-Host "[1/5] Installing Bridge dependencies..." -ForegroundColor Yellow
    Set-Location $bridgePath
    & $npmPath install --silent
}

if (-not $dashboardNodeModules) {
    Write-Host "[2/5] Installing Dashboard dependencies..." -ForegroundColor Yellow
    Set-Location $dashboardPath
    & $npmPath install --silent
}

# Build Maven project (if not already built)
Write-Host "[3/5] Checking/Building Java project..." -ForegroundColor Yellow
Set-Location $root
if (-not (Test-Path "target\classes")) {
    $mvnCmd = Get-Command mvn -ErrorAction SilentlyContinue
    if ($mvnCmd) {
        mvn clean compile -q 2>$null
    } else {
        Write-Host "   (Maven not found, skipping Java build)" -ForegroundColor Gray
    }
}

# Start Bridge
Write-Host "[4/5] Starting Bridge server (localhost:4000)..." -ForegroundColor Green
Set-Location $bridgePath
$bridgeProcess = Start-Process -NoNewWindow -FilePath $npmPath -ArgumentList "start" -PassThru
Start-Sleep -Seconds 3

# Start Dashboard
Write-Host "[5/5] Starting Dashboard frontend (localhost:5173)..." -ForegroundColor Green
Set-Location $dashboardPath
$dashboardProcess = Start-Process -FilePath $npmPath -ArgumentList "run", "dev" -PassThru
Start-Sleep -Seconds 2

Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "   [ok] Bridge:    http://localhost:4000/health" -ForegroundColor Green
Write-Host "   [ok] Dashboard: http://localhost:5173" -ForegroundColor Green
Write-Host ""
Write-Host "   Status: All connections ready, waiting for commands from dashboard" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "   Click in dashboard to:" -ForegroundColor White
Write-Host "   * 'Start Agent Simulation' to run training" -ForegroundColor White
Write-Host "   * 'Load Training CSV' to view past metrics" -ForegroundColor White
Write-Host "   * 'Load Baseline CSV' to compare algorithms" -ForegroundColor White
Write-Host ""
Write-Host "   Press Ctrl+C to stop all services" -ForegroundColor Gray
