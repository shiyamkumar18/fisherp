import os
from django.conf import settings
from django.http import HttpResponse

def serve_spa_index(request, frontend_path=None):
    """
    SPA fallback view: serves the frontend index.html file for any route not
    matched by the backend API. This allows client-side routing (e.g. React Router)
    to handle the request.
    """
    possible_paths = [
        settings.BASE_DIR / "frontend" / "dist" / "index.html",
        settings.BASE_DIR.parent / "frontend" / "dist" / "index.html",
        settings.BASE_DIR / "frontend" / "index.html",
        settings.BASE_DIR.parent / "frontend" / "index.html",
    ]
    
    for path in possible_paths:
        if os.path.exists(path):
            with open(path, "r", encoding="utf-8") as f:
                return HttpResponse(f.read(), content_type="text/html")
                
    # Minimal fallback HTML if index.html is not found
    return HttpResponse(
        "<!doctype html><html><head><title>Fish Trading SaaS</title></head><body><div id='root'></div></body></html>",
        content_type="text/html"
    )
