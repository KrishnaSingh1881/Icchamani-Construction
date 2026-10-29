# Development and deployment guide

This document describes how the Icchamani Construction app is developed, hosted, and connected to Clerk and Supabase. It records the current setup and the practical steps used to deploy and troubleshoot it. It does not contain credentials.

## The deployed system at a glance

The browser loads the React/Vite app from a Cloudflare Worker. Clerk handles sign-in and user identity. Supabase stores business records and workspace membership. Clerk sends signed webhooks to a Supabase Edge Function so account changes appear in the membership table. A separate Supabase Edge Function delivers web push notifications on a schedule.

```text
Developer push to GitHub master
        │
        ▼
Cloudflare Workers Builds ── npm test && npm run build ── wrangler deploy
        │
        ▼
https://icchamani-construction.gaadihisaab.workers.dev
        │
        ├── Clerk sign-in ── signed user webhook ── Supabase clerk-sync
        │                                           └── app_members (new users await approval)
        └── Supabase app API ── business data, access checks, notification outbox
                                                  │
Supabase pg_cron ── pg_net ── push-dispatch ──────┴── browser push services
```

The hosting URL is a regular Cloudflare Workers deployment and does not have the 60-minute preview lifetime. It uses Cloudflare's free `workers.dev` address; no custom domain has been purchased. The current hosted app uses the Clerk development instance, so this is a shared testing deployment rather than a production Clerk setup.

## Hosting and automatic deployment

### Cloudflare Worker

The project is hosted as a Cloudflare Worker with Static Assets. The deployment definition is [`wrangler.jsonc`](wrangler.jsonc): Worker name `icchamani-construction`, static files from `dist/`, and SPA fallback handling. The public URL is:

https://icchamani-construction.gaadihisaab.workers.dev

The Cloudflare account is connected to the GitHub repository `KrishnaSingh1881/Icchamani-Construction`. Workers Builds watches the `master` branch, uses `/` as the root, runs `npm test && npm run build`, and deploys with `npx wrangler deploy`. Preview builds are disabled. A successful push to `master` therefore rebuilds and updates the same long-lived Worker URL automatically.

The build-time public variables in Cloudflare are:

- `VITE_CLERK_PUBLISHABLE_KEY`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_APP_ENV`
- `VITE_WEB_PUSH_PUBLIC_KEY`

Vite embeds `VITE_*` values into the browser bundle during the build. Updating a Cloudflare build variable requires a new build/deployment. Publishable keys and the VAPID public key are expected to be visible to users. Never put Clerk secret keys, Supabase service-role keys, webhook signing secrets, push private keys, or dispatch tokens in a `VITE_*` variable.

### Deploying changes

1. Make and review the code or configuration change locally.
2. Run `npm test` and `npm run build` (and the relevant function/database checks when changing Supabase code).
3. Commit and push to `master`:

   ```bash
   git add <files>
   git commit -m "Describe the change"
   git push origin master
   ```

4. Follow the build in GitHub Actions and Cloudflare Workers Builds. Confirm the latest commit is deployed and open the URL above.

Use `npx wrangler deploy` for a manual deployment from a logged-in Wrangler CLI. This sends the already-built `dist/` assets. The regular GitHub connection remains the normal deployment path. If Cloudflare reports a successful build but the site looks stale, reload without cache and inspect the deployed commit/build logs.

### GitHub checks and known issue

GitHub Actions is defined in [`.github/workflows/checks.yml`](.github/workflows/checks.yml). It runs `npm ci`, `npm test`, `npm run build`, `npm run test:db`, and a Deno type check for `push-dispatch`.

In the current repository, `npm test` and `npm run build` pass, but `npm run test:db` fails because the workflow invokes `scripts/test-database.sh`, which reads `supabase/tests/bootstrap.sql`; that file is absent from the repository. The root `.gitignore` ignores `supabase/`, so required safe database test fixtures may need explicit tracking. Do not assume all GitHub checks passed just because Cloudflare deployed a commit. Check the latest run in the repository's **Actions** tab.

## Clerk authentication and Supabase membership sync

### Why the sync was missing

Clerk sign-in establishes an identity; it does not automatically insert that identity into the app's own `public.app_members` table. The original project had no Clerk webhook endpoint, so newly registered users could exist in Clerk while being absent from the app membership directory. The app deliberately requires an active membership before granting data access.

### Current event flow

1. The Clerk instance sends `user.created`, `user.updated`, and `user.deleted` events to `https://xfxcdtdcjvkpaisibpjf.supabase.co/functions/v1/clerk-sync`.
2. Supabase has JWT verification disabled for this function because Clerk does not send a Supabase JWT. The function instead verifies Clerk's signed webhook with `CLERK_WEBHOOK_SIGNING_SECRET` using Clerk's backend webhook verifier.
3. The function uses `SUPABASE_SERVICE_ROLE_KEY` server-side to call the restricted `sync_clerk_member` database function.
4. The database function inserts or updates `app_members` with the Clerk display name and primary email, orders events by Clerk's timestamp to ignore stale deliveries, and handles deletion by revoking access while preserving business history.
5. A newly discovered account is inserted as `business_user` with `active=false`. A technical administrator can approve it in **More → Technical administration → Workspace accounts**. Profile changes preserve role and approval. Webhook events cannot grant access.

