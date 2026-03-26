param(
  [ValidateSet('testnet','mainnet')]
  [string]$Network = 'testnet',
  [switch]$SkipClean,
  [string[]]$Only = @()
)

$ErrorActionPreference = 'Stop'
$PSNativeCommandUseErrorActionPreference = $false
$workspaceRoot = Resolve-Path (Join-Path $PSScriptRoot '..\..')
$aleoHome = Join-Path $workspaceRoot '.aleo'
New-Item -ItemType Directory -Force $aleoHome | Out-Null

function Invoke-LeoCommand {
  param(
    [Parameter(Mandatory = $true)]
    [string[]]$Arguments
  )

  $escapedArgs = $Arguments | ForEach-Object {
    if ($_ -match '\s') { '"' + $_ + '"' } else { $_ }
  }

  $command = "leo $($escapedArgs -join ' ') 2>&1"
  $output = cmd /c $command
  $exitCode = $LASTEXITCODE

  return [pscustomobject]@{
    command = "leo $($escapedArgs -join ' ')"
    output = @($output)
    exitCode = $exitCode
  }
}

function Redact-SensitiveOutput {
  param(
    [string]$Text
  )

  if (-not $Text) {
    return $Text
  }

  $redacted = $Text
  $redacted = [regex]::Replace($redacted, 'APrivateKey1[0-9a-zA-Z]+', '[REDACTED_PRIVATE_KEY]')
  $redacted = [regex]::Replace($redacted, '(?im)^\s*([-*])\s*([A-Z0-9_]+)=.*$', '$1 $2=[REDACTED]')
  $redacted = [regex]::Replace($redacted, '(?im)^\s*PRIVATE_KEY\s*=\s*.+$', 'PRIVATE_KEY=[REDACTED_PRIVATE_KEY]')
  $redacted = [regex]::Replace($redacted, '(?im)^\s*NEXT_PUBLIC_PINATA_JWT\s*=\s*.+$', 'NEXT_PUBLIC_PINATA_JWT=[REDACTED]')
  $redacted = [regex]::Replace($redacted, '(?im)^\s*PINATA_JWT\s*=\s*.+$', 'PINATA_JWT=[REDACTED]')

  return $redacted
}

$allContracts = @(
  'contracts/age_verification',
  'contracts/profile_verification',
  'contracts/compatibility_matching',
  'contracts/subscription_access'
)

if ($Only.Count -gt 0) {
  $selected = @()
  foreach ($contract in $allContracts) {
    $leaf = Split-Path $contract -Leaf
    if ($Only -contains $contract -or $Only -contains $leaf) {
      $selected += $contract
    }
  }

  if ($selected.Count -eq 0) {
    throw "No contracts matched --Only values: $($Only -join ', ')"
  }

  $contracts = $selected
} else {
  $contracts = $allContracts
}

$results = @()

foreach ($contract in $contracts) {
  if (-not (Test-Path $contract)) {
    throw "Contract directory not found: $contract"
  }

  Write-Host "Building $contract" -ForegroundColor Cyan
  Push-Location $contract
  try {
    if (-not $SkipClean) {
      Write-Host "Cleaning $contract" -ForegroundColor DarkCyan
      $cleanResult = Invoke-LeoCommand -Arguments @('clean', '--home', $aleoHome)
      (Redact-SensitiveOutput -Text ($cleanResult.output -join "`n")) | Out-Host
      if ($cleanResult.exitCode -ne 0) {
        throw "leo clean failed for $contract"
      }
    }

    $buildResult = Invoke-LeoCommand -Arguments @('build', '-q', '--home', $aleoHome)
    (Redact-SensitiveOutput -Text ($buildResult.output -join "`n")) | Out-Host
    if ($buildResult.exitCode -ne 0) {
      throw "leo build failed for $contract"
    }

    $programJsonPath = Join-Path (Get-Location) 'program.json'
    $programId = $null
    if (Test-Path $programJsonPath) {
      $programId = (Get-Content -Raw $programJsonPath | ConvertFrom-Json).program
    }

    $results += [pscustomobject]@{
      contract = $contract
      programId = $programId
      builtAt = (Get-Date).ToString('o')
      network = $Network
    }
  }
  finally {
    Pop-Location
  }
}

$artifactDir = 'contracts/deployment-artifacts'
New-Item -ItemType Directory -Force $artifactDir | Out-Null
$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$artifactPath = Join-Path $artifactDir "build-$Network-$timestamp.json"

$artifact = [pscustomobject]@{
  generatedAt = (Get-Date).ToString('o')
  network = $Network
  skippedClean = [bool]$SkipClean
  contracts = $results
}

$artifact | ConvertTo-Json -Depth 10 | Set-Content $artifactPath
Write-Host "Build artifact written: $artifactPath" -ForegroundColor Green
