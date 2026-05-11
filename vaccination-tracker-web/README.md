# Vaccination Tracker Web

Next.js frontend for the Vaccination Tracker family dashboard, records, reminders, calendar, and certificate download experience.

## Local setup

```bash
cp .env.example .env.local
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) after starting the dev server.

## Environment variables

- `NEXT_PUBLIC_API_BASE_URL` - base URL for the Rails API, for example `https://api.example.com`

The frontend expects the API to be hosted separately. Outside development and test environments, `NEXT_PUBLIC_API_BASE_URL` must be set explicitly.

## Build and run

```bash
npm run build
npm run start
```

## Test suite

```bash
npm run test
npm run lint
```
