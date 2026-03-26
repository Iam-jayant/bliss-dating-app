param(
  [ValidateSet('testnet','mainnet')]
  [string]$Network = 'testnet',
  [string]$ApiUrl = 'https://api.explorer.provable.com/v2',
  [int]$ConsensusVersion = 11,
  [switch]$SkipDeploy,
  [switch]$SkipClean,
  [string[]]$Only = @()
)

$ErrorActionPreference = 'Stop'
$PSNativeCommandUseErrorActionPreference = $false
$workspaceRoot = Resolve-Path (Join-Path $PSScriptRoot '..\..')
$aleoHome = Join-Path $workspaceRoot '.aleo'
New-Item -ItemType Directory -Force $aleoHome | Out-Null
$deployPrivateKey = if ($env:ALEO_PRIVATE_KEY) { $env:ALEO_PRIVATE_KEY } elseif ($env:PRIVATE_KEY) { $env:PRIVATE_KEY } else { $null }

if (-not $deployPrivateKey) {
  $rootEnvPath = Join-Path $workspaceRoot '.env'
  if (Test-Path $rootEnvPath) {
    $privateKeyLine = Get-Content -Path $rootEnvPath | Where-Object { $_ -match '^\s*PRIVATE_KEY\s*=' } | Select-Object -First 1
    if ($privateKeyLine) {
      $deployPrivateKey = (($privateKeyLine -split '=', 2)[1]).Trim()
    }
  }
}

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
  $redacted = [regex]::Replace($redacted, '(?im)^(\s*-\s*[A-Z0-9_]+)=.*$', '$1=[REDACTED]')
  $redacted = [regex]::Replace($redacted, '(?im)^\s*PRIVATE_KEY\s*=\s*.+$', 'PRIVATE_KEY=[REDACTED_PRIVATE_KEY]')
  $redacted = [regex]::Replace($redacted, '(?im)(Private Key:\s+)\S+', '$1[REDACTED_PRIVATE_KEY]')

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
}
else {
  $contracts = $allContracts
}

$deploymentRows = @()
$failedContracts = @()

