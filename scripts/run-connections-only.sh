#!/bin/bash
# Full System Start - Opens all connections, no training
# Starts: Bridge (API), Dashboard (Frontend)
# Training runs only when clicked in the frontend

set -e

root=$(cd "$(dirname "$0")/.." && pwd)

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "   DRL Cloud Simulator - Full System Start"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Paths
bridgePath="$root/bridge"
dashboardPath="$root/dashboard"

# Check dependencies
if [ ! -d "$bridgePath/node_modules" ]; then
    echo "[1/4] Installing Bridge dependencies..."
    cd "$bridgePath"
    npm install --silent
fi

if [ ! -d "$dashboardPath/node_modules" ]; then
    echo "[2/4] Installing Dashboard dependencies..."
    cd "$dashboardPath"
    npm install --silent
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
echo "   ✓ Bridge:    http://localhost:4000/health"
echo "   ✓ Dashboard: http://localhost:5173"
echo ""
echo "   Status: All connections ready, waiting for commands from dashboard"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "   Click in dashboard to:"
echo "   • 'Start Agent Simulation' to run training"
echo "   • 'Load Training CSV' to view past metrics"
echo "   • 'Load Baseline CSV' to compare algorithms"
echo ""
echo "   Press Ctrl+C to stop all services"
echo ""

# Cleanup on exit
cleanup() {
    echo ""
    echo "Stopping services..."
    kill $BRIDGE_PID $DASHBOARD_PID 2>/dev/null || true
    exit 0
}

trap cleanup INT TERM
wait
