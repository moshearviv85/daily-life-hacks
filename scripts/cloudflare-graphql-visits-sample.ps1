# Sample: call Cloudflare GraphQL Analytics for zone visits (last 7 days by hour).
# Usage (PowerShell):
#   Copy scripts/.env.example to scripts/.env and fill values, then:
#   .\scripts\cloudflare-graphql-visits-sample.ps1
# Or set env vars for this session only:
#   $env:CLOUDFLARE_API_TOKEN = "..."; $env:CLOUDFLARE_ZONE_ID = "..."
#
# Do not commit .env or tokens. Do not echo the token.

$ErrorActionPreference = "Stop"

$envFile = Join-Path $PSScriptRoot ".env"
if (Test-Path $envFile) {
  Get-Content $envFile -Encoding UTF8 | ForEach-Object {
    $line = $_.Trim()
    if ($line -match '^\s*#' -or $line -eq '') { return }
    if ($line -match '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$') {
      $key = $matches[1]
      $val = $matches[2].Trim().Trim('"').Trim("'")
      Set-Item -Path "Env:$key" -Value $val
    }
  }
}

$token = $env:CLOUDFLARE_API_TOKEN
$zone = $env:CLOUDFLARE_ZONE_ID
if (-not $token -or -not $zone) {
  Write-Error "Set CLOUDFLARE_API_TOKEN and CLOUDFLARE_ZONE_ID first."
}

$end = [DateTime]::UtcNow
$start = $end.AddDays(-7)
$geq = $start.ToString("yyyy-MM-ddTHH:mm:ssZ")
$lt = $end.ToString("yyyy-MM-ddTHH:mm:ssZ")

# GraphQL as literal (single-quoted) so $zoneTag / $filter are not expanded by PowerShell.
$gqlQuery = @'
query ZoneVisitsByHour($zoneTag: string, $filter: filter) {
  viewer {
    zones(filter: { zoneTag: $zoneTag }) {
      httpRequestsAdaptiveGroups(limit: 500, filter: $filter) {
        sum {
          visits
          edgeResponseBytes
        }
        dimensions {
          datetimeHour
        }
      }
    }
  }
}
'@

$bodyObject = @{
  query     = $gqlQuery
  variables = @{
    zoneTag = $zone
    filter  = @{
      datetime_geq  = $geq
      datetime_lt   = $lt
      requestSource = "eyeball"
    }
  }
}

$body = $bodyObject | ConvertTo-Json -Depth 10
$headers = @{
  Authorization  = "Bearer $token"
  "Content-Type" = "application/json"
  Accept           = "application/json"
}

$response = Invoke-RestMethod -Uri "https://api.cloudflare.com/client/v4/graphql" -Method Post -Headers $headers -Body $body
$response | ConvertTo-Json -Depth 20