foreach ($contract in $contracts) {
  if (-not (Test-Path $contract)) {
    throw "Contract directory not found: $contract"
  }

  $status = 'success'
  $errorMessage = $null
  $programId = $null
  $txId = $null
  $feeId = $null
  $feeTxId = $null
  $deployOutput = @()
  $temporaryEnvCreated = $false
  $contractAbsolutePath = Resolve-Path $contract
  $contractEnvPath = Join-Path $contractAbsolutePath '.env'

  Push-Location $contract
  try {
    if (-not (Test-Path $contractEnvPath)) {
      $envLines = @(
        "NETWORK=$Network",
        "ENDPOINT=$ApiUrl"
      )

      if ($deployPrivateKey) {
        $envLines += "PRIVATE_KEY=$deployPrivateKey"
      }

      Set-Content -Path $contractEnvPath -Value ($envLines -join "`n")
      $temporaryEnvCreated = $true
      Write-Host "Created temporary contract .env for $contract" -ForegroundColor DarkGray
    }

    if (-not $SkipClean) {
      Write-Host "Cleaning $contract" -ForegroundColor DarkCyan
      $cleanResult = Invoke-LeoCommand -Arguments @('clean', '--home', $aleoHome)
      (Redact-SensitiveOutput -Text ($cleanResult.output -join "`n")) | Out-Host
      if ($cleanResult.exitCode -ne 0) {
        throw "leo clean failed for $contract (exit code $($cleanResult.exitCode))"
      }
    }

    Write-Host "Building $contract" -ForegroundColor Cyan
    $buildResult = Invoke-LeoCommand -Arguments @('build', '--home', $aleoHome)
    (Redact-SensitiveOutput -Text ($buildResult.output -join "`n")) | Out-Host
    if ($buildResult.exitCode -ne 0) {
      throw "leo build failed for $contract (exit code $($buildResult.exitCode))"
    }

    $programJsonPath = Join-Path (Get-Location) 'program.json'
    if (Test-Path $programJsonPath) {
      $programId = (Get-Content -Raw $programJsonPath | ConvertFrom-Json).program
    }

    if (-not $SkipDeploy) {
      Write-Host "Deploying $contract" -ForegroundColor Yellow

      $args = @(
        'deploy',
        '--network', $Network,
        '--endpoint', $ApiUrl,
        '--home', $aleoHome,
        '--consensus-version', $ConsensusVersion.ToString(),
        '--broadcast',
        '--yes'
      )

      if ($deployPrivateKey) {
        $args += @('--private-key', $deployPrivateKey)
      }

      if ($env:LEO_DEPLOY_EXTRA_ARGS) {
        $args += ($env:LEO_DEPLOY_EXTRA_ARGS -split ' ' | Where-Object { $_ -and $_.Trim() })
      }

      $deployResult = Invoke-LeoCommand -Arguments $args
      $deployOutput = $deployResult.output
      (Redact-SensitiveOutput -Text ($deployOutput -join "`n")) | Out-Host

      if ($deployResult.exitCode -ne 0) {
        throw "leo deploy failed for $contract (exit code $($deployResult.exitCode))"
      }

      $outputText = ($deployOutput | Out-String)
      if ($outputText -match "transaction ID:\s*'?(at1[0-9a-z]+)'?") {
        $txId = $matches[1]
      }
      elseif ($outputText -match '(at1[0-9a-z]+)') {
        $txId = $matches[1]
      }

      if ($outputText -match "fee ID:\s*'?(au1[0-9a-z]+)'?") {
        $feeId = $matches[1]
      }

      if ($outputText -match "fee transaction ID:\s*'?(at1[0-9a-z]+)'?") {
        $feeTxId = $matches[1]
      }

      if (-not $txId) {
        Write-Warning "Could not parse deployment tx id for $contract. Inspect deploy output in artifact."
      }
    }
  }
  catch {
    $status = 'failed'
    $errorMessage = $_.Exception.Message
    $failedContracts += $contract
    Write-Host "Deployment failed for ${contract}: $errorMessage" -ForegroundColor Red
  }
  finally {
    if ($temporaryEnvCreated -and (Test-Path $contractEnvPath)) {
      Remove-Item -Path $contractEnvPath -Force
      Write-Host "Removed temporary contract .env for $contract" -ForegroundColor DarkGray
    }

    Pop-Location

    $deploymentRows += [pscustomobject]@{
      contract = $contract
      status = $status
      programId = $programId
      transactionId = $txId
      feeId = $feeId
      feeTransactionId = $feeTxId
      network = $Network
      apiUrl = $ApiUrl
      consensusVersion = $ConsensusVersion
      deployedAt = (Get-Date).ToString('o')
      error = $errorMessage
      deployOutput = (Redact-SensitiveOutput -Text ($deployOutput -join "`n"))
    }
  }
}

$artifactDir = 'contracts/deployment-artifacts'
New-Item -ItemType Directory -Force $artifactDir | Out-Null
$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$artifactPath = Join-Path $artifactDir "deployment-$Network-$timestamp.json"

$artifact = [pscustomobject]@{
  generatedAt = (Get-Date).ToString('o')
  network = $Network
  apiUrl = $ApiUrl
  consensusVersion = $ConsensusVersion
  skippedClean = [bool]$SkipClean
  deployed = (-not $SkipDeploy)
  failedContracts = $failedContracts
  contracts = $deploymentRows
}

$artifact | ConvertTo-Json -Depth 10 | Set-Content $artifactPath
Write-Host "Deployment artifact written: $artifactPath" -ForegroundColor Green

if ($failedContracts.Count -gt 0) {
  throw "Deployment finished with failures: $($failedContracts -join ', ')"
}
