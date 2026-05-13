#!/bin/bash
# Quick Start - Opens connections only, no training
# Starts Bridge (API server) and Dashboard (Frontend)
# Training runs only when clicked in the frontend

set -e

root=$(cd "$(dirname "$0")/.." && pwd)

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "   DRL Cloud Simulator - Quick Start (Connections Only)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Paths
bridgePath="$root/bridge"
dashboardPath="$root/dashboard"

# Check if npm packages are installed
if [ ! -d "$bridgePath/node_modules" ]; then
    echo "[1/4] Installing Bridge dependencies..."
    cd "$bridgePath"
    npm install
fi

if [ ! -d "$dashboardPath/node_modules" ]; then
    echo "[2/4] Installing Dashboard dependencies..."
    cd "$dashboardPath"
    npm install
fi

# Start Bridge in background
echo "[3/4] Starting Bridge server (localhost:4000)..."
cd "$bridgePath"
npm start &
BRIDGE_PID=$!
sleep 2

# Start Dashboard
echo "[4/4] Starting Dashboard frontend (localhost:5173)..."
cd "$dashboardPath"
npm run dev &
DASHBOARD_PID=$!

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "   Dashboard:  http://localhost:5173"
echo "   Bridge API: http://localhost:4000/health"
echo ""
echo "   Ready! Click 'Start Agent Simulation' in the dashboard to begin."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "   Press Ctrl+C to stop all services"
echo ""

# Wait for user interrupt
trap "kill $BRIDGE_PID $DASHBOARD_PID 2>/dev/null; exit" INT TERM
wait
