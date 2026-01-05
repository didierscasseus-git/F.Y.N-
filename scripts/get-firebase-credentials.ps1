# Script to help retrieve and format Firebase service account credentials

$projects = @{
    "dev"     = "fyn-timing-os-dev"
    "staging" = "fyn-timing-os-staging"
    "prod"    = "fyn-timing-os-prod"
}

Write-Host "=== Firebase Service Account Credential Helper ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "This script will help you retrieve service account JSON for each environment." -ForegroundColor Yellow
Write-Host ""

foreach ($env in $projects.Keys) {
    $projectId = $projects[$env]
    
    Write-Host "Environment: $env" -ForegroundColor Green
    Write-Host "Project ID: $projectId" -ForegroundColor Gray
    Write-Host ""
    Write-Host "To get the service account JSON:" -ForegroundColor White
    Write-Host "  1. Visit: https://console.firebase.google.com/project/$projectId/settings/serviceaccounts/adminsdk" -ForegroundColor Cyan
    Write-Host "  2. Click 'Generate new private key'" -ForegroundColor Cyan
    Write-Host "  3. Save the downloaded JSON file to:" -ForegroundColor Cyan
    Write-Host "     $PSScriptRoot\..\firebase-$env-service-account.json" -ForegroundColor Yellow
    Write-Host ""
}

Write-Host "After downloading all service account files, run:" -ForegroundColor Green
Write-Host "  .\scripts\update-secrets-with-firebase.ps1" -ForegroundColor Cyan
Write-Host ""
