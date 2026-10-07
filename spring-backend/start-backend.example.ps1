$env:DB_URL="jdbc:postgresql://localhost:<YOUR_DB_PORT>/fakenews"
$env:DB_USERNAME="<YOUR_DATABASE_USERNAME>"
$env:DB_PASSWORD="<YOUR_DATABASE_PASSWORD>"
$env:JWT_SECRET="<YOUR_JWT_SECRET>"
$env:ML_SERVICE_URL="http://localhost:8000"
$env:ML_SERVICE_TOKEN="<YOUR_ML_SERVICE_TOKEN>"
$env:FRONTEND_URL="http://localhost:5174"

Write-Host "Starting FakeNews Spring Boot backend..." -ForegroundColor Cyan

mvn spring-boot:run