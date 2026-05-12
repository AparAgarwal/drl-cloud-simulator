$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$tools = Join-Path $root '.tools'
$mavenDir = Join-Path $tools 'apache-maven-3.9.8'
$zip = Join-Path $tools 'apache-maven-3.9.8-bin.zip'

if (!(Test-Path $mavenDir)) {
  New-Item -ItemType Directory -Force -Path $tools | Out-Null
  Invoke-WebRequest -Uri 'https://archive.apache.org/dist/maven/maven-3/3.9.8/binaries/apache-maven-3.9.8-bin.zip' -OutFile $zip
  Expand-Archive -Path $zip -DestinationPath $tools -Force
}

& (Join-Path $mavenDir 'bin\mvn.cmd') -version
