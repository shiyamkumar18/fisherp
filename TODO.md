# TODO - White page while frontend running

## Step 1: Inspect current static/HTML serving paths
- [ ] Confirm what `/` serves (Django template vs frontend dev index)
- [ ] Confirm whether SPA routes like `/app/dashboard` return frontend HTML

## Step 2: Build frontend and confirm output
- [ ] Run `npm ci` and `npm run build` in `fish-trading-saas/frontend`
- [ ] Confirm `fish-trading-saas/frontend/dist/index.html` exists and references correct `/static/...` assets

## Step 3: Wire production HTML into backend
- [ ] Ensure Django serves the built `dist/index.html` at `/` and for SPA fallback routes (except `/api/*`, `/admin/`, etc.)

## Step 4: Wire/verify static assets
- [ ] Ensure Django STATICFILES_DIRS / STATIC_ROOT includes the frontend `dist` output location
- [ ] Ensure nginx serves `/static/` correctly

## Step 5: Update nginx/Django SPA fallback if needed
- [ ] Ensure deep links return frontend HTML

## Step 6: Validate
- [ ] Check browser console for JS/CSS 404s
- [ ] Confirm React renders and route navigation works

