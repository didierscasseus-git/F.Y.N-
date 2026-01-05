# Script to automatically update secrets.json with Firebase service account credentials

$secretsPath = "secrets.json"
$environments = @("dev", "staging", "prod")

if (-not (Test-Path $secretsPath)) {
    Write-Host "Error: secrets.json not found!" -ForegroundColor Red
    exit 1
}

Write-Host "=== Updating secrets.json with Firebase credentials ===" -ForegroundColor Cyan
Write-Host ""

# Load existing secrets
$secrets = Get-Content $secretsPath -Raw | ConvertFrom-Json

foreach ($env in $environments) {
    $serviceAccountFile = "firebase-$env-service-account.json"
    
    if (Test-Path $serviceAccountFile) {
        Write-Host "Processing $env environment..." -ForegroundColor Yellow
        
        # Read the service account JSON and minify it (remove whitespace)
        $serviceAccountJson = Get-Content $serviceAccountFile -Raw | ConvertFrom-Json | ConvertTo-Json -Compress -Depth 10
        
        # Update the secrets object
        $secrets.$env.FIREBASE_SERVICE_ACCOUNT_JSON = $serviceAccountJson
        
        Write-Host "  ✓ Updated FIREBASE_SERVICE_ACCOUNT_JSON for $env" -ForegroundColor Green
    }
    else {
        Write-Host "  ⚠ Service account file not found: $serviceAccountFile" -ForegroundColor Gray
        Write-Host "    Skipping $env environment" -ForegroundColor Gray
    }
}

# Save updated secrets
$secrets | ConvertTo-Json -Depth 10 | Set-Content $secretsPath

Write-Host ""
Write-Host "Secrets updated successfully!" -ForegroundColor Green
Write-Host "Review secrets.json and then run:" -ForegroundColor Cyan
Write-Host "  .\scripts\deploy-secrets.ps1" -ForegroundColor White
