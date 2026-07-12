# Sync backend wwwroot to the frontend folder.
# The frontend uses the relative API base "/api", which works both when the
# backend serves wwwroot (same-origin) and on Vercel (via the /api rewrite in
# vercel.json -> https://jotit-api.onrender.com). No URL injection needed.
Copy-Item "backend\NotesApi\wwwroot\index.html" "frontend\index.html"
Copy-Item "backend\NotesApi\wwwroot\sw.js" "frontend\sw.js"

Write-Host "Frontend synced from backend wwwroot (API base: /api)."
