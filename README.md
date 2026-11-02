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

## New in v2: work and shops near you
- Visitors pick a district or tap "Use my location" to see paid tasks and shops, nearest first.
- Shops post paid tasks; jobseekers tap "I'm interested". Pay is shown on every task.
- Privacy: phone numbers are never public, saved locations are rounded to about 1 km, jobseekers appear only as district counts.
- Admin: tick **Approved** to publish a shop or task, set an application to **completed** to count earnings (workers 70%, platform 30%).

## v3 additions
- Public "Where help is needed" demand board: shops waiting vs operators ready per district (no personal data).
- Admin "Pods": operators are auto-matched to nearby shops in the same district (grouped by area, capped by the operator's availability: 8 / 5 / 3), with WhatsApp buttons.
- Updating an existing deployment: replace `server.js`, `admin.html` and `public/index.html` on GitHub. Old leads without a district will not appear on the demand board.
