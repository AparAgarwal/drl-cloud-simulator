param(
	[string]$MainClass = 'AgentSimulation'
)

$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot

function Resolve-MavenCommand {
	$mvnFromPath = Get-Command mvn.cmd -ErrorAction SilentlyContinue
	if (-not $mvnFromPath) {
		$mvnFromPath = Get-Command mvn -ErrorAction SilentlyContinue
	}
	if ($mvnFromPath) {
		return $mvnFromPath.Source
	}

	$tools = Join-Path $root '.tools'
	if (Test-Path $tools) {
		$candidates = Get-ChildItem -Path $tools -Directory -Filter 'apache-maven-*' |
			Sort-Object Name -Descending
		foreach ($dir in $candidates) {
			$candidate = Join-Path $dir.FullName ('bin\' + $(if ($IsWindows) { 'mvn.cmd' } else { 'mvn' }))
			if (Test-Path $candidate) {
				return $candidate
			}
		}
	}

	throw 'Maven not found. Install Maven or run scripts/bootstrap-maven.ps1.'
}

$mvn = Resolve-MavenCommand
Write-Host "Using Maven: $mvn"
& $mvn '-DskipTests' 'compile' 'exec:java' "-Dexec.mainClass=$MainClass"
