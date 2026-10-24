# Smart Notes - local launcher (serves the app on localhost and opens it in its own window)
$ErrorActionPreference = 'Stop'
$root = if ($PSScriptRoot) { $PSScriptRoot } else { [AppContext]::BaseDirectory }
$root = [IO.Path]::GetFullPath($root)
$port = 5178
$url  = "http://localhost:$port/index.html"

$candidates = @(
  "$env:ProgramFiles (x86)\Microsoft\Edge\Application\msedge.exe",
  "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe",
  "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe",
  "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
  "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
  "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe"
)
$browser = $candidates | Where-Object { $_ -and (Test-Path $_) } | Select-Object -First 1
if (-not $browser) {
  Add-Type -AssemblyName PresentationFramework
  [System.Windows.MessageBox]::Show('Microsoft Edge or Google Chrome is required.', 'Smart Notes') | Out-Null
  exit 1
}
$profileDir = Join-Path $env:LOCALAPPDATA 'SmartNotes\profile'
New-Item -ItemType Directory -Force -Path $profileDir | Out-Null

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")
try { $listener.Start() }
catch {
  # already running: just open another window on the existing server
  Start-Process $browser -ArgumentList @("--app=$url", "--user-data-dir=$profileDir")
  exit 0
}

$mime = @{
  '.html'='text/html; charset=utf-8'; '.js'='text/javascript; charset=utf-8'; '.json'='application/json';
  '.webmanifest'='application/manifest+json'; '.png'='image/png'; '.ico'='image/x-icon';
  '.svg'='image/svg+xml'; '.css'='text/css'
}
$proc = Start-Process $browser -PassThru -ArgumentList @(
  "--app=$url", "--user-data-dir=$profileDir", "--window-size=1200,820", "--no-first-run", "--no-default-browser-check"
)
$pending = $listener.BeginGetContext($null, $null)
while (-not $proc.HasExited) {
  if ($pending.AsyncWaitHandle.WaitOne(250)) {
    $ctx = $listener.EndGetContext($pending)
    $pending = $listener.BeginGetContext($null, $null)
    try {
      $rel = [Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath).TrimStart('/')
      if (-not $rel) { $rel = 'index.html' }
      $full = [IO.Path]::GetFullPath((Join-Path $root $rel))
      $ext = [IO.Path]::GetExtension($full).ToLower()
      if (-not $full.StartsWith($root) -or -not $mime.ContainsKey($ext) -or -not (Test-Path $full -PathType Leaf)) {
        $ctx.Response.StatusCode = 404
      } else {
        $bytes = [IO.File]::ReadAllBytes($full)
        $ctx.Response.ContentType = $mime[$ext]
        $ctx.Response.ContentLength64 = $bytes.Length
        $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length)
      }
    } catch { }
    try { $ctx.Response.Close() } catch { }
  }
}
$listener.Stop()
