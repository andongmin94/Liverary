# Installs the Liverary CLI from a GitHub Release archive on Windows. Needs
# only PowerShell 5.1+; no Node, npm, or compiler.
#
#   irm https://raw.githubusercontent.com/andongmin94/Liverary/main/scripts/install.ps1 | iex
#
# Environment:
#   LIVERARY_VERSION           exact stable X.Y.Z version (default: latest stable)
#   T3CODE_HOME                Liverary home directory (default: ~\.liverary)
#   LIVERARY_INSTALL_BIN_DIR   where liverary.cmd is installed (default: ~\.local\bin)
#   LIVERARY_RELEASE_BASE_URL  mirror for releases/download (default: GitHub)
#   T3CODE_* aliases remain supported for existing installations.
#
# The archive is unpacked into $T3CODE_HOME\runtime\versions\<version>, the
# same layout `liverary service install` uses, so the service reuses this download.
$ErrorActionPreference = "Stop"
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$repo = "andongmin94/Liverary"
$baseUrl = if ($env:LIVERARY_RELEASE_BASE_URL) { $env:LIVERARY_RELEASE_BASE_URL.TrimEnd("/") } elseif ($env:T3CODE_RELEASE_BASE_URL) { $env:T3CODE_RELEASE_BASE_URL.TrimEnd("/") } else { "https://github.com/$repo/releases/download" }
$configuredHome = $env:T3CODE_HOME
$liveraryHome = [IO.Path]::GetFullPath($(if ($configuredHome) { $configuredHome } else { Join-Path $HOME ".liverary" }))
$binDir = if ($env:LIVERARY_INSTALL_BIN_DIR) { $env:LIVERARY_INSTALL_BIN_DIR } elseif ($env:T3CODE_INSTALL_BIN_DIR) { $env:T3CODE_INSTALL_BIN_DIR } else { Join-Path $HOME ".local\bin" }
# Absolute, so PATH never gets a folder that changes with the working directory.
$binDir = $ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($binDir)

function Fail([string] $message) {
  Write-Error "liverary install: $message"
  exit 1
}

