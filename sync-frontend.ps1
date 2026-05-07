# Sync backend wwwroot to frontend folder
Copy-Item "backend\NotesApi\wwwroot\index.html" "frontend\index.html"
Copy-Item "backend\NotesApi\wwwroot\sw.js" "frontend\sw.js"

# Fix API_URL for Netlify
(Get-Content "frontend\index.html") -replace 'const API_URL = "";', 'const API_URL = "https://persistent-ai-ml-internship.onrender.com";' | Set-Content "frontend\index.html"

# Add landing redirect if missing
$content = Get-Content "frontend\index.html" -Raw
if ($content -notmatch "jotit_visited") {
    $content = $content -replace `
        '(const API_URL = "https://persistent-ai-ml-internship\.onrender\.com";)', `
        '$1
// Landing page redirect logic
if (!localStorage.getItem(''token'') && !localStorage.getItem(''jotit_visited'')) {
  window.location.href = ''landing.html'';
}
localStorage.setItem(''jotit_visited'', ''1'');'
    Set-Content "frontend\index.html" $content
}

Write-Host "Frontend synced and API_URL fixed"