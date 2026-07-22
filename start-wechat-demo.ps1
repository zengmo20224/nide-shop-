param(
  [string]$PublicBaseUrl = "",
  [string]$CpolarPath = "F:\cpolar.exe"
)

$ErrorActionPreference = "Stop"
$OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Root

function Write-Section($Text) {
  Write-Host ""
  Write-Host "========================================="
  Write-Host " $Text"
  Write-Host "========================================="
}

function Get-EnvValue($Name) {
  $envPath = Join-Path $Root ".env"
  if (!(Test-Path $envPath)) {
    return ""
  }

  $line = Get-Content -Path $envPath -Encoding UTF8 |
    Where-Object { $_ -match "^\s*$([regex]::Escape($Name))\s*=" } |
    Select-Object -First 1

  if (!$line) {
    return ""
  }

  return (($line -split "=", 2)[1]).Trim().Trim('"').Trim("'")
}

function Get-BaseUrlFromEnv {
  $redirect = Get-EnvValue "WECHAT_OAUTH_REDIRECT_URL"
  if (!$redirect) {
    return ""
  }

  return $redirect -replace "/api/wechat/oauthCallback/?$", ""
}

function Set-EnvValue($Name, $Value) {
  $envPath = Join-Path $Root ".env"
  if (!(Test-Path $envPath)) {
    return
  }

  $lines = Get-Content -Path $envPath -Encoding UTF8
  $found = $false
  $updated = $lines | ForEach-Object {
    if ($_ -match "^\s*$([regex]::Escape($Name))\s*=") {
      $found = $true
      "$Name=$Value"
    } else {
      $_
    }
  }

  if (!$found) {
    $updated += "$Name=$Value"
  }

  Set-Content -Path $envPath -Value $updated -Encoding UTF8
}

function Get-LatestCpolarUrlFromLog($Path) {
  if (!(Test-Path $Path)) {
    return ""
  }

  $text = Get-Content -Path $Path -Raw -Encoding UTF8
  $matches = [regex]::Matches($text, "https://[a-zA-Z0-9-]+\.r16\.cpolar\.top")
  if ($matches.Count -eq 0) {
    return ""
  }

  return $matches[$matches.Count - 1].Value
}

function Start-CpolarWebsiteTunnel {
  param([string]$ExePath)

  if (!(Test-Path $ExePath)) {
    return ""
  }

  $out = Join-Path $Root "cpolar-current.out.log"
  $err = Join-Path $Root "cpolar-current.err.log"
  Remove-Item $out, $err -ErrorAction SilentlyContinue

  Write-Host "[INFO] Starting cpolar tunnel named 'website'..."
  Start-Process -FilePath $ExePath -ArgumentList @("start", "website", "-log=stdout") -WindowStyle Hidden -RedirectStandardOutput $out -RedirectStandardError $err | Out-Null

  for ($i = 0; $i -lt 15; $i++) {
    Start-Sleep -Seconds 1
    $url = Get-LatestCpolarUrlFromLog $out
    if ($url) {
      return $url
    }
  }

  return ""
}

function New-WechatSignature($Token, $Timestamp, $Nonce) {
  $str = ($Token, $Timestamp, $Nonce | Sort-Object) -join ""
  $sha = [System.Security.Cryptography.SHA1]::Create()
  return ($sha.ComputeHash([Text.Encoding]::UTF8.GetBytes($str)) | ForEach-Object { $_.ToString("x2") }) -join ""
}

function Test-WechatVerify($BaseUrl) {
  $token = Get-EnvValue "WECHAT_OFFICIAL_TOKEN"
  if (!$token) {
    $token = "nideshop"
  }

  $timestamp = [string][int][double]::Parse((Get-Date -UFormat %s))
  $nonce = "demo"
  $echostr = "wechat_demo_ok"
  $signature = New-WechatSignature $token $timestamp $nonce
  $url = "$BaseUrl/api/wechat/verify?signature=$signature&timestamp=$timestamp&nonce=$nonce&echostr=$echostr"

  $response = Invoke-WebRequest -Uri $url -Method GET -UseBasicParsing -TimeoutSec 20
  return ($response.StatusCode -eq 200 -and $response.Content -eq $echostr)
}

