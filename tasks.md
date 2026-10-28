# GaadiHisaab — Implementation Plan and Tasks

**Updated:** 28 October 2026

**Current stage:** Production foundation implemented and locally tested. Clerk and Supabase accounts are connected for development; deployment and final device verification remain.

## What this plan is for

Build the complete tracking app described in [briefing.md](briefing.md), preserving its typography, warm surfaces, floating dock, light/dark themes and purposeful GSAP motion.

Production must use real records, live authentication, durable sync and server-enforced permissions. No fictional records or hard-coded users belong in the shipped app.

`briefing.md` records the product agreement. This file records implementation order, dependencies, working assumptions and evidence of completion. Update both when a decision changes their contents.

## Agreed infrastructure

| Part | Choice |
|---|---|
| Application | iPhone-first PWA, React, TypeScript and Vite |
| Styling and components | Tailwind, customised shadcn/ui and selected React Bits components |
| Motion | GSAP with its React integration and Reduce Motion support |
| Authentication | Clerk Free, Google sign-in, approved accounts only |
| Shared database/backend | Supabase Free, PostgreSQL and transactional database functions |
| Local records and queue | IndexedDB through Dexie |
| Navigation | React Router |
| Hosting | Cloudflare Workers Free with static assets |
| Reports | Locally generated PDFs, with no cloud PDF archive |
| Backup approach | Encrypted off-site database exports, with restore verification |

Cloudflare is selected to prioritise free hosting. Do not introduce a paid hosting plan or automatically upgrade services. Usage and execution limits still need checking against the actual application.

### Domain timing

The developer does not currently have a domain and will choose a paid or free domain later. This does not block local development or a test deployment. Use the Cloudflare-provided address with Clerk's development environment for testing.

Before production launch, connect a domain the developer controls, configure DNS and set up Clerk production with the business's own Google OAuth credentials. A usable subdomain is acceptable. The provider must allow the necessary DNS records. The domain is a launch prerequisite, not another product-planning requirement.

## How tasks are maintained

Each task has a stable ID, status, dependencies and a completion check. Use **Not started**, **In progress**, **Blocked** or **Verified**. Mark work Verified only after its acceptance checks pass. Record what was tested, any limitation and the relevant migration or commit when available.

Credentials and deployment account access are prerequisites for connecting services, not reasons to stop unrelated local implementation. Keep secrets out of this file, the briefing, logs and Git. Never mark an integration complete merely because a provider was chosen or an SDK was installed.

## Implementation order

| ID | Task | Status | Depends on |
|---|---|---|---|
| T00 | Establish the production baseline and preserve the UI mockup | Verified | None |
| T01 | Configure local, test and production environments | In progress | T00 |
| T02 | Build the database, migrations and permissions | In progress | T01 |
| T03 | Implement transactional writes and audit history | Verified | T02 |
| T04 | Implement local storage and synchronisation | In progress | T03 |
| T05 | Connect the approved app shell and authentication | In progress | T01, T04 |
| T06 | Implement saved information and Hyva/JCB work | In progress | T05 |
| T07 | Implement expenses, payments and ledgers | In progress | T06 |
| T08 | Complete smart quality-of-life behaviour | Not started | T06, T07 |
| T09 | Implement duplicate and conflict review | In progress | T04, T06, T07 |
| T10 | Implement in-app notifications and iPhone push | Not started | T03, T09 |
| T11 | Complete clients, dashboard and local reports | Not started | T07, T09 |
| T12 | Implement technical administration and recovery | Not started | T03, T10 |
| T13 | Verify, deploy and onboard the four users | Not started | T00–T12 |

These are implementation milestones within the agreed scope, not a reduced feature list. A restricted test deployment can be available before the final launch. Within a task, independent work can proceed while a service connection is pending.

### T00 — Establish the production baseline

Preserve the UI mockup and its visual reference so the real app can be compared with what the user liked. Separate mockup-only presentation and sample behaviour from the production entry point. The archived mockup/ project has its own source, components, dependencies and build. Develop production features in the main app without imports between the two projects.

