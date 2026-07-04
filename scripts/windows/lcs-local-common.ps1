Set-StrictMode -Version Latest

function Get-LcsRepoRoot {
  return (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
}

function Read-LcsEnv {
  param([string]$RepoRoot = (Get-LcsRepoRoot))
  $envPath = Join-Path $RepoRoot ".env"
  $values = @{
    LCS_APP_PORT = "3000"
    LCS_DATABASE_PATH = "local-data/db/dev.db"
    LCS_EXPORT_DIR = "local-data/exports"
    LCS_IMPORT_DIR = "local-data/imports"
    LCS_BACKUP_DIR = "local-data/backups"
    LCS_LOG_DIR = "local-data/logs"
  }
  if (Test-Path $envPath) {
    Get-Content $envPath | ForEach-Object {
      if ($_ -match "^\s*#" -or $_ -notmatch "=") { return }
      $parts = $_ -split "=", 2
      $key = $parts[0].Trim()
      $value = $parts[1].Trim().Trim('"')
      if ($key) { $values[$key] = $value }
    }
  }
  return $values
}

function Resolve-LcsPath {
  param(
    [Parameter(Mandatory = $true)][string]$RepoRoot,
    [Parameter(Mandatory = $true)][string]$PathValue
  )
  if ([System.IO.Path]::IsPathRooted($PathValue)) {
    return $PathValue
  }
  return Join-Path $RepoRoot $PathValue
}

function Ensure-LcsLocalDirectories {
  param([string]$RepoRoot = (Get-LcsRepoRoot))
  $envValues = Read-LcsEnv $RepoRoot
  foreach ($key in @("LCS_DATABASE_PATH", "LCS_EXPORT_DIR", "LCS_IMPORT_DIR", "LCS_BACKUP_DIR", "LCS_LOG_DIR")) {
    $path = Resolve-LcsPath $RepoRoot $envValues[$key]
    $directory = if ($key -eq "LCS_DATABASE_PATH") { Split-Path $path -Parent } else { $path }
    New-Item -ItemType Directory -Force -Path $directory | Out-Null
  }
}

function Set-LcsProcessEnv {
  param([string]$RepoRoot = (Get-LcsRepoRoot))
  $envValues = Read-LcsEnv $RepoRoot
  foreach ($key in $envValues.Keys) {
    [Environment]::SetEnvironmentVariable($key, $envValues[$key], "Process")
  }
  return $envValues
}

function Get-LcsDatabasePath {
  param([string]$RepoRoot = (Get-LcsRepoRoot))
  $envValues = Read-LcsEnv $RepoRoot
  return Resolve-LcsPath $RepoRoot $envValues["LCS_DATABASE_PATH"]
}

function Get-LcsBackupDirectory {
  param([string]$RepoRoot = (Get-LcsRepoRoot))
  $envValues = Read-LcsEnv $RepoRoot
  return Resolve-LcsPath $RepoRoot $envValues["LCS_BACKUP_DIR"]
}
