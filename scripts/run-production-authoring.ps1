[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$repo = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$mutex = [System.Threading.Mutex]::new($false, 'Local\PaperEnglishProductionAuthoring')
$locked = $false

try {
  $locked = $mutex.WaitOne(0)
  if (-not $locked) {
    Write-Error 'AUTHORING_ALREADY_RUNNING'
    exit 2
  }

  Set-Location -LiteralPath $repo
  if ((git branch --show-current).Trim() -ne 'main') { throw 'AUTHORING_REQUIRES_MAIN' }
  if (git status --porcelain) { throw 'AUTHORING_DIRTY_TREE' }

  git fetch origin main --quiet
  if ($LASTEXITCODE -ne 0) { throw 'AUTHORING_GIT_FETCH_FAILED' }
  git merge --ff-only origin/main --quiet
  if ($LASTEXITCODE -ne 0) { throw 'AUTHORING_MAIN_NOT_FAST_FORWARD' }
  if (git status --porcelain) { throw 'AUTHORING_DIRTY_AFTER_UPDATE' }

  $logDir = Join-Path $repo '.runtime\logs'
  New-Item -ItemType Directory -Force -Path $logDir | Out-Null
  $stamp = Get-Date -Format 'yyyy-MM-dd'
  $logPath = Join-Path $logDir "production-authoring-$stamp.log"
  $started = (Get-Date).ToString('o')
  Add-Content -LiteralPath $logPath -Value "$started START"

  & pnpm worker author-local-codex 2>&1 | Add-Content -LiteralPath $logPath
  $exitCode = $LASTEXITCODE
  $ended = (Get-Date).ToString('o')
  Add-Content -LiteralPath $logPath -Value "$ended EXIT $exitCode"
  exit $exitCode
}
catch {
  $safeCode = if ($_.Exception.Message -match '^[A-Z0-9_:-]+$') { $_.Exception.Message } else { 'AUTHORING_LAUNCHER_FAILED' }
  Write-Error $safeCode
  exit 1
}
finally {
  if ($locked) { $mutex.ReleaseMutex() }
  $mutex.Dispose()
}
