[CmdletBinding()]
param(
  [string]$TaskName = 'Paper English Production Authoring',
  [string]$DailyAt = '00:15',
  [switch]$Disable
)

$ErrorActionPreference = 'Stop'
if ($Disable) {
  Disable-ScheduledTask -TaskName $TaskName | Out-Null
  Write-Output "Disabled scheduled task: $TaskName"
  exit 0
}

$launcher = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot 'run-production-authoring.ps1'))
$time = [DateTime]::ParseExact($DailyAt, 'HH:mm', [Globalization.CultureInfo]::InvariantCulture)
$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-NoLogo -NoProfile -NonInteractive -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$launcher`""
$trigger = New-ScheduledTaskTrigger -Daily -At $time
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -WakeToRun -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Hours 6)
$principal = New-ScheduledTaskPrincipal -UserId ([System.Security.Principal.WindowsIdentity]::GetCurrent().Name) -LogonType Interactive -RunLevel Limited
$task = New-ScheduledTask -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Description 'Runs one private production curriculum authoring batch through the local ChatGPT-authenticated Codex CLI.'
Register-ScheduledTask -TaskName $TaskName -InputObject $task -Force | Out-Null
Write-Output "Installed scheduled task: $TaskName at $DailyAt"
