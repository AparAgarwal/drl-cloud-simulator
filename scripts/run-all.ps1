param(
  [switch]$DryRun,
  [switch]$StartSimulation
)

$ErrorActionPreference = 'Stop'

$scripts = $PSScriptRoot
$root = Split-Path -Parent $scripts

$bridge = Join-Path $root 'bridge'
$dashboard = Join-Path $root 'dashboard'
$bootstrap = Join-Path $scripts 'bootstrap-maven.ps1'
$setupPy = Join-Path $scripts 'setup-python.ps1'
$runAgentSim = Join-Path $scripts 'run-agent-sim.ps1'
$python = Join-Path $root '.venv\Scripts\python.exe'

function Run-Step([string]$name, [scriptblock]$action) {
  if ($DryRun) {
    Write-Host "[DRYRUN] $name"
  } else {
    & $action
  }
}

Run-Step 'Bootstrap Maven' { & $bootstrap }
Run-Step 'Setup Python venv' { & $setupPy }

Run-Step 'Install bridge dependencies' {
  Push-Location $bridge
  npm install
  Pop-Location
}

Run-Step 'Install dashboard dependencies' {
  Push-Location $dashboard
  npm install
  Pop-Location
}

Run-Step 'Stop existing DRL agent processes' {
  $existingAgents = Get-CimInstance Win32_Process |
    Where-Object { $_.CommandLine -like '*drl_agent.py*' }
  foreach ($proc in $existingAgents) {
    try {
      Stop-Process -Id $proc.ProcessId -Force -ErrorAction Stop
      Write-Host "Stopped stale agent process PID=$($proc.ProcessId)"
    } catch {
      Write-Host "Could not stop agent process PID=$($proc.ProcessId): $($_.Exception.Message)"
    }
  }
}

if ($DryRun) {
  Write-Host "[DRYRUN] Start bridge: node server.js (cwd=$bridge)"
  Write-Host "[DRYRUN] Start dashboard: npm run dev (cwd=$dashboard)"
  Write-Host "[DRYRUN] Start agent: $python src\main\python\drl_agent.py (cwd=$root)"
} else {
  Start-Process -FilePath 'npm.cmd' -ArgumentList @('start') -WorkingDirectory $bridge
  Start-Process -FilePath 'npm.cmd' -ArgumentList @('run','dev') -WorkingDirectory $dashboard
  Start-Process -FilePath $python -ArgumentList @('src\main\python\drl_agent.py') -WorkingDirectory $root
}

if ($StartSimulation) {
  Run-Step 'Run AgentSimulation' {
    & $runAgentSim -MainClass 'AgentSimulation'
  }
} else {
  Write-Host "Simulation not auto-started. Use dashboard button 'Start Agent Simulation'."
}