Write-Section "NideShop WeChat Demo Startup"
Write-Host "[DATA SAFETY] This script uses Docker Compose and keeps MySQL data in volume: nideshop_mysql_data"
Write-Host "[DATA SAFETY] It will NOT run docker compose down -v."

Write-Section "1. Start Docker Services"
docker compose up -d --build
Write-Host ""
docker compose ps

Write-Section "2. Check Local Website"
Start-Sleep -Seconds 5
try {
  $homeResponse = Invoke-WebRequest -Uri "http://localhost" -UseBasicParsing -TimeoutSec 20
  Write-Host "[OK] Local H5 site: http://localhost ($($homeResponse.StatusCode))"
} catch {
  Write-Host "[WARN] Local H5 site check failed: $($_.Exception.Message)"
}

try {
  if (Test-WechatVerify "http://localhost") {
    Write-Host "[OK] Local WeChat verify API: http://localhost/api/wechat/verify"
  } else {
    Write-Host "[WARN] Local WeChat verify API did not return the expected echostr."
  }
} catch {
  Write-Host "[WARN] Local WeChat verify API check failed: $($_.Exception.Message)"
}

Write-Section "3. Start Or Reuse Cpolar"
$cpolarRunning = @(Get-Process cpolar -ErrorAction SilentlyContinue).Count -gt 0
if ($cpolarRunning) {
  Write-Host "[OK] cpolar is already running."
} elseif (Test-Path $CpolarPath) {
  Write-Host "[INFO] Starting cpolar tunnel named 'website' from your cpolar config..."
  Start-Process -FilePath $CpolarPath -ArgumentList @("start", "website") -WindowStyle Hidden
  Start-Sleep -Seconds 8
} else {
  Write-Host "[WARN] cpolar executable was not found at: $CpolarPath"
  Write-Host "       Start cpolar manually and map public HTTPS domain to local port 80."
}

if (!$PublicBaseUrl) {
  $PublicBaseUrl = Get-BaseUrlFromEnv
}

if ($PublicBaseUrl) {
  Write-Section "4. Check Public WeChat URL"
  try {
    if (Test-WechatVerify $PublicBaseUrl) {
      Write-Host "[OK] Public WeChat verify API: $PublicBaseUrl/api/wechat/verify"
    } else {
      Write-Host "[WARN] Public WeChat verify API did not return the expected echostr."
    }
  } catch {
    Write-Host "[WARN] Public URL check failed: $($_.Exception.Message)"
    Write-Host "       Trying to start a fresh cpolar website tunnel..."
    $newPublicBaseUrl = Start-CpolarWebsiteTunnel $CpolarPath
    if ($newPublicBaseUrl) {
      $PublicBaseUrl = $newPublicBaseUrl
      Set-EnvValue "WECHAT_OAUTH_REDIRECT_URL" "$PublicBaseUrl/api/wechat/oauthCallback"
      Start-Sleep -Seconds 2
      if (Test-WechatVerify $PublicBaseUrl) {
        Write-Host "[OK] New Public WeChat verify API: $PublicBaseUrl/api/wechat/verify"
        Write-Host "[INFO] .env has been updated with the new cpolar domain."
        Write-Host "[ACTION] Update the WeChat test account URL to this new domain."
      } else {
        Write-Host "[WARN] New cpolar domain was found, but the verify API check still failed."
      }
    } else {
      Write-Host "       If cpolar generated a new domain, update .env and WeChat test account URL."
    }
  }
} else {
  Write-Host "[WARN] PublicBaseUrl is empty. Pass it like:"
  Write-Host "       .\start-wechat-demo.ps1 -PublicBaseUrl https://your-domain"
}

Write-Section "Ready For Test Account"
Write-Host "H5 mobile site:  http://localhost"
Write-Host "Admin site:      http://localhost/admin/"
if ($PublicBaseUrl) {
  Write-Host "Public H5 site:  $PublicBaseUrl/#/home"
  Write-Host "WeChat test URL: $PublicBaseUrl/api/wechat/verify"
}
Write-Host "WeChat token:    nideshop"
Write-Host ""
Write-Host "In WeChat test account, send these keywords:"
Write-Host "  home / order / me / category / help"
Write-Host "  Chinese keywords are listed in README and docs."
Write-Host ""
Write-Host "Safe stop command:"
Write-Host "  docker compose stop"
