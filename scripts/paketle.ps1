$ErrorActionPreference = 'Stop'
$kok = Split-Path -Parent $PSScriptRoot
Set-Location $kok

$manifest = Get-Content -Raw -Encoding UTF8 manifest.json | ConvertFrom-Json
$surum = $manifest.version
$ad = "oba-asistan-$surum"
$dist = Join-Path $kok 'dist'
$hedef = Join-Path $dist $ad
$zip = Join-Path $dist "$ad.zip"

$dahil = @('manifest.json', 'KURULUM.md', 'README.md', 'background', 'content', 'popup', 'utils', 'icons')

if (Test-Path $hedef) { Remove-Item -Recurse -Force $hedef }
if (Test-Path $zip) { Remove-Item -Force $zip }
New-Item -ItemType Directory -Force $hedef | Out-Null
foreach ($oge in $dahil) { Copy-Item -Recurse -Force (Join-Path $kok $oge) $hedef }

$gerekli = @($manifest.background.service_worker, $manifest.action.default_popup)
$gerekli += $manifest.content_scripts | ForEach-Object { $_.js }
$gerekli += $manifest.icons.PSObject.Properties.Value
$gerekli += $manifest.action.default_icon.PSObject.Properties.Value
$eksik = $gerekli | Where-Object { -not (Test-Path (Join-Path $hedef $_)) }
if ($eksik) { throw "Manifestte geçen dosyalar pakette yok: $($eksik -join ', ')" }

foreach ($js in Get-ChildItem -Recurse -Filter *.js $hedef) {
  node --check $js.FullName
  if ($LASTEXITCODE -ne 0) { throw "Sözdizimi hatası: $($js.FullName)" }
}

Add-Type -AssemblyName System.IO.Compression.FileSystem
Add-Type -AssemblyName System.IO.Compression
$arsiv = [System.IO.Compression.ZipFile]::Open($zip, 'Create')
try {
  foreach ($dosya in Get-ChildItem -Recurse -File $hedef) {
    $giris = $dosya.FullName.Substring($hedef.Length + 1).Replace('\', '/')
    [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($arsiv, $dosya.FullName, $giris) | Out-Null
  }
} finally { $arsiv.Dispose() }

Write-Output "Sürüm: $surum"
Write-Output "Klasör: $hedef"
Write-Output "Zip: $zip"