The implementation lives in:

- [`supabase/functions/clerk-sync/index.ts`](supabase/functions/clerk-sync/index.ts): HTTP method, signature verification, event filtering, and service-role RPC call.
- [`supabase/functions/clerk-sync/deno.json`](supabase/functions/clerk-sync/deno.json): pinned Deno npm imports.
- [`supabase/migrations/20261028175135_clerk_member_sync.sql`](supabase/migrations/20261028175135_clerk_member_sync.sql): event timestamp/deletion fields, restricted sync RPC, and deleted-account approval guard.
- [`supabase/migrations/202610290001_clerk_member_email.sql`](supabase/migrations/202610290001_clerk_member_email.sql): email column and service-only RPC update.
- [`supabase/tests/clerk-sync.sql`](supabase/tests/clerk-sync.sql): transactional regression checks for insert, update, stale events, deletion, and privileges.
- [`src/features/Admin.tsx`](src/features/Admin.tsx): admin directory and approval controls.

The Clerk webhook endpoint and signing secret are account configuration, not stored in Git. The signing secret is stored in Supabase Edge Function secrets. It must match the endpoint's Clerk/Svix signing secret. Do not paste it into chat, source, GitHub variables, or a browser-facing setting.

### Clerk sync setup and troubleshooting

- In Clerk, open the **development instance** that the hosted app uses and check its webhook endpoint. It must point exactly to the Supabase `clerk-sync` URL and subscribe to `user.created`, `user.updated`, and `user.deleted`.
- In the endpoint's message/attempts view, inspect failed deliveries and retry after fixing the reported error. The Edge Function returns 400 for invalid signatures, 503 when the signing secret is not configured, and 500 for a database/RPC failure so the event provider can retry.
- In Supabase, check **Edge Functions → clerk-sync → Logs** and confirm `CLERK_WEBHOOK_SIGNING_SECRET`, `SUPABASE_URL`, and `SUPABASE_SERVICE_ROLE_KEY` exist as function secrets. Never print their values when debugging.
- Check `public.app_members` for the Clerk subject. A row with `active=false` means sync succeeded but an admin has not approved it; it is different from a missing row.
- Ensure the signed Clerk webhook uses the same Clerk instance/secret as the users signing into the app. Development and production Clerk instances have different users, keys, and webhook secrets.
- Existing users at initial setup were backfilled through the same server-only database RPC. For future recovery, list users from the correct Clerk instance and replay/backfill them without changing existing `role` or `active` approvals. Do not blindly activate every user.

## Supabase configuration and database changes

The live Supabase project is identified in the dashboard by project ref `xfxcdtdcjvkpaisibpjf`. The URL and publishable key are frontend configuration; the service-role key is a privileged secret and is only for server-side functions or trusted administration.

Database schema and access policy changes are recorded under [`supabase/migrations/`](supabase/migrations/). Apply migrations to the intended Supabase project with a trusted migration tool/connection, then verify schema and function privileges. Do not apply the local test bootstrap as a cloud migration. The Clerk sync RPC is executable only by `service_role`; browser roles cannot call it to impersonate a webhook.

Useful local commands:

