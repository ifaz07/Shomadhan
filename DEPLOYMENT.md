# Deployment Notes

## Recommended setup

- Deploy `frontend/` to Vercel
- Deploy `backend/` to Render or Railway

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

- Uploaded files are served from the backend host. For durable production media,
  migrate uploads to object storage such as Cloudinary, S3, or Vercel Blob.
- The legacy Python notification service has been removed. Notification and
  emergency broadcast behavior now lives in the Node.js backend.
