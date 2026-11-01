<#
.SYNOPSIS
  Serves ./public at http://localhost:<Port>/ for local preview. No installs needed.
  The PHP API (/api/*) only runs on the real host; locally it returns 501.
#>
param([int]$Port = 8080)

$root = (Resolve-Path (Join-Path $PSScriptRoot '..\public')).Path
$types = @{
  '.html' = 'text/html; charset=utf-8'; '.css' = 'text/css; charset=utf-8'; '.js' = 'text/javascript; charset=utf-8'
  '.json' = 'application/json'; '.svg' = 'image/svg+xml'; '.png' = 'image/png'; '.jpg' = 'image/jpeg'; '.ico' = 'image/x-icon'
}

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")
$listener.Start()
Write-Host "Serving $root at http://localhost:$Port/  (Ctrl+C to stop)"

try {
  while ($listener.IsListening) {
    $ctx = $listener.GetContext()
    $path = [Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath)
    $res = $ctx.Response
    $status = 200
    if ($path -like '/api/*' -or $path -eq '/api') {
      $status = 501
      $bytes = [Text.Encoding]::UTF8.GetBytes('{"error":"The PHP API only runs on the deployed site."}')
      $res.ContentType = 'application/json'
    } else {
      if ($path.EndsWith('/')) { $path += 'index.html' }
      $file = [IO.Path]::GetFullPath((Join-Path $root $path.TrimStart('/')))
      if ($file.StartsWith($root) -and (Test-Path $file -PathType Leaf)) {
        $bytes = [IO.File]::ReadAllBytes($file)
        $ext = [IO.Path]::GetExtension($file).ToLower()
        $res.ContentType = if ($types[$ext]) { $types[$ext] } else { 'application/octet-stream' }
      } else {
        $status = 404
        $bytes = [Text.Encoding]::UTF8.GetBytes('Not found')
      }
    }
    try {
      $res.StatusCode = $status
      $res.Headers['Cache-Control'] = 'no-store'
      $res.ContentLength64 = $bytes.Length
      if ($ctx.Request.HttpMethod -ne 'HEAD') { $res.OutputStream.Write($bytes, 0, $bytes.Length) }
      $res.Close()
    } catch {
      Write-Host "Error answering $path : $($_.Exception.Message)"
    }
    Write-Host "$status $($ctx.Request.HttpMethod) $path"
  }
} finally {
  $listener.Stop()
}