```bash
npm ci
npm test
npm run typecheck
npm run build
deno check --config supabase/functions/clerk-sync/deno.json supabase/functions/clerk-sync/index.ts
deno check --config supabase/functions/push-dispatch/deno.json supabase/functions/push-dispatch/index.ts
npm run test:db # requires Docker and the tracked test bootstrap fixture
```

The Supabase functions have their own deployment lifecycle; pushing the frontend does not by itself deploy a changed Edge Function or apply a database migration. Deploy a changed function with the Supabase CLI/MCP for the correct project, apply its migration separately, configure any required function secrets, then verify logs and behavior. The currently deployed function names are `clerk-sync` and `push-dispatch`.

## Push notification delivery

The frontend needs the public `VITE_WEB_PUSH_PUBLIC_KEY` (VAPID public key) at build time. A device registers with the browser push service and saves its subscription through the app's authorized Supabase path.

The server path is:

1. Business events enter the notification outbox.
2. The `gaadihisaab-push-delivery` `pg_cron` job checks once per minute for due notifications with active subscribed recipients.
3. `pg_net` calls the `push-dispatch` Supabase Edge Function with a bearer token held in Supabase Vault.
4. The function compares that token safely, claims a small batch, sends Web Push using the VAPID private key, and records delivery/retry status.

Private values are kept in Supabase function secrets and Vault, not Cloudflare or GitHub: `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `PUSH_DISPATCH_SECRET`, and the Supabase service-role key. The public VAPID key is not secret. The cron job also reads the project URL and dispatch secret from Vault entries named `gaadihisaab_project_url` and `gaadihisaab_push_dispatch_secret`.

The code is in [`supabase/functions/push-dispatch/`](supabase/functions/push-dispatch/) and the scheduling migration is [`supabase/migrations/20261028174018_push_delivery_schedule.sql`](supabase/migrations/20261028174018_push_delivery_schedule.sql). Confirm setup in Supabase by checking function logs, cron job runs, Vault secret *names* (not values), and notification/subscription state. Device push delivery should be verified on a real supported browser; a successful empty dispatch only means the scheduled endpoint authenticated when there was no due work.

On iPhone/iPad, web push requires the site to be installed to the Home Screen and opened as that app. On Android, use a supported browser such as Chrome. Browser permissions, OS notification settings, and device power settings can prevent visible delivery even if the server accepts the subscription.

## Local and hosted configuration

For local development, copy `.env.example` to `.env.local` and fill the public values for the matching Clerk and Supabase instances:

```dotenv
VITE_CLERK_PUBLISHABLE_KEY=
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
VITE_APP_ENV=development
VITE_WEB_PUSH_PUBLIC_KEY=
```

Never commit `.env.local`. Do not put backend keys in frontend variables. Prefer separate development and production Clerk/Supabase projects when moving beyond testing; configure each app URL and webhook explicitly, then test access approval and deletion behavior before inviting real users.

## What was changed and how it was verified

The deployment and service setup used these tools:

- Git and GitHub CLI (`git`, `gh`) to inspect/push the `master` branch and review GitHub Actions runs.
- Cloudflare Workers Builds for GitHub-connected automatic deployment; Wrangler for Worker configuration/manual deployment.
- Clerk CLI for inspecting the connected development instance and creating the Clerk webhook endpoint; the Clerk/Svix dashboard for endpoint configuration and delivery visibility.
- Supabase MCP/dashboard for applying migrations, deploying Edge Functions, managing secrets, checking database state, and verifying logs/configuration.
- Node/Deno local tooling for build, unit tests, Edge Function type checks, and HTTP/webhook behavior checks.

For the Clerk sync rollout, an unsigned webhook request was rejected, the database regression script ran in a rolled-back transaction, a real Clerk profile metadata update reached the live membership row, and the temporary metadata marker was restored afterward. The current membership list was checked after backfill: existing admin/approved access was retained, while a newly synced account remained inactive pending approval. The production frontend build and all 22 unit tests passed. GitHub's database test still fails on the untracked/missing `supabase/tests/bootstrap.sql` fixture described above.

These checks verify the configured paths, not every user's device/browser behavior. After a future deploy, test one new Clerk account, approve it in the admin screen, sign in on a phone, and—if push is being changed—send a real notification to a supported device.
