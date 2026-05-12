# DRL Cloud Simulator

A CloudSim Plus project for comparing scheduling strategies and training a DRL agent. The Java simulation talks to a Python agent via JSON files, and a small Node bridge can stream logs to the dashboard.

## Quick start (Windows)

From the project root:

```powershell
scripts\run-all.ps1
```

This will:
- Bootstrap a local Maven distribution in `.tools/`
- Create a Python venv and install dependencies
- Install Node dependencies for the bridge and dashboard
- Start the bridge + dashboard + agent
- Run `AgentSimulation`

Use a dry run to preview the steps:

```powershell
scripts\run-all.ps1 -DryRun
```

## Prerequisites

- JDK 21
- Python 3.11+ (3.12 tested)
- Node.js 18+
- PowerShell (Windows)

## Setup (manual)

### Java (local Maven)

```powershell
scripts\bootstrap-maven.ps1
```

### Python (venv + deps)

```powershell
scripts\setup-python.ps1
```

### Node (bridge + dashboard)

```powershell
cd bridge
npm install

cd ..\dashboard
npm install
```

## Run order (recommended)

### 1) Start the bridge (optional but recommended for logs)

```powershell
scripts\run-bridge.ps1
```

### 2) Start the dashboard

```powershell
scripts\run-dashboard.ps1
```

### 3) Start the Python agent

```powershell
scripts\run-agent.ps1
```

### 4) Run a simulation

```powershell
scripts\run-basic.ps1
scripts\run-baseline.ps1
scripts\run-agent-sim.ps1
```

## Stored data (no re-run needed)

The training runs produce CSVs that can be loaded into the dashboard without re-running simulations:

- `training_metrics.csv` (loss/epsilon)
- `java_performance.csv` (average turnaround per epoch)

In the dashboard, use **Load Training CSV** and **Load Performance CSV**. The UI caches these locally (localStorage) and reuses them on refresh.

## Notes

- Run the Python agent and Java simulation from the project root so they share `state.json`, `action.json`, and `reward.json`.
- `.venv/`, `node_modules/`, `.tools/`, and runtime artifacts are intentionally ignored and should be recreated locally.
- If you prefer manual commands, see the scripts in `scripts/`.

## Troubleshooting

- If `AgentSimulation` fails with an empty action, ensure the Python agent is running first.
- If Maven is missing, run `scripts/bootstrap-maven.ps1`.
- If the dashboard shows no logs, ensure the bridge is running on http://localhost:4000.
