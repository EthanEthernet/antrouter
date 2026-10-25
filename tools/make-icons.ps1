# Draws the extension icons: a gold ant glyph (ж) on a navy rounded square.
# Usage, from the repo root:  powershell -ExecutionPolicy Bypass -File tools/make-icons.ps1
Add-Type -AssemblyName System.Drawing
$root = Split-Path -Parent $PSScriptRoot
New-Item -ItemType Directory -Force (Join-Path $root 'icons') | Out-Null
$navy = [System.Drawing.ColorTranslator]::FromHtml('#0E1424')
$gold = [System.Drawing.ColorTranslator]::FromHtml('#F5B82E')
foreach ($size in 16, 48, 128) {
  $bmp = New-Object System.Drawing.Bitmap $size, $size
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = 'AntiAlias'; $g.TextRenderingHint = 'AntiAliasGridFit'
  $d = [Math]::Max(4, [int]($size * 0.44)); $e = $size - $d - 1
  $path = New-Object System.Drawing.Drawing2D.GraphicsPath
  $path.AddArc(0, 0, $d, $d, 180, 90); $path.AddArc($e, 0, $d, $d, 270, 90)
  $path.AddArc($e, $e, $d, $d, 0, 90); $path.AddArc(0, $e, $d, $d, 90, 90); $path.CloseFigure()
  $g.FillPath((New-Object System.Drawing.SolidBrush $navy), $path)
  $font = New-Object System.Drawing.Font 'Consolas', ([float]($size * 0.62)), ([System.Drawing.FontStyle]::Bold), ([System.Drawing.GraphicsUnit]::Pixel)
  $fmt = New-Object System.Drawing.StringFormat; $fmt.Alignment = 'Center'; $fmt.LineAlignment = 'Center'
  $g.DrawString([string][char]0x0436, $font, (New-Object System.Drawing.SolidBrush $gold), (New-Object System.Drawing.RectangleF 0, 0, $size, $size), $fmt)
  $bmp.Save((Join-Path $root "icons/icon$size.png"), [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose(); $bmp.Dispose()
}
