# Complete Secret Deployment Script
# This script deploys all secrets from secrets.json to Google Cloud Secret Manager

param(
    [string]$Environment = "dev"
)

$projectMap = @{
    "dev"     = "fyn-timing-os-dev"
    "staging" = "fyn-timing-os-staging"
    "prod"    = "fyn-timing-os-prod"
}

$projectId = $projectMap[$Environment]

if (-not $projectId) {
    Write-Host "Invalid environment. Use: dev, staging, or prod" -ForegroundColor Red
    exit 1
}

Write-Host "=== Deploying Secrets to $projectId ===" -ForegroundColor Cyan

# Load secrets
$secrets = Get-Content "secrets.json" | ConvertFrom-Json
$envSecrets = $secrets.$Environment

# Deploy each secret
foreach ($key in $envSecrets.PSObject.Properties.Name) {
    $value = $envSecrets.$key
    
    # Skip empty or placeholder values
    if ([string]::IsNullOrWhiteSpace($value) -or $value -like "REPLACE_WITH*") {
        Write-Host "Skipping $key (empty or placeholder)" -ForegroundColor Gray
        continue
    }
    
    Write-Host "`nDeploying $key..." -ForegroundColor Yellow
    
    # Check if secret exists
    $exists = gcloud secrets describe $key --project=$projectId 2>$null
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  Creating secret $key..." -ForegroundColor White
        gcloud secrets create $key --project=$projectId --replication-policy=automatic
    }
    
    # Add version
    Write-Host "  Adding secret version..." -ForegroundColor White
    $value | gcloud secrets versions add $key --project=$projectId --data-file=-
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✓ Successfully deployed $key" -ForegroundColor Green
    }
    else {
        Write-Host "  ✗ Failed to deploy $key" -ForegroundColor Red
    }
}

Write-Host "`n=== Deployment Complete ===" -ForegroundColor Cyan
