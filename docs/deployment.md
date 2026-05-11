# Deployment Guide

This project is designed for independent deployment of the Rails API and the Next.js web frontend.

## Backend deployment

### Required production variables

- `APP_HOST`
- `APP_PROTOCOL`
- `FRONTEND_APP_URL`
- `ALLOWED_HOSTS`
- `DATABASE_URL`
- `SECRET_KEY_BASE`
- `ACTIVE_STORAGE_SERVICE=amazon`
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_REGION`
- `AWS_S3_BUCKET`
- `SMTP_FROM_EMAIL`
- `SMTP_ADDRESS`
- `SMTP_PORT`

### Optional backend variables

- `CACHE_DATABASE_URL`
- `QUEUE_DATABASE_URL`
- `CABLE_DATABASE_URL`
- `SMTP_DOMAIN`
- `SMTP_USERNAME`
- `SMTP_PASSWORD`
- `SMTP_AUTHENTICATION`
- `SMTP_ENABLE_STARTTLS_AUTO`
- `SMS_DELIVERY_ADAPTER`
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_FROM_NUMBER`
- `SOLID_QUEUE_IN_PUMA`

### Runtime expectations

- Web process: `bundle exec rails server`
- Health checks:
  - `GET /up`
  - `GET /api/v1/health`
- Job processing:
  - single-service deploy: set `SOLID_QUEUE_IN_PUMA=1`
  - separate worker deploy: run `bin/rails solid_queue:start`

## Frontend deployment

### Required frontend variables

- `NEXT_PUBLIC_API_BASE_URL`

### Runtime expectations

- Build: `npm run build`
- Start: `npm run start`

## Cross-origin setup

- `NEXT_PUBLIC_API_BASE_URL` must point to the deployed Rails API origin
- `FRONTEND_APP_URL` on the API must include the deployed frontend origin
- Multiple frontend origins can be configured by separating them with commas in `FRONTEND_APP_URL`

## Storage setup

- Use an S3 bucket dedicated to Active Storage uploads
- Keep the bucket private
- Confirm the API process has read/write permissions for the bucket

## Post-deploy smoke checklist

1. Load the web app and confirm login and signup work.
2. Verify the dashboard and calendar load without CORS errors.
3. Create a vaccination record with proof upload and confirm the proof link opens from the web app.
4. Trigger reminders manually and confirm reminder deliveries are logged.
5. Download a vaccination certificate PDF for a profile.
6. Check `GET /up` and `GET /api/v1/health`.
