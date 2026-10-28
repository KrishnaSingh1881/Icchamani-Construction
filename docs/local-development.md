# Local development and later service setup

## What works without service accounts

`npm run dev` starts the production entry point. Without the public environment settings it shows the connection setup screen.

Run `npm test` for configuration, financial rules, chart calculations and local queue tests. IndexedDB tests use fake-indexeddb, including database reopening, interrupted replies, operation dependencies and account separation.

Run `npm run test:db` with Docker available. It starts a disposable PostgreSQL 16 container, creates a local stand-in for Supabase's authenticated role and JWT claims function, applies the migration, and tests permissions and write behaviour. It then starts simultaneous independent database sessions to test repeated submissions and competing edits. The container is stopped automatically. No production URL, password or database is read by the harness.

`npm run typecheck` and `npm run build` verify the application bundle. These checks do not prove that Google sign-in, Supabase Realtime or Safari offline reopening works; those require the later connected/device tests.

## Connecting Clerk and Supabase later

Create the projects when ready. Copy `.env.example` to `.env.local` and enter the Clerk publishable key, Supabase URL and Supabase publishable/legacy anon key. Never use a Supabase secret/service-role key or a Clerk secret key in a `VITE_` variable.

Enable Google sign-in in Clerk. Enable the native Clerk/Supabase integration and configure the matching Clerk issuer in Supabase. The trusted session must carry the authenticated role as described by the providers' integration guide. Do not create a second Supabase login flow: Clerk supplies identity and session tokens.

Apply `supabase/migrations/202610280001_workspace.sql` to a fresh project with permitted migration access. The migration assumes Supabase's `anon`, `authenticated` and `auth.jwt()` already exist. The local stand-ins under `supabase/tests` are test-only and must not be applied to the cloud project.

Provision the real Clerk subjects in `public.app_members` using the Supabase SQL editor or another trusted administrative connection. Use the real display names and the role `business_user` for the four users and `technical_admin` for the developer. Do not use sample subjects from tests. The first administrator is provisioned through this trusted setup, never through an unauthenticated browser action. Account-management screens are a later task.

The UI checks `current_membership()` after Google sign-in. A Clerk account that is not actively approved receives no records. The technical administrator can inspect the workspace but the business write and conflict-resolution routines are restricted to business users, and resolutions additionally check actual participants.

## Data and write contracts

The domain has explicit vehicle, client, work, expense, payment and ledger payloads. PostgreSQL stores these typed payloads inside one shared versioned record envelope. That keeps ID handling, permissions, audit, retry protection and sync consistent without duplicating those mechanisms across every entity. The database validates payload fields, states, references, money and core work rules independently of the browser.

`submit_operation(operation)` is the shared write path. Each operation has an immutable ID, target record ID, kind, action, expected version, changed data, requested state, reason and client timestamp. The result is accepted with the canonical record, needs_review with a conflict ID, or a validation/permission error. Normal clients cannot write directly to the tables.

`pull_changes(after_seq, page_size)` returns accepted record snapshots, an advancing cursor and a has_more flag. The short business-wide transaction lock serializes accepted writes and change sequence allocation for this one four-user business. It prevents the sync cursor from skipping an earlier operation that commits later. Version checks in the local cache prevent older snapshots from replacing newer accepted records.

`resolve_conflict(conflict_id, resolution, expected_version, reason)` accepts keep_current, use_proposed or separate where appropriate. Only involved business users can call it successfully. A record that changed again must be refreshed before resolution. A second resolver gets already_resolved. The application-level review screen and queue reconciliation are still being built.

Accepted data, revisions, audit and notification events are committed together. Notifications currently form a database outbox; this is not real iPhone push delivery yet. Realtime is enabled for business_records if the Supabase publication exists, and catch-up sync still runs after reconnecting.

## Offline boundaries at this milestone

IndexedDB is separated by Clerk subject. Outgoing operations remain until acceptance, review or rejection, and their IDs remain stable through retries. Dependencies ensure that new master records are uploaded before related entries. No network call occurs inside an IndexedDB transaction.

The current production pages list accepted records and show local queued changes separately. This avoids including disputed or unconfirmed writes in accepted totals. Rejected/reviewed dependencies pause their children rather than submitting broken references. Review reconciliation, full draft editing, automatic field templates and failed-entry correction screens remain tasks.

The PWA service worker, cached authentication reopening and physical-iPhone offline tests are not complete. A working IndexedDB queue alone is not evidence of complete offline operation. Clearing browser storage or losing a phone can lose unsynced entries.

## Deployment

`wrangler.jsonc` prepares Cloudflare static assets and single-page route fallback. It does not create a deployment or add server secrets. Cloudflare-provided test hosting can use Clerk development settings. Production Clerk requires the chosen controlled domain, DNS setup and production Google OAuth configuration. The developer will choose the domain later.
