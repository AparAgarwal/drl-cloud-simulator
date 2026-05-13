# Quick Start - Opens connections only, no training
# Starts Bridge (API server) and Dashboard (Frontend)
# Training runs only when clicked in the frontend

$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "   DRL Cloud Simulator - Quick Start (Connections Only)" -ForegroundColor Cyan
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

# Check if npm packages are installed
$bridgePath = Join-Path $root 'bridge'
$dashboardPath = Join-Path $root 'dashboard'

if (-not (Test-Path "$bridgePath\node_modules")) {
    Write-Host "[1/4] Installing Bridge dependencies..." -ForegroundColor Yellow
    Set-Location $bridgePath
    & $npmPath install --silent
}

if (-not (Test-Path "$dashboardPath\node_modules")) {
    Write-Host "[2/4] Installing Dashboard dependencies..." -ForegroundColor Yellow
    Set-Location $dashboardPath
    & $npmPath install --silent
}

# Start Bridge in background
Write-Host "[3/4] Starting Bridge server (localhost:4000)..." -ForegroundColor Green
Set-Location $bridgePath
$bridgeProcess = Start-Process -NoNewWindow -FilePath $npmPath -ArgumentList "start" -PassThru
Start-Sleep -Seconds 3

# Start Dashboard in new window
Write-Host "[4/4] Starting Dashboard frontend (localhost:5173)..." -ForegroundColor Green
Set-Location $dashboardPath
$dashboardProcess = Start-Process -FilePath $npmPath -ArgumentList "run", "dev" -PassThru
Start-Sleep -Seconds 2

Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "   Dashboard:  http://localhost:5173" -ForegroundColor Cyan
Write-Host "   Bridge API: http://localhost:4000/health" -ForegroundColor Cyan
Write-Host ""
Write-Host "   Ready! Click 'Start Agent Simulation' in the dashboard to begin." -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
