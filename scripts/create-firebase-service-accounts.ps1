# Script to create Firebase service accounts using gcloud CLI
# This bypasses the need to access the Firebase Console

$projects = @{
    "dev"     = "fyn-timing-os-dev"
    "staging" = "fyn-timing-os-staging"
    "prod"    = "fyn-timing-os-prod"
}

Write-Host "=== Creating Firebase Service Accounts via gcloud ===" -ForegroundColor Cyan
Write-Host ""

foreach ($env in $projects.Keys) {
    $projectId = $projects[$env]
    $serviceAccountName = "fyn-firebase-admin-$env"
    $serviceAccountEmail = "$serviceAccountName@$projectId.iam.gserviceaccount.com"
    $keyFilePath = "firebase-$env-service-account.json"
    
    Write-Host "Processing $env environment ($projectId)..." -ForegroundColor Yellow
    
    # Check if service account already exists
    $exists = gcloud iam service-accounts describe $serviceAccountEmail --project=$projectId --format="value(email)" 2>$null
    
    if (-not $exists) {
        Write-Host "  Creating service account..." -ForegroundColor White
        gcloud iam service-accounts create $serviceAccountName `
            --project=$projectId `
            --description="Firebase Admin SDK service account for $env environment" `
            --display-name="Firebase Admin SDK ($env)"
        
        if ($LASTEXITCODE -ne 0) {
            Write-Host "  Failed to create service account." -ForegroundColor Red
            continue
        }
        Write-Host "  ✓ Service account created" -ForegroundColor Green
    }
    else {
        Write-Host "  Service account already exists" -ForegroundColor Gray
    }
    
    # Grant Firebase Admin role
    Write-Host "  Granting Firebase Admin role..." -ForegroundColor White
    gcloud projects add-iam-policy-binding $projectId `
        --member="serviceAccount:$serviceAccountEmail" `
        --role="roles/firebase.admin" `
        --quiet
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✓ Firebase Admin role granted" -ForegroundColor Green
    }
    
    # Download the key file
    if (Test-Path $keyFilePath) {
        Write-Host "  Key file already exists: $keyFilePath" -ForegroundColor Gray
        $overwrite = Read-Host "  Overwrite? (y/N)"
        if ($overwrite -ne "y") {
            Write-Host "  Skipping key download" -ForegroundColor Gray
            continue
        }
        Remove-Item $keyFilePath -Force
    }
    
    Write-Host "  Downloading service account key..." -ForegroundColor White
    gcloud iam service-accounts keys create $keyFilePath `
        --iam-account=$serviceAccountEmail `
        --project=$projectId
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✓ Key saved to: $keyFilePath" -ForegroundColor Green
    }
    else {
        Write-Host "  Failed to download key" -ForegroundColor Red
    }
    
    Write-Host ""
}

Write-Host "=== Service Account Creation Complete ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Run: .\scripts\update-secrets-with-firebase.ps1" -ForegroundColor Cyan
Write-Host "  2. Review secrets.json" -ForegroundColor Cyan
Write-Host "  3. Run: .\scripts\deploy-secrets.ps1" -ForegroundColor Cyan
