$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$venv = Join-Path $root '.venv'
$py = Join-Path $venv 'Scripts\python.exe'

if (!(Test-Path $venv)) {
  python -m venv $venv
}

& $py -m pip install --upgrade pip
& $py -m pip install -r (Join-Path $root 'requirements.txt')