**Complete when:** the reference remains accessible, the production app cannot accidentally load sample business records, and the package/project naming clearly identifies the real app. Reset-sample-data controls must not appear in production.

### T01 — Configure environments

Prepare validated local, test and production environment settings. Connect Clerk and Supabase when access is available. Configure Cloudflare deployment and separate testing from real business data. Collect the four approved Google accounts, the technical admin account and actual vehicle details; do not use the mockup's fictional names or registrations as production seeds.

Prepare an example environment file containing variable names without secrets. Record domain, OAuth, DNS and production-key setup as launch steps without making the undecided domain block development.

**Complete when:** missing configuration produces a clear setup message, the test environment is isolated from production, and private keys cannot enter the browser bundle or Git.

### T02 — Build the database and permissions

Create versioned migrations for account membership, vehicles, clients, drivers, materials, routes/sites, work records, expenses, client payments, driver payments, partner entries, adaptive fields, favourites, audit history, conflicts, notification subscriptions and delivery events. Add the constraints and indexes needed for common searches, summaries and reliable writes.

Integrate Clerk with Supabase using the supported third-party authentication integration. Link the verified Clerk subject to an approved account. Enforce four equal business-user permissions and a separate technical-admin role in the backend. Use database access policies for reads and controlled write functions for changes.

**Complete when:** a fresh database can be created from migrations; an unapproved account cannot read or change business data; ordinary users cannot invoke admin operations; and the app has no permanent-delete path for business records.

### T03 — Implement transactional writes and history

Create one consistent write path for accepted business changes. A successful operation records its data change, version, audit event and any notification event in the same transaction. Audit history must include creator/editor identity, previous/new values, cancellation/restoration reasons and server timestamps.

Use stable submission IDs and expected record versions. Retrying a submission must return the original outcome rather than save another copy. Reject reuse of an operation ID with different contents. Serialize the short write operation for this single business so simultaneous submissions are checked consistently.

**Complete when:** retries save once; failed operations do not leave partial changes or missing history; and direct or unauthorised writes cannot bypass the rules.

### T04 — Implement local storage and synchronisation

Use IndexedDB for cached records, lookup information, drafts and an outgoing operation queue. Keep storage associated with the authenticated account. Save local work before attempting upload and retain it until the backend confirms receipt or returns a review outcome.

Synchronise when the app can run after opening or reconnecting. Combine realtime refreshes with a reconnect catch-up so missed events do not leave stale records. Display Waiting to sync, Synced, Failed and Needs review accurately. An expired session requires renewal before upload; first login requires connectivity.

**Complete when:** offline entries survive reopening, interrupted requests retry without duplicates, account switching does not expose another account's cache, and no local-only change is labelled Synced. Document that clearing local data or losing a phone can lose unsynced work.

### T05 — Connect the app shell and authentication

Implement real routes for Home, Work, Clients, Ledgers and More, with a separate protected technical-admin route. Integrate Clerk's Google sign-in, session persistence and account controls. Replace hard-coded names and fixed dates with actual identity and business dates.

Carry the approved dock, typography, colour hierarchy and component treatment into the app. Support Light, Dark and System appearance, remembering the preference. Preserve focus handling, safe areas, keyboard access and Reduce Motion.

**Complete when:** approved accounts can reach the shared workspace, refreshing a route works, unauthorised access is rejected by the backend, and both themes remain readable across normal and error states.

### T06 — Implement saved information and work

Build reusable vehicles, clients, drivers, materials and routes/sites, including inline creation and inactive states. A new vehicle must appear automatically in relevant forms, summaries and reports. Use saved IDs rather than repeated free-text registrations.

Implement separate Hyva and JCB forms. Hyva captures carrying details, quantity/unit and route. JCB captures site/job and hours or start/end times. Amounts remain manual. Support start/completion, recording completed work later, editing, cancellation, restoration and per-record history. Completion updates the existing work record.

**Complete when:** users can complete both actual workflows, vehicle status follows accepted changes, history survives corrections and no fictional master records are required.

### T07 — Implement expenses, payments and ledgers

