$root = $PSScriptRoot
$ws = New-Object -ComObject WScript.Shell
$desk = [Environment]::GetFolderPath('Desktop')
$s = $ws.CreateShortcut("$desk\Smart Notes.lnk")
$s.TargetPath = "wscript.exe"
$s.Arguments = "`"$root\SmartNotes.vbs`""
$s.WorkingDirectory = $root
$s.IconLocation = "$root\icons\app.ico"
$s.Save()
Write-Host "Shortcut created on Desktop: Smart Notes"
