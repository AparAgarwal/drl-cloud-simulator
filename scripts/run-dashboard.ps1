$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
Set-Location (Join-Path $root 'dashboard')

npm install
npm run dev
