$env:MODEL_PATH="$PSScriptRoot\artifacts\model.pkl"
$env:VECTORIZER_PATH="$PSScriptRoot\artifacts\vectorizer.pkl"
$env:ML_SERVICE_TOKEN="<YOUR_ML_SERVICE_TOKEN>"

Write-Host "Starting FakeNews ML service..." -ForegroundColor Cyan

python -m uvicorn app.main:app --app-dir $PSScriptRoot --host 0.0.0.0 --port 8000