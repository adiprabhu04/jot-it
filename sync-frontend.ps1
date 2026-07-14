# Sync backend wwwroot to the frontend folder.
# The frontend uses the relative API base "/api", which works both when the
# backend serves wwwroot (same-origin) and on Vercel (via the /api rewrite in
# vercel.json -> https://jotit-api.onrender.com). No URL injection needed.
Copy-Item "backend\NotesApi\wwwroot\index.html" "frontend\index.html"
Copy-Item "backend\NotesApi\wwwroot\sw.js" "frontend\sw.js"

# The app shell is modularized: CSS in css/, ES modules in js/. Mirror both
# directories so the modular structure stays in sync (not just index.html).
Copy-Item "backend\NotesApi\wwwroot\css" "frontend\css" -Recurse -Force
Copy-Item "backend\NotesApi\wwwroot\js"  "frontend\js"  -Recurse -Force

Write-Host "Frontend synced from backend wwwroot (API base: /api)."
