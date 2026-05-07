# Sync backend wwwroot to frontend folder
Copy-Item "backend\NotesApi\wwwroot\index.html" "frontend\index.html"
Copy-Item "backend\NotesApi\wwwroot\sw.js" "frontend\sw.js"

# Fix API_URL for Netlify
(Get-Content "frontend\index.html") -replace 'const API_URL = "";', 'const API_URL = "https://persistent-ai-ml-internship.onrender.com";' | Set-Content "frontend\index.html"

Write-Host "Frontend synced and API_URL fixed"