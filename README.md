# Vaccination Tracker

Vaccination Tracker is a monorepo with a Rails API backend and a Next.js web frontend. Both apps are deployable on their own, with environment-driven configuration and no shared runtime requirement beyond HTTP.

## Apps

- `vaccination-tracker-api` - Ruby on Rails 8 API for auth, profiles, records, schedules, reminders, and certificate generation
- `vaccination-tracker-web` - Next.js 16 frontend for the family dashboard and record management experience

## Local setup

### API

```bash
cd vaccination-tracker-api
cp .env.example .env
bundle install
bin/rails db:prepare
bin/rails server -p 3001
```

### Web

```bash
cd vaccination-tracker-web
cp .env.example .env.local
npm install
npm run dev
```

## Production deployment

The backend and frontend are intended to deploy independently.

- Backend entrypoint: `bundle exec rails server`
- Backend health checks: `GET /up` and `GET /api/v1/health`
- Backend reminders: run Solid Queue inside Puma with `SOLID_QUEUE_IN_PUMA=1`, or run a separate worker with `bin/rails solid_queue:start`
- Frontend build: `npm run build`
- Frontend runtime: `npm run start`

Provider-agnostic deployment notes, production environment variables, and a smoke checklist are documented in [docs/deployment.md](docs/deployment.md).

## Environment variables

### API

- `APP_HOST` and `APP_PROTOCOL` configure production URL generation
- `FRONTEND_APP_URL` configures CORS and can contain comma-separated frontend origins
- `DATABASE_URL` is required in production, with optional `CACHE_DATABASE_URL`, `QUEUE_DATABASE_URL`, and `CABLE_DATABASE_URL`
- `SECRET_KEY_BASE` secures Rails secrets and auth token signing
- `ACTIVE_STORAGE_SERVICE` should be `amazon` in production for S3-backed uploads
- `SMTP_*` variables configure reminder email delivery
- `SMS_DELIVERY_ADAPTER` selects the SMS adapter, with placeholder Twilio-style vars available for future wiring

### Web

- `NEXT_PUBLIC_API_BASE_URL` is required outside development and test environments

## Health endpoints

- Rails health check: `GET /up`
- Versioned API health check: `GET /api/v1/health`
