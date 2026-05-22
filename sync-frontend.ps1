# Sync backend wwwroot to frontend folder
Copy-Item "backend\NotesApi\wwwroot\index.html" "frontend\index.html"
Copy-Item "backend\NotesApi\wwwroot\sw.js" "frontend\sw.js"

# Set Railway backend URL for Vercel deployment
# Replace YOUR_RAILWAY_BACKEND_URL_HERE with your actual Railway backend URL
$railwayUrl = "https://YOUR_RAILWAY_BACKEND_URL_HERE"

(Get-Content "frontend\index.html") -replace 'const API_URL = "";', "const API_URL = `"$railwayUrl`";" | Set-Content "frontend\index.html"

Write-Host "Frontend synced with Railway API URL: $railwayUrl"
