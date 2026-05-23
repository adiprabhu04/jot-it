# Sync backend wwwroot to frontend folder
Copy-Item "backend\NotesApi\wwwroot\index.html" "frontend\index.html"
Copy-Item "backend\NotesApi\wwwroot\sw.js" "frontend\sw.js"

$railwayUrl = "https://persistent-ai-ml-internship-production.up.railway.app"

(Get-Content "frontend\index.html") -replace 'const API_URL = "";', "const API_URL = `"$railwayUrl`";" | Set-Content "frontend\index.html"

Write-Host "Frontend synced with Railway API URL: $railwayUrl"
