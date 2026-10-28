# GaadiHisaab

A responsive fleet and financial management application for Icchamani Construction.

GaadiHisaab brings Hyva trips, JCB jobs, expenses, client payments, and business ledgers into one workspace. It combines fast data entry with financial reporting, transparent record history, and synchronisation across users and devices.

## Features

- **Work tracking:** Hyva trips with routes, materials, quantities, and units; JCB jobs with sites and hours.
- **Financial records:** Client balances, payments, vehicle expenses, driver payments, and partner ledgers.
- **Dashboard:** Fleet availability and weekly/monthly earnings-versus-costs charts, with profit/loss totals and interactive breakdowns.
- **Faster entry:** Recent choices, favourites, repeat entries, recoverable drafts, and expense-field suggestions based on recorded usage.
- **Reliable synchronisation:** Queued submissions, duplicate protection, and conflict review for involved users.
- **Traceability:** Versioned records and audit history for business changes.
- **PDF reports:** Generate reports locally for download or sharing; generated PDFs are not uploaded to the database.
- **Consistent interface:** Responsive layouts, light and AMOLED dark themes, accessible controls, and GSAP motion that respects reduced-motion preferences.

## Engineering

- Integer-paise accounting avoids floating-point errors in monetary calculations.
- Stable submission IDs make retries idempotent.
- Version-aware updates detect conflicting edits and preserve review history.
- Account-scoped IndexedDB stores drafts and pending submissions on the device.
- Google authentication and backend permissions control workspace access.
- Reports are generated in the browser for download and sharing.

## Technology stack

| Layer | Technology |
| --- | --- |
| Frontend | React, TypeScript, Vite, React Router |
| Interface | Tailwind CSS, shadcn/ui, Radix UI, React Bits |
| Animation | GSAP and its React integration |
| Authentication | Clerk with Google sign-in |
| Data services | Supabase and PostgreSQL |
| Device storage | IndexedDB through Dexie |
| Validation | Zod |
| Reports | jsPDF |

## Getting started

Requires Node.js 22.12 or later and npm.

```bash
npm ci
cp .env.example .env.local
```

Add the application’s public configuration to `.env.local`:

```dotenv
VITE_CLERK_PUBLISHABLE_KEY=
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
VITE_APP_ENV=development
```

Start the development server:

```bash
npm run dev
```

Authentication requires a configured Clerk application, a connected Supabase project, and an approved workspace account.

`VITE_WEB_PUSH_PUBLIC_KEY` is optional. Push delivery requires separately configured server services and a supported installed PWA.

## Development commands

```bash
npm run typecheck
npm test
npm run build
npm run preview
```

The build produces `dist/`, generates the versioned PWA service worker, and checks install assets and offline route handling. PWA installation and service-worker behaviour require a production build served over HTTPS or localhost.

## Hosting

The app is hosted on Cloudflare Workers Static Assets:

https://icchamani-construction.gaadihisaab.workers.dev

This is a regular account deployment, without the temporary preview expiry. Static asset hosting is free. The current shared testing deployment uses the existing Clerk development instance; production authentication requires a controlled domain and Clerk production configuration.

The GitHub integration for this existing Worker should use these settings:

- Repository: `KrishnaSingh1881/Icchamani-Construction`
- Deployment branch: `master`
- Root directory: `/`
- Build command: `npm test && npm run build`
- Deploy command: `npx wrangler deploy`
- Build variables: `VITE_CLERK_PUBLISHABLE_KEY`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, and `VITE_APP_ENV` from the current public configuration.

Connect the repository under the Worker's **Settings → Builds** in Cloudflare. Once connected, pushes to `master` automatically rebuild and update the same hosted URL. The Wrangler Worker name must match `icchamani-construction`.

For a manual deployment from this checkout, with the public settings in `.env.local`:

```bash
npm run build
npx wrangler deploy
```

Vite embeds the public settings at build time. Cloudflare runtime variables do not change an already-built frontend. Keep secret keys out of `VITE_` variables.

## Security

Keep credentials in environment configuration and server secret storage. Only browser-safe publishable keys belong in `VITE_` variables. Workspace permissions are enforced by the backend.
