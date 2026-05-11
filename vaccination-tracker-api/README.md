# Vaccination Tracker API

Rails 8 API for the Vaccination Tracker product. It owns authentication, family profiles, vaccination records, region-aware schedules, reminders, and vaccination certificate PDFs.

## Local setup

```bash
cp .env.example .env
bundle install
bin/rails db:prepare
bin/rails server -p 3001
```

## Core environment variables

- `FRONTEND_APP_URL` - allowed frontend origins for CORS, comma-separated when multiple frontends are needed
- `DATABASE_URL` - primary database connection in production
- `SECRET_KEY_BASE` - Rails secret used for signed messages and auth token verification
- `APP_HOST` and `APP_PROTOCOL` - URL generation for production mailers and file links

## Production services

### Storage

- Default development/test storage uses disk
- Production storage should use `ACTIVE_STORAGE_SERVICE=amazon`
- Required S3 variables:
  - `AWS_ACCESS_KEY_ID`
  - `AWS_SECRET_ACCESS_KEY`
  - `AWS_REGION`
  - `AWS_S3_BUCKET`

### Mail delivery

- Reminders are sent through SMTP in production
- Required mail vars:
  - `SMTP_FROM_EMAIL`
  - `SMTP_ADDRESS`
  - `SMTP_PORT`
- Optional mail vars:
  - `SMTP_DOMAIN`
  - `SMTP_USERNAME`
  - `SMTP_PASSWORD`
  - `SMTP_AUTHENTICATION`
  - `SMTP_ENABLE_STARTTLS_AUTO`

### Jobs

- Active Job uses Solid Queue in production
- For single-service deployments, set `SOLID_QUEUE_IN_PUMA=1`
- For split worker deployments, run:

```bash
bin/rails solid_queue:start
```

## Health checks

- `GET /up`
- `GET /api/v1/health`

## Test suite

```bash
bundle exec rails test
```
