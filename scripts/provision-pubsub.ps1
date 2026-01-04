# FYN Timing OS - Pub/Sub Provisioning Script (B1)
# Environments: dev, staging, prod

$projects = @("fyn-timing-os-dev", "fyn-timing-os-staging", "fyn-timing-os-prod")
$topics = @(
    "pos.events",
    "inventory.events",
    "table.events",
    "reservation.events",
    "analytics.events",
    "notification.events",
    "ar.events"
)

foreach ($project in $projects) {
    Write-Host "`n--- Processing Project: $project ---" -ForegroundColor Cyan
    
    # Check if project exists/accessible
    $check = gcloud projects describe $project --quiet 2>$null
    if ($null -eq $check) {
        Write-Warning "Project $project not found or not accessible. Skipping."
        continue
    }

    foreach ($topic in $topics) {
        Write-Host "Creating topic: $topic in $project..."
        gcloud pubsub topics create $topic --project=$project
    }
}

Write-Host "`nPub/Sub Provisioning Complete!" -ForegroundColor Green
