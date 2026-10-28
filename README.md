# ShopMitra

A landing page and lead dashboard for the "AI operators for local shops" idea.
Shop owners and operators sign up on the site; you manage them at `/admin`.

## Run locally
```
npm install
ADMIN_PASSWORD=mysecret npm start
```
Open http://localhost:3000 (site) and http://localhost:3000/admin (any username, password = ADMIN_PASSWORD).

## Deploy on Render (simple)
1. Push this folder to a GitHub repository.
2. On render.com choose New > Blueprint, pick the repo (it reads `render.yaml`).
3. Set the `ADMIN_PASSWORD` environment variable when asked.
4. The 1 GB disk keeps leads safe between restarts (disks need a paid instance; on the free tier leads are lost on redeploy, so download the CSV often).

## Deploy with Docker (any VPS)
```
docker build -t shopmitra .
docker run -d -p 80:3000 -e ADMIN_PASSWORD=mysecret -e DATA_DIR=/data -v shopmitra-data:/data shopmitra
```

## Other hosts
Railway, Fly.io and any Node 18+ host work: build `npm install`, start `npm start`.
Set `ADMIN_PASSWORD`, and `DATA_DIR` to a persistent folder.

## Notes
- Leads are stored in a JSON file (fine for hundreds of leads). Move to a database when you grow.
- Admin uses HTTP basic auth, so serve it over HTTPS (Render and most hosts do this automatically).
- Change `change-me` default by setting ADMIN_PASSWORD before going live.