Build user-defined expense categories and reusable extra fields, keeping core amount/date/vehicle details stable. Implement partial client payments and calculated balances. Provide driver and partner ledgers with explicit manual entry types and no automatic salary or profit-share formulas.

Represent a driver payment once even when it appears in both Expenses and the driver ledger. Represent credit settlement without creating a second expense. Keep partner transfers/distributions separate from operating costs.

**Complete when:** accepted entries update the correct balances; cancellation/restoration updates totals; credit settlement and driver-ledger views do not double-count money; and custom expense details can be reused without changing old records.

### T08 — Complete smart quality of life

Implement cached suggestions, recent/frequent choices, personal favourites, assigned-driver defaults, previous-amount hints, repeat entry and Add another. Context should change between Hyva and JCB. Include similar-client-name warnings and draft recovery for each form/work type.

Adaptive fields remember relevant category structure and familiar values. Do not silently reuse financial amounts, create duplicate field names or change historical data as templates evolve.

**Complete when:** familiar suggestions appear from local data, repeated work takes less typing, switching work types does not corrupt drafts, and users remain in control of amounts and suggested values.

### T09 — Implement duplicate and conflict review

Handle retry duplicates, possible real-world duplicates and competing edits as separate cases. Compare actual vehicle/work details even when one or two fields differ. Registration plus date alone cannot prove that two entries are the same trip; recorded overlapping times provide stronger evidence where available.

Preserve both submissions. Combine safe independent edits, but review competing values, connected field groups and cancellation-versus-edit disagreements. Only involved business users resolve business conflicts. Either can resolve; the second simultaneous attempt must see the accepted resolution rather than overwrite it.

For possible duplicate new work, hold the additional submission for review rather than silently counting another charge. Allow users to confirm separate work or retain one record with reviewed corrections. Keep the original submissions and the resolution in history.

**Complete when:** the ten-minute-versus-two-hour offline example behaves correctly, similar new trips remain reviewable, unresolved entries are visibly identified, and neither totals nor history are silently corrupted.

### T10 — Implement notifications

Create durable in-app notifications and iPhone Web Push subscriptions. Broadcast trip/job starts and completions to the other business users. Send conflict and resolution alerts to the involved users. Tapping an alert opens the relevant record or review.

Use a transactional notification outbox and server-side VAPID Web Push sender compatible with Cloudflare. Retry delivery failures and remove expired subscriptions. Keep subscription targeting authenticated. Onboarding explains Add to Home Screen and permission requirements. Delayed offline events show their actual event time.

**Complete when:** the correct people receive alerts, dismissed or missed push does not hide unresolved work, notification links work after login, and real installed-iPhone delivery has been tested. Optional summaries and payment broadcasts remain opt-in rather than becoming mandatory by default.

### T11 — Complete clients, dashboard and reports

Complete searchable/sortable client lists, profiles, dated work groups, payments, summaries and filters. Implement pending reminders, vehicle comparisons, category/payment breakdowns and the documented charts. Use the same accepted-record definitions throughout the app.

Generate client statements, vehicle reports, driver ledgers, expense summaries and payment acknowledgements locally. Use the existing jsPDF setup as a starting point, with readable layout, pagination, totals and period labels. Support preview and the available iPhone sharing/saving actions. Do not upload generated files.

**Complete when:** detailed views, Home and PDFs reconcile; opening/activity/closing balances are clear; charts use the selected period; and every required report previews and shares correctly on iPhone.

### T12 — Implement technical administration and recovery

Provide approved-user management, access revocation, supported session controls, audit inspection, failed-sync visibility, settings, exports and real backup status. The technical admin manages system problems and does not become a business-conflict approver.

Schedule encrypted database exports using a private GitHub repository's Actions workflow, with seven-day retention initially. Keep encryption recovery material separately under the developer's control. Make backup success/failure visible, monitor storage/transfer usage and document manual recovery. Do not imply scheduled jobs are guaranteed to run at an exact minute.

**Complete when:** access controls are verified, backup failures are discoverable, and an encrypted backup restores successfully into a separate test database. Never test destructive restoration against the live database.

