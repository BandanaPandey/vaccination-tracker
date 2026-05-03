# Vaccination Tracker

Monorepo for the Vaccination Tracker application.

## Apps

- `vaccination-tracker-api` - Ruby on Rails API
- `vaccination-tracker-web` - Next.js web frontend

Each app has its own dependency manifest, environment configuration, and deployment process so they can be hosted independently.

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

## Environment variables

### API

- `FRONTEND_APP_URL` - frontend origin allowed by CORS

### Web

- `NEXT_PUBLIC_API_BASE_URL` - base URL for the Rails API

## Health endpoints

- Rails health check: `GET /up`
- Versioned API health check: `GET /api/v1/health`