$terminal = -not [Console]::IsErrorRedirected -and $env:TERM -ne "dumb"
$interactive = $terminal -and $Host.UI.SupportsVirtualTerminal
if ($interactive) {
  # Legacy code pages may support ANSI escapes but not the logo or bar glyphs.
  $glyphs = -join [char[]](0x2588, 0x2580, 0x2584, 0x25A0, 0x00B7)
  $encoding = [Console]::Error.Encoding
  $interactive = $encoding.GetString($encoding.GetBytes($glyphs)) -eq $glyphs
}
$esc = [char]27
$reset = $bold = $muted = $accent = $green = ""
if ($interactive -and -not $env:NO_COLOR) {
  $reset = "$esc[0m"; $bold = "$esc[1m"; $muted = "$esc[2m"
  $accent = "$esc[94m"; $green = "$esc[32m"
}
function Step([string] $message) {
  if ($interactive) { [Console]::Error.Write("`r$esc[2K  $muted$message$reset") }
  else { [Console]::Error.WriteLine("  $message") }
}
function Draw-Download([long] $bytes, [long] $total) {
  if (-not $interactive) { return }
  $columns = [Console]::WindowWidth
  if ($columns -le 0) { $columns = 80 }
  if ($total -gt 0 -and $columns -ge 9) {
    $percent = [Math]::Min(100, [Math]::Floor($bytes * 100.0 / $total))
    $width = [Math]::Min(32, $columns - 8)
    $filled = [int][Math]::Floor($percent * $width / 100)
    $bar = ([string][char]0x25A0) * $filled
    $rest = ([string][char]0x00B7) * ($width - $filled)
    $sizes = ("  {0:F1} / {1:F1} MB" -f ($bytes / 1MB), ($total / 1MB))
    if ($width + 7 + $sizes.Length -ge $columns) { $sizes = "" }
    [Console]::Error.Write(("`r$esc[2K  $accent$bar$reset$muted$rest$reset {0,3}%" -f $percent) + "$muted$sizes$reset")
  } else {
    $line = if ($columns -ge 32) { "  Downloading  {0:F1} MB" -f ($bytes / 1MB) } else { "  {0:F1} MB" -f ($bytes / 1MB) }
    [Console]::Error.Write("`r$esc[2K" + $line.Substring(0, [Math]::Min($line.Length, $columns - 1)))
  }
}
# Waits 1, 2, then 4 s before retrying a 408, 429, 5xx, or network error (status 0).
# Retry-After is ignored so a throttled GitHub cannot stall the install for minutes.
function Wait-Retry([int] $status, [int] $attempt) {
  if ($attempt -ge 4 -or ($status -ge 400 -and $status -lt 500 -and $status -ne 408 -and $status -ne 429)) { return $false }
  Start-Sleep -Seconds ([Math]::Pow(2, $attempt - 1))
  return $true
}
function Invoke-Retrying([scriptblock] $request) {
  for ($attempt = 1; ; $attempt++) {
    try { return & $request }
    catch { if (-not (Wait-Retry ([int]$_.Exception.Response.StatusCode) $attempt)) { throw } }
  }
}
function Fetch([string] $uri, [string] $destination, [switch] $progress) {
  if (-not $progress -or -not $interactive) {
    $ProgressPreference = if ($progress -and $terminal) { "Continue" } else { "SilentlyContinue" }
    Invoke-Retrying { Invoke-WebRequest -Uri $uri -OutFile $destination -UseBasicParsing }
    return
  }
  Add-Type -AssemblyName System.Net.Http
  $client = New-Object System.Net.Http.HttpClient
  $response = $source = $file = $null
  try {
    for ($attempt = 1; ; $attempt++) {
      try { $response = $client.GetAsync($uri, [System.Net.Http.HttpCompletionOption]::ResponseHeadersRead).GetAwaiter().GetResult() }
      catch { if (Wait-Retry 0 $attempt) { continue } throw }
      if ($response.IsSuccessStatusCode -or -not (Wait-Retry ([int]$response.StatusCode) $attempt)) { break }
      $response.Dispose()
    }
    $response.EnsureSuccessStatusCode() | Out-Null
    $source = $response.Content.ReadAsStreamAsync().GetAwaiter().GetResult()
    $file = [IO.File]::Create($destination)
    $buffer = New-Object byte[] 65536
    $bytes = 0L
    $clock = [Diagnostics.Stopwatch]::StartNew()
    Draw-Download 0 $response.Content.Headers.ContentLength
    while (($count = $source.Read($buffer, 0, $buffer.Length)) -gt 0) {
      $file.Write($buffer, 0, $count)
      $bytes += $count
      if ($clock.ElapsedMilliseconds -ge 100) {
        Draw-Download $bytes $response.Content.Headers.ContentLength
        $clock.Restart()
      }
    }
    Draw-Download $bytes $bytes
    [Console]::Error.WriteLine()
  } finally {
    if ($file) { $file.Dispose() }
    if ($source) { $source.Dispose() }
    if ($response) { $response.Dispose() }
    $client.Dispose()
  }
}
if ($interactive) {
  [Console]::Error.WriteLine("`n  ${bold}Liverary$reset`n  ${muted}CLI installer$reset`n")
}
Step "Finding your release..."

# PROCESSOR_ARCHITEW6432 bypasses WOW64 emulation; 5.1 hosts can lack RuntimeInformation's required .NET version.
$rawArch = if ($env:PROCESSOR_ARCHITEW6432) { $env:PROCESSOR_ARCHITEW6432 } else { $env:PROCESSOR_ARCHITECTURE }
$arch = switch ($rawArch) {
  "AMD64" { "x64" }
  "ARM64" { "arm64" }
  default { Fail "unsupported architecture $rawArch" }
}

$version = if ($env:LIVERARY_VERSION) { $env:LIVERARY_VERSION } else { $env:T3CODE_VERSION }
if (-not $version) {
  $release = Invoke-Retrying { Invoke-RestMethod -Uri "https://github.com/$repo/releases/latest" -Headers @{ "User-Agent" = "liverary-install"; "Accept" = "application/json" } }
  $tag = ($release | Where-Object { $_.tag_name -match '^v\d+\.\d+\.\d+$' }).tag_name
  if (-not $tag) { Fail "could not find a stable release; set LIVERARY_VERSION" }
  $version = $tag.Substring(1)
}
if ($version -notmatch '^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$') {
  Fail "LIVERARY_VERSION must be a stable X.Y.Z version"
}

$stem = "liverary-$version-win32-$arch"
$archive = "$stem.zip"
$versionsDir = Join-Path $liveraryHome "runtime\versions"
$targetDir = Join-Path $versionsDir $version
$marker = Join-Path $targetDir ".install-complete"

