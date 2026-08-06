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