### T13 — Verify and deploy

Complete the release checks below. Configure Cloudflare, HTTPS, production Clerk/Google credentials and the selected domain. Confirm that production contains actual approved users and master information, with no fictional transactions or opening balances.

Install the PWA on all four iPhones, verify sign-in and notifications, and guide the users through work, expense, payment and conflict-review actions. Keep deployment rollback and database migration/recovery instructions available.

**Complete when:** the release checks pass, the domain and production identity setup are ready, and all four users can perform the core workflows. Track subsequent changes from actual use without calling the UI mockup the working app.

## Shared interfaces and data rules

Replace the mockup's single combined entry type with explicit **WorkOrder**, **Expense**, **ClientPayment**, **DriverPayment** and **PartnerEntry** types. Use stable IDs for relationships, integer paise for money, decimal quantities/durations and separate business-date, client-event and server timestamps.

Every queued operation carries an operation ID, record ID, expected version and changed fields. The write interface returns **Accepted**, **Needs review** or **Rejected**, together with the accepted record/version or review reference. Related new master records and queued entries must retain their ID relationships through retries and conflict handling.

Clerk identity must be verified before mapping it to approved membership. Backend rules remain authoritative even if a hidden button or cached screen suggests otherwise. The browser must never receive Supabase service credentials or Clerk secret keys.

Safe field merging requires the version the user actually edited. Review quantity/unit and start/end times together. An unchanged field in an older form must not replace another user's accepted change. Cancelling work and editing its contents cannot silently restore a cancelled record.

## Working defaults for implementation

These are explicit implementation defaults from the plan, not claims that the UI mockup already implements them. Keep them visible in the briefing as the corresponding features are built. Raise a focused question only if a concrete business example requires a different rule.

| Topic | Default |
|---|---|
| Currency and dates | INR stored in exact paise; business dates in Asia/Kolkata |
| Starting records | No historical transaction import; actual master information only |
| Live work | In-progress work stays visible separately; completed accepted work contributes to billed totals |
| Profit summary | Label as Recorded margin: billed work minus recorded expenses; show collections separately |
| Client account | One shared client balance across Hyva and JCB |
| Payment attribution | Oldest-first for pending age and vehicle/type reporting; recompute derived allocations after accepted corrections |
| Overpayment | Show client credit separately rather than a negative pending alert |
| Period statements | Opening balance, activity during the period and closing balance |
| Credit expenses | Record the expense once; settlement updates paid/cash information without another expense |
| Driver payments | One payment shared across views, with manual types and no salary formula |
| Partner entries | Contribution, withdrawal, reimbursement and profit distribution; contribution/transfer/distribution does not reduce operating margin |
| Duplicate review | Additional suspected duplicate work is not another accepted charge until confirmed |
| Conflict ownership | Involved business users only; first accepted resolution stands |
| Optional notifications | Summaries/payment broadcasts are opt-in; initial push scope is work broadcasts and conflict updates |
| Theme | System, Light or Dark with a remembered preference |
| Domain | Undecided; required for production launch, not local implementation |

## Release checks

| Area | Required evidence |
|---|---|
| Access | Four equal users, separate admin, unapproved account denied, revoked access rejected on reconnect, no cross-account cache exposure |
| Financial records | Partial payments, edits, cancellation/restoration, overpayments, credit settlement, accurate paise and no duplicated driver expense |
| Offline | Create/edit offline, reopen with queued work, interrupted upload, lost server reply, safe retry and expired-session recovery |
| Concurrency | Two offline edits, similar new trips with different fields, overlapping vehicle work, cancel-versus-edit and simultaneous resolution |
| History | Accepted writes have attributable old/new values and cannot bypass or erase history through the app |
| iPhone | Safari and installed PWA, keyboard/safe areas, both themes, System appearance, Reduce Motion, readable contrast and comfortable touch controls |
| Notifications | Correct recipients, closed-app push, denied permission, delayed event wording, expired subscriptions and links to the right review |
| Reports | All required reports reconcile with accepted records and generate/share locally without upload |
| Recovery | Encrypted backup can restore into a separate database; last backup status is real |
| Speed | Approximately three-second usable opening, 200 ms cached navigation, immediate form feedback and smooth lookup/list interaction |
| Production data | Actual users/vehicles only; no fictional transactions, mockup dates or sample opening balances |

