<#
.SYNOPSIS
  Uploads files in ./public to your cPanel account over FTPS every time you save.

.DESCRIPTION
  Reads FTP settings from deploy.config.json in the project root (copy
  deploy.config.example.json and fill it in). Needs nothing but Windows PowerShell.

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File scripts\watch-deploy.ps1
  Watch ./public and upload each file as it is saved or deleted.

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File scripts\watch-deploy.ps1 -Full
  Upload every file once, then keep watching.
#>
param(
  [switch]$Full,
  [string]$Config = (Join-Path $PSScriptRoot '..\deploy.config.json')
)

$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..\public')).Path
$excluded = @('api\data\*', '*.tmp', '*~', '*.swp', '.DS_Store')

if (-not (Test-Path $Config)) {
  throw "Missing $Config. Copy deploy.config.example.json to deploy.config.json and fill in your FTP details."
}
$cfg = Get-Content $Config -Raw | ConvertFrom-Json
$remoteRoot = '/' + $cfg.remoteRoot.Trim('/')
$cred = New-Object System.Net.NetworkCredential($cfg.username, $cfg.password)
$useTls = $cfg.useTls -ne $false

try {
  [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12 -bor [Net.SecurityProtocolType]::Tls13
} catch {
  [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
}

if ($cfg.ignoreCertErrors -eq $true) {
  # Shared hosts often present a certificate for the server's hostname rather than ftp.yourdomain.
  Add-Type @'
using System.Net;
public static class TapTrustAll {
  public static void Enable() { ServicePointManager.ServerCertificateValidationCallback = (s, c, ch, e) => true; }
}
'@
  [TapTrustAll]::Enable()
}

function Get-RemoteUri([string]$relative) {
  $segments = ($remoteRoot.Trim('/') + '/' + $relative.Replace('\', '/')).Trim('/').Split('/') |
    Where-Object { $_ } | ForEach-Object { [Uri]::EscapeDataString($_) }
  "ftp://$($cfg.host):$(if ($cfg.port) { $cfg.port } else { 21 })/" + ($segments -join '/')
}

function Invoke-Ftp([string]$relative, [string]$method, [byte[]]$data) {
  $req = [System.Net.FtpWebRequest]::Create((Get-RemoteUri $relative))
  $req.Method = $method
  $req.Credentials = $cred
  $req.EnableSsl = $useTls
  $req.UsePassive = $true
  $req.UseBinary = $true
  $req.KeepAlive = $false
  if ($data) {
    $req.ContentLength = $data.Length
    $stream = $req.GetRequestStream()
    $stream.Write($data, 0, $data.Length)
    $stream.Close()
  }
  $req.GetResponse().Close()
}

$knownDirs = @{}
function Confirm-RemoteDir([string]$relativeDir) {
  if (-not $relativeDir -or $knownDirs[$relativeDir]) { return }
  $path = ''
  foreach ($part in $relativeDir.Split('\')) {
    $path = if ($path) { "$path\$part" } else { $part }
    if ($knownDirs[$path]) { continue }
    try { Invoke-Ftp $path ([System.Net.WebRequestMethods+Ftp]::MakeDirectory) $null } catch { } # 550 = already exists
    $knownDirs[$path] = $true
  }
}

function Test-Excluded([string]$relative) {
  foreach ($pattern in $excluded) { if ($relative -like $pattern) { return $true } }
  $false
}

function Sync-Path([string]$fullPath) {
  $relative = $fullPath.Substring($root.Length).TrimStart('\')
  if (-not $relative -or (Test-Excluded $relative)) { return }
  $stamp = Get-Date -Format 'HH:mm:ss'
  try {
    if (Test-Path $fullPath -PathType Leaf) {
      $bytes = $null
      for ($i = 0; $i -lt 5 -and -not $bytes; $i++) {
        try { $bytes = [IO.File]::ReadAllBytes($fullPath) } catch { Start-Sleep -Milliseconds 200 } # editor may still hold the file
      }
      if ($null -eq $bytes) { throw 'File is locked.' }
      Confirm-RemoteDir (Split-Path $relative -Parent)
      Invoke-Ftp $relative ([System.Net.WebRequestMethods+Ftp]::UploadFile) $bytes
      Write-Host "[$stamp] uploaded  $relative" -ForegroundColor Green
    } elseif (-not (Test-Path $fullPath)) {
      Invoke-Ftp $relative ([System.Net.WebRequestMethods+Ftp]::DeleteFile) $null
      Write-Host "[$stamp] deleted   $relative" -ForegroundColor Yellow
    }
  } catch {
    $err = $_.Exception
    while ($err.InnerException) { $err = $err.InnerException }
    Write-Host "[$stamp] FAILED    $relative : $($err.Message)" -ForegroundColor Red
  }
}

Write-Host "Deploying $root -> $($cfg.host)$remoteRoot (TLS: $useTls)"

if ($Full) {
  Get-ChildItem $root -Recurse -File | ForEach-Object { Sync-Path $_.FullName }
}

$watcher = New-Object System.IO.FileSystemWatcher $root
$watcher.IncludeSubdirectories = $true
$watcher.NotifyFilter = [IO.NotifyFilters]'FileName, LastWrite, Size'
foreach ($evt in 'Changed', 'Created', 'Deleted', 'Renamed') {
  Register-ObjectEvent $watcher $evt -SourceIdentifier "tap.$evt" | Out-Null
}
$watcher.EnableRaisingEvents = $true
Write-Host 'Watching for saves. Press Ctrl+C to stop.'

$pending = @{}
try {
  while ($true) {
    Wait-Event -Timeout 1 | Out-Null
    foreach ($e in @(Get-Event | Where-Object { $_.SourceIdentifier -like 'tap.*' })) {
      $change = $e.SourceEventArgs
      $pending[$change.FullPath] = Get-Date
      if ($change -is [IO.RenamedEventArgs]) { $pending[$change.OldFullPath] = Get-Date }
      Remove-Event -EventIdentifier $e.EventIdentifier
    }
    # Wait until a file has been quiet for 400 ms so a save produces a single upload.
    $ready = @($pending.Keys | Where-Object { ((Get-Date) - $pending[$_]).TotalMilliseconds -gt 400 })
    foreach ($path in $ready) {
      $pending.Remove($path)
      if (-not (Test-Path $path -PathType Container)) { Sync-Path $path }
    }
  }
} finally {
  Get-EventSubscriber | Where-Object { $_.SourceIdentifier -like 'tap.*' } | Unregister-Event
  $watcher.Dispose()
}
