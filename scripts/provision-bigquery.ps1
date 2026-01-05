$projects = @{
    "dev"     = "fyn-timing-os-dev"
    "staging" = "fyn-timing-os-staging"
    "prod"    = "fyn-timing-os-prod"
}

$datasetName = "fyn_analytics"
$location = "US"

Write-Host "--- Provisioning BigQuery Datasets ---" -ForegroundColor Cyan

foreach ($env in $projects.Keys) {
    $projectId = $projects[$env]
    $fullDatasetName = "${datasetName}_${env}"
    
    Write-Host "Processing Environment: $env ($projectId)" -ForegroundColor Yellow
    
    # Check if dataset exists
    $exists = gcloud bigquery datasets describe $fullDatasetName --project=$projectId --format="value(datasetReference.datasetId)" 2>$null

    if ($exists) {
        Write-Host "  Dataset '$fullDatasetName' already exists in project '$projectId'. Skipping." -ForegroundColor Gray
    }
    else {
        Write-Host "  Creating dataset '$fullDatasetName' in project '$projectId'..."
        bq --project_id=$projectId mk --dataset --location=$location --description="FYN Analytics Dataset for $env" $fullDatasetName
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  Successfully created dataset." -ForegroundColor Green
        }
        else {
            Write-Host "  Failed to create dataset." -ForegroundColor Red
        }
    }
}

Write-Host "--- Provisioning Complete ---" -ForegroundColor Cyan
