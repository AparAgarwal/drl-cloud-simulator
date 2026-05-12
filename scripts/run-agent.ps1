$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$py = Join-Path $root '.venv\Scripts\python.exe'

& $py (Join-Path $root 'src\main\python\drl_agent.py')
