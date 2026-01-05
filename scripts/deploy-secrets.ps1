$projects = @{
    "dev"     = "fyn-timing-os-dev"
    "staging" = "fyn-timing-os-staging"
    "prod"    = "fyn-timing-os-prod"
}

$secretsFile = "secrets.json"

if (-not (Test-Path $secretsFile)) {
    Write-Host "Error: secrets.json not found. Please copy secrets.template.json to secrets.json and fill in the values." -ForegroundColor Red
    exit 1
}

$config = Get-Content $secretsFile -Raw | ConvertFrom-Json

Write-Host "--- Deploying Secrets to Secret Manager ---" -ForegroundColor Cyan

foreach ($env in $projects.Keys) {
    $projectId = $projects[$env]
    Write-Host "`nProcessing Environment: $env ($projectId)" -ForegroundColor Yellow

    if (-not $config.$env) {
        Write-Host "  No configuration found for environment '$env' in secrets.json. Skipping." -ForegroundColor Gray
        continue
    }

    $envSecrets = $config.$env

    foreach ($key in $envSecrets.PSObject.Properties.Name) {
        $value = $envSecrets.$key
        
        if ([string]::IsNullOrWhiteSpace($value)) {
            Write-Host "  Value for '$key' is empty. Skipping." -ForegroundColor Gray
            continue
        }

        # Check if secret exists
        $exists = gcloud secrets describe $key --project=$projectId --format="value(name)" 2>$null

        if (-not $exists) {
            Write-Host "  Creating secret '$key' in project '$projectId'..."
            gcloud secrets create $key --project=$projectId --replication-policy="automatic" --quiet
        }

        # Add secret version
        Write-Host "  Adding new version to secret '$key'..."
        $value | gcloud secrets versions add $key --project=$projectId --data-file=-
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  Successfully updated secret '$key'." -ForegroundColor Green
        }
        else {
            Write-Host "  Failed to update secret '$key'." -ForegroundColor Red
        }
    }
}

Write-Host "`n--- Secret Deployment Complete ---" -ForegroundColor Cyan
