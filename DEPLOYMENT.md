# Deployment Notes

## Recommended setup

- Deploy `frontend/` to Vercel
- Deploy `backend/` to Render 
## Frontend

- Root directory: `frontend`
- Build command: `npm run build`
- Output directory: `dist`
- Required env: `VITE_API_URL=https://your-backend-domain/api/v1`

## Backend

- Root directory: `backend`
- Build command: `npm install`
- Start command: `npm start`
- Required envs are listed in `backend/.env.example`

## Important notes

- Profile pictures, verification documents, complaint evidence, volunteer posters,
  and emergency audio are stored in Cloudinary. Add `CLOUDINARY_CLOUD_NAME`,
  `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` to the backend environment.
- Files uploaded before this change remain on the backend's local disk and may no
  longer be available after a restart or redeploy. New uploads are durable.
- The legacy Python notification service has been removed. Notification and
  emergency broadcast behavior now lives in the Node.js backend.

## Security configuration

- `JWT_SECRET` is required; the server refuses to start without it. In production it must not be a placeholder value.
- `CLIENT_URL` must contain the exact frontend origin (comma-separate several). Other origins are blocked by CORS. Set `ALLOW_PREVIEW_ORIGINS=true` only if every `*.vercel.app` / `*.netlify.app` preview should be trusted.
- Behind Render, `TRUST_PROXY_HOPS` (default `1`) lets rate limits use the real client IP.
- Admin and mayor accounts are created with `npm run seed:admin` and `npm run seed:mayor`, using `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `MAYOR_EMAIL` and `MAYOR_PASSWORD` from the environment. Existing passwords are only changed with `--reset-password`.

## CI/CD

GitHub Actions (`.github/workflows/ci.yml`) runs on every pull request and on every push to `main`:

- Backend: install, syntax check, unit tests (`npm test`).
- Frontend: install and production build.
- Secret scan (gitleaks) and a report-only `npm audit` of production dependencies.

Render and Vercel deploy from `main` on their own. To make deploys wait for CI, create a deploy hook in each service (Render: Settings, Deploy Hook; Vercel: Settings, Git, Deploy Hooks), add them as the repository secrets `RENDER_DEPLOY_HOOK_URL` and `VERCEL_DEPLOY_HOOK_URL`, and turn off auto-deploy in both services. Without those secrets the deploy job does nothing.