## Prerequisites to collect during implementation

| Needed information/access | Required by |
|---|---|
| Supabase project connection and permitted setup access | Connected database testing |
| Clerk application configuration | Connected Google sign-in testing |
| Four approved Google accounts and developer/admin identity | Access provisioning and multi-user testing |
| Actual vehicle registrations/names and initial master information | Production onboarding |
| Cloudflare account and deployment access | Test deployment |
| Private GitHub repository and Actions secrets | Automated off-site backup and deployment checks |
| Chosen domain, DNS access and production Google OAuth credentials | Production launch |
| Access to the four iPhones | Installation, push and real-device acceptance |

## Sources checked when planning

Cloudflare documents [free static asset serving](https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/) and [Worker execution limits](https://developers.cloudflare.com/workers/platform/pricing/). Clerk documents its [production domain, OAuth and DNS requirements](https://clerk.com/docs/guides/development/deployment/production). Supabase documents its [Clerk integration](https://supabase.com/docs/guides/auth/third-party/clerk) and recommends [off-site exports for Free projects](https://supabase.com/docs/guides/platform/backups). Recheck provider limits at deployment rather than treating this plan as a permanent pricing guarantee.

## Progress record

On 28 October 2026, this implementation plan was saved after reviewing the workspace and agreeing on Cloudflare as the free-hosting target. At that point the interactive UI mockup and component setup existed and production work had not started. The developer will choose a domain later. No service provisioning, migration or production deployment was performed as part of saving the plan.

### Foundation implementation — 28 October 2026

The developer confirmed that Clerk and Supabase are not set up yet and asked development to continue independently. Production implementation now runs separately from the UI mockup. The UI mockup is archived in an independent `mockup/` project; its former `/ui-mockup` route has been removed. The root is the real application and shows a configuration screen until public service settings are supplied. A build check rejects known fictional mockup records and reset controls from the production bundle.

The first database migration creates membership/access policies, typed business-record payloads in a shared versioned envelope, record revisions, audit events, operation receipts, change tracking, review conflicts and notification/subscription tables. The common write function implements idempotent operations, server validation, reference checking, exact paise, independent-field merges and conflict creation. The resolution function restricts business decisions to involved users and prevents a second resolution overwriting the first.

T03 is Verified against an isolated PostgreSQL 16 database, not a connected Supabase project. Tests cover forbidden direct writes, unapproved/revoked access, immutable operation IDs, atomic audit capture, independent/stale changes, different-amount duplicate work, cancellation versus offline edits and participant-only resolution. Separate concurrent database sessions verify that simultaneous retries create one accepted record and competing edits produce one accepted change and one review. Live Clerk-issued JWT verification remains part of T01/T02/T05.

The local layer uses account-scoped Dexie databases, a durable upload queue, dependencies between queued records, stable retry IDs, version-monotonic cache writes and reconnect catch-up. Nine configuration/domain/local-data tests passed, including database reopening after a lost reply, account isolation, paused access and linked-record upload order. The mockup's separate test also passed. T04 stays In progress because service-worker offline reopening, full failed-entry/review reconciliation and physical-iPhone tests remain.

Initial production screens now use real routes and the shared data layer for saved information, Hyva/JCB work, payments and manual ledgers. Clerk and Supabase integration code is wired, but no service account or secret was provisioned. These screens are initial functional implementation, not a claim that the full workflows, accepted design polish, advanced QoL, reports, push or administration are complete.

Setup instructions and the exact local test commands are in [local development](docs/local-development.md). The final TypeScript check and production build passed; the bundle check confirmed that fictional UI-mockup records were excluded. Cloudflare's deployment dry-run also passed without provisioning a resource. No cloud migration, paid resource or production deployment was performed.
