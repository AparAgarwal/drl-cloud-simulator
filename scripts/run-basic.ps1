$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$mvn = Join-Path $root '.tools\apache-maven-3.9.8\bin\mvn.cmd'

& $mvn -DskipTests compile exec:java "-Dexec.mainClass=BasicSimulation"