if ((Test-Path -LiteralPath $marker) -and ((Get-Content -LiteralPath $marker -Raw).Trim() -eq $version)) {
  Step "Version $version is already downloaded."
  $cached = Join-Path $targetDir "liverary.exe"
  if (-not $configuredHome -and (Test-Path -LiteralPath $cached)) {
    & $cached __migrate-home (Join-Path $HOME '.t3-custom') $liveraryHome
    if ($LASTEXITCODE -ne 0) { Fail "could not migrate the existing Liverary home" }
  }
} else {
  $temporaryRoot = [IO.Path]::GetFullPath([IO.Path]::GetTempPath()).TrimEnd([IO.Path]::DirectorySeparatorChar)
  $staging = [IO.Path]::GetFullPath((Join-Path $temporaryRoot ("liverary-install-" + [IO.Path]::GetRandomFileName())))
  if (-not $staging.StartsWith($temporaryRoot + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) { Fail "invalid installation staging directory" }
  New-Item -ItemType Directory -Path $staging | Out-Null
  try {
    $shimPath = (Resolve-Path -LiteralPath $shim).Path
if ($interactive) { [Console]::Error.Write("`r$esc[2K") }
    [Console]::Error.WriteLine("  ${muted}Installing$reset Liverary $bold$version$reset`n")
    Step "Downloading..."
    $checksumsPath = Join-Path $staging "SHA256SUMS"
    try {
      Fetch "$baseUrl/v$version/SHA256SUMS" $checksumsPath
    } catch {
      $status = $_.Exception.Response.StatusCode.value__
      if ($status -eq 404) {
        Fail "Liverary $version has no release archive for win32-$arch; choose a supported version at https://github.com/$repo/releases"
      }
      throw
    }
    $canonicalRelease = $true
    $checksums = Get-Content -LiteralPath $checksumsPath
    $expected = $checksums | Where-Object { $_ -match "\s\*?$([regex]::Escape($archive))$" } | Select-Object -First 1
    if (-not $expected) {
      $canonicalRelease = $false
      $stem = "t3-$version-win32-$arch"
      $archive = "$stem.zip"
      $expected = $checksums | Where-Object { $_ -match "\s\*?$([regex]::Escape($archive))$" } | Select-Object -First 1
    }
    if (-not $expected) { Fail "$archive is not listed in SHA256SUMS" }
    $archivePath = Join-Path $staging $archive
    Fetch "$baseUrl/v$version/$archive" $archivePath -progress

    Step "Verifying the download..."
    $expected = ($expected -split "\s+")[0].ToLowerInvariant()
    $actual = (Get-FileHash -LiteralPath $archivePath -Algorithm SHA256).Hash.ToLowerInvariant()
    if ($actual -ne $expected) { Fail "checksum mismatch for $archive" }

    Step "Extracting Liverary..."
    $savedProgress = $global:ProgressPreference
    try {
      $global:ProgressPreference = "SilentlyContinue"
      Expand-Archive -LiteralPath $archivePath -DestinationPath $staging -Force
    } finally { $global:ProgressPreference = $savedProgress }
    $extracted = [IO.Path]::GetFullPath((Join-Path $staging $stem))
    foreach ($stagedPath in @($extracted, $archivePath, $checksumsPath)) {
      if (-not ([IO.Path]::GetFullPath($stagedPath)).StartsWith($staging + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) { Fail "invalid extracted archive path" }
    }
    Get-ChildItem -LiteralPath $extracted | ForEach-Object { Move-Item -LiteralPath $_.FullName -Destination $staging }
    Remove-Item -LiteralPath $extracted, $archivePath, $checksumsPath -Recurse -Force

    $entryName = if ($canonicalRelease) { 'liverary.exe' } else { 't3.exe' }
    $downloaded = Join-Path $staging $entryName
    & $downloaded --version | Out-Null
    if ($LASTEXITCODE -ne 0) { Fail "the downloaded executable does not run" }
    if (-not $configuredHome) {
      if ($canonicalRelease) {
        & $downloaded __migrate-home (Join-Path $HOME '.t3-custom') $liveraryHome
        if ($LASTEXITCODE -ne 0) { Fail "could not migrate the existing Liverary home" }
      } else { $liveraryHome = Join-Path $HOME '.t3-custom' }
    }
    $versionsDir = [IO.Path]::GetFullPath((Join-Path $liveraryHome "runtime\versions"))
    $targetDir = [IO.Path]::GetFullPath((Join-Path $versionsDir $version))
    if (-not $targetDir.StartsWith($versionsDir + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) { Fail "invalid runtime version directory" }
    New-Item -ItemType Directory -Force -Path $versionsDir | Out-Null
    if (Test-Path -LiteralPath $targetDir) { Remove-Item -LiteralPath $targetDir -Recurse -Force }
    Move-Item -LiteralPath $staging -Destination $targetDir
    Set-Content -LiteralPath (Join-Path $targetDir ".install-complete") -Value $version -NoNewline
  } catch {
    if (Test-Path -LiteralPath $staging) { Remove-Item -LiteralPath $staging -Recurse -Force }
    throw
  }
}

Step "Setting up the liverary command..."
New-Item -ItemType Directory -Force -Path $binDir | Out-Null
$entry = Join-Path $targetDir 'liverary.exe'
if (-not (Test-Path -LiteralPath $entry)) { $entry = Join-Path $targetDir 't3.exe' }
$shim = Join-Path $binDir 'liverary.cmd'
# Replace only a shim that runs a version in this home; never the desktop app's or another liverary.
if (Test-Path -LiteralPath $shim) {
  $existingTarget = ""
  # The shim is UTF-8 without a BOM; Windows PowerShell 5.1 reads files as ANSI by default.
  # Only a shim exactly as written here counts; a user's wrapper that also runs t3.exe does not.
  $existing = [System.IO.File]::ReadAllText($shim, [System.Text.Encoding]::UTF8)
  if ($existing -match '^@echo off\r?\n"([^"]+)" %\*\s*$') { $existingTarget = $Matches[1] }
  # Full paths, so a target like versions\..\other cannot pass as ours.
  $ownedPrefix = [System.IO.Path]::GetFullPath($versionsDir).TrimEnd('\', '/') + [System.IO.Path]::DirectorySeparatorChar
  if ($existingTarget) { $existingTarget = [System.IO.Path]::GetFullPath($existingTarget) }
  # Exactly <version>\t3.exe, never another program inside a version.
  $owned = $existingTarget.StartsWith($ownedPrefix, [System.StringComparison]::OrdinalIgnoreCase) -and
    ($existingTarget.Substring($ownedPrefix.Length) -match '^[^\\/]+\\(?:liverary|t3)\.exe$')
  if (-not $owned) {
    Fail "another liverary is already at $shim. Remove it and run this again, or run $(Join-Path $targetDir 'liverary.exe') directly."
  }
}
[IO.File]::WriteAllText($shim, "@echo off`r`n`"$entry`" %*", (New-Object System.Text.UTF8Encoding $false))
$legacyShim = Join-Path $binDir 't3.cmd'
if (Test-Path -LiteralPath $legacyShim) {
  $homes = @($liveraryHome, (Join-Path $HOME '.t3-custom')) | ForEach-Object { [regex]::Escape((Join-Path $_ 'runtime\versions')) }
  $pattern = '(?s)^@echo off\r?\n"(?:' + ($homes -join '|') + ')\\(?!\.{1,2}\\)[^\\/"\r\n]+\\(?:liverary|t3)\.exe" %\*\s*$'
  if ([IO.File]::ReadAllText($legacyShim, [Text.Encoding]::UTF8) -match $pattern) {
    Remove-Item -LiteralPath $legacyShim
  }
}
$launchers = Join-Path $liveraryHome "runtime\launchers"
$shimPath = (Resolve-Path -LiteralPath $shim).Path
if (-not ((Test-Path -LiteralPath $launchers) -and ((Get-Content -LiteralPath $launchers) -contains $shimPath))) {
  [IO.File]::AppendAllText($launchers, "$shimPath`r`n", (New-Object System.Text.UTF8Encoding $false))
}
if ($interactive) { [Console]::Error.Write("`r$esc[2K") }
[Console]::Error.WriteLine("  ${green}Installed Liverary $version$reset`n")
if ($binDir.Contains(";")) {
  # PATH would split the folder at the `;`, so name the command in full instead.
  Write-Host "  Run ${bold}& '$($shim.Replace("'", "''"))'$reset to get started.`n"
} else {
  # Either side may end in a separator. Trim only here: a drive root keeps its `\` for Join-Path.
  $added = ($env:PATH -split ";" | ForEach-Object { $_.TrimEnd('\', '/') }) -notcontains $binDir.TrimEnd('\', '/')
  # `irm | iex` runs in the user's own session, so liverary works in this window right away.
  # Last, so it never shadows another liverary.
  if ($added) { $env:Path = "$env:Path;$binDir" }
  # A liverary earlier on PATH runs instead, so name this one in full.
  $first = Get-Command liverary -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($first -and [System.IO.Path]::GetFullPath($first.Source) -ne [System.IO.Path]::GetFullPath($shimPath)) {
    Write-Host "  Another liverary at $($first.Source) runs first, so run ${bold}& '$($shim.Replace("'", "''"))'$reset to use this one.`n"
  } elseif ($added) {
    Write-Host "  Run ${bold}liverary$reset to get started. For new windows, add $binDir to your PATH.`n"
  } else {
    Write-Host "  Run ${bold}liverary$reset to use Liverary here, or ${bold}liverary up$reset to use it from your other devices.`n"
  }
}
