param(
  [switch]$DryRun
)

$ErrorActionPreference = 'Stop'

$scripts = $PSScriptRoot
$root = Split-Path -Parent $scripts

$bridge = Join-Path $root 'bridge'
$dashboard = Join-Path $root 'dashboard'
$bootstrap = Join-Path $scripts 'bootstrap-maven.ps1'
$setupPy = Join-Path $scripts 'setup-python.ps1'
$python = Join-Path $root '.venv\Scripts\python.exe'
$mvn = Join-Path $root '.tools\apache-maven-3.9.8\bin\mvn.cmd'

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

if ($DryRun) {
  Write-Host "[DRYRUN] Start bridge: node server.js (cwd=$bridge)"
  Write-Host "[DRYRUN] Start dashboard: npm run dev (cwd=$dashboard)"
  Write-Host "[DRYRUN] Start agent: $python src\main\python\drl_agent.py (cwd=$root)"
} else {
  Start-Process powershell -WorkingDirectory $bridge -ArgumentList @('-NoExit','-Command','node server.js')
  Start-Process powershell -WorkingDirectory $dashboard -ArgumentList @('-NoExit','-Command','npm run dev')
  Start-Process powershell -WorkingDirectory $root -ArgumentList @('-NoExit','-Command',"`"$python`" src\main\python\drl_agent.py")
}

Run-Step 'Run AgentSimulation' {
  & $mvn -DskipTests compile exec:java "-Dexec.mainClass=AgentSimulation"
}
