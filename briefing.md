# GaadiHisaab — Our Project Brief

**Updated:** 28 October 2026

**Stage:** The production app and database foundation are implemented and tested locally; deployment and final device verification remain.

This is our shared reference for what we are building. Update it as decisions change and work gets completed. A feature listed here is in scope; that does not mean it already works.

**How this brief is organised:** the feature sections explain the user experience, the later sections explain how we support it, and the implementation table shows what actually exists. Tables give a quick overview. The explanations underneath record the behaviour and examples we need to remember.

## The app in one minute

GaadiHisaab is an internal tracking app for **Icchamani Construction**, starting with **two Hyva trucks and one JCB**. It replaces registers and scattered notes with shared records of work, expenses and payments.

It is an **iPhone-first PWA**. Users open a link, add it to their Home Screen and use it like an app. All four business users have iPhones. The language is English and amounts are in rupees.

The original `Requirement.md` and `Feature.md` give us the feature scope. This brief includes our later changes. Their original colours, device assumptions and fixed expense categories have been superseded.

The main questions this app answers are simple: which vehicle is working, what work have we done, what money came in, what went out and which clients still owe us? Users should get those answers without maintaining separate registers or repeatedly entering familiar details.

The first deployed version gives the four users something concrete to try. Actual use will reveal refinements. That approach does not remove the documented features from scope or excuse incorrect totals, lost entries or missing history.

## People and access

| Person | Access |
|---|---|
| Four business users: owner and three partners | Same screens and equal permissions |
| You: developer and technical admin | Separate tools for managing the app |

**You are not the business owner.** You handle technical problems. Users involved in disputed business records resolve them themselves.

Everyone signs in using **Google through Clerk**. Only approved accounts can access business data. Sessions should persist between ordinary visits, so users do not log in every time they reopen the app. Expiry, revocation and logout still apply.

All four users share the business records. Personal favourites and form preferences can differ, but accepted client balances must be consistent. If a phone has unsynced changes, it needs to explain why its local view may be incomplete. Your separate admin account manages the system without making you an approver of everyday business entries.

## Hyva and JCB need different forms

| | Hyva | JCB |
|---|---|---|
| Purpose | Carry material | Work for a number of hours |
| Main details | Material, quantity and unit | Job description and hours, or start/end time |
| Place | Pickup → destination | Work site |
| Shared details | Date, client, registered vehicle, driver, amount | Date, client, registered machine, operator, amount |
| Suggestions | Familiar routes, materials and units | Familiar sites and jobs |

Hyva units include trip, brass and ton. Each trip/job is a separate entry. Several similar trips on the same day are legitimate. The date defaults to today and remains editable; the app records the creator automatically.

**Amounts are manually entered.** A previous amount can appear as a hint, but the app does not calculate charges from rates or silently fill the amount.

### A normal Hyva entry

Select the saved vehicle and client, then see the client’s familiar routes. Selecting a route can suggest materials and units previously used. Enter the actual quantity and amount, review and save. Add another keeps useful choices ready for the next trip while creating a separate record.

For example, Hyva-1 carries murum to Ramesh’s site: 5 brass with a manually entered charge. Another trip later may have exactly the same details. The app should make repeating it easy while still helping users notice accidental duplicate recording.

### A normal JCB entry

Select the machine and client, choose a familiar site or add one, describe the job and record hours or start/end times. Enter the actual agreed charge. The form should focus on work and time rather than transport routes and carrying units.

Recording six hours does not authorise an automatic charge based on a guessed hourly rate. Duration and amount are separate user inputs, with useful time calculations where the required timestamps are available.

### Starting and completing work

Users can start a trip/job and mark it completed. Everyone sees whether a vehicle is available or working. The other business users receive start/completion broadcasts.

Users can also record completed work later. We must support catching up on entries, rather than requiring everything to be entered live.

Selecting a vehicle already working should show its ongoing record. This helps avoid duplicates, but offline phones may have outdated status. These are recorded work states, not GPS locations.

The ongoing record should identify the vehicle, client, route/site, person who started it and time. Completion updates that work record rather than creating a second unrelated entry. Backdated entry, cancellation and corrections also need to leave the vehicle status consistent.

## Expenses adapt to their needs

An expense includes its date, vehicle, category, amount, payment method and optional note. Cash, UPI and Credit are included. Credit expenses stay identifiable.

Categories are **not restricted to Fuel / Maintenance / Other**. Users can add driver payments, tyres, repairs or whatever they actually need. Extra details are reusable too.

| First entry | What happens next time |
|---|---|
| Fuel with litres and fuel station | Offer those fields and familiar stations |
| Tyre replacement with size and shop | Remember those details for that category |
| Another useful field | Reuse it without creating it again |

Common fields and values become easier to reach as history grows. Users can correct suggestions. The app must avoid unnecessary duplicate fields such as “Litres” and “Liter”, and must not change old records when templates evolve.

This means remembering the structure of an expense, not blindly repeating every old value. A familiar fuel station is a useful suggestion; silently reusing an amount or litres figure could create a false expense. Fields should return as clear inputs or choices for the user to review. Fuel-specific details should not clutter every repair or driver-payment form.

Fuel litres can support price-per-litre calculations. Mileage also requires distance readings; litres alone cannot provide it.

## Clients and payments

| Feature | Included behaviour |
|---|---|
| Client list | Search; sort by name, pending or work count |
| Client profile | Work, payments, total amount, received and pending |
| Work history | Group by date, with collapsible days and day totals |
| Payment entry | Date, manually entered amount and method |
| Part payments | Save each instalment separately |
| Automatic balances | Calculate totals and pending from accepted work/payments |
| Filters | Date range and Hyva / JCB / both |
| Summary | First/last work, monthly totals, common material and vehicle |
| Sharing | Client PDF statement, payment acknowledgement and prepared WhatsApp reminder |

Payment methods include **Cash, UPI and Cheque**. Editing or cancelling accepted records updates balances. JCB entries should be called jobs/work where “trip” would be misleading.

For example, ₹20,000 of accepted work and ₹8,000 of payments gives ₹12,000 pending. A later ₹3,000 payment becomes another dated record, rather than replacing the earlier payment. The user can see how ₹11,000 received and ₹9,000 pending were reached.

The client profile should answer “what did we do, what did they pay and what remains?” Work details and day totals explain the charges; individual payments explain collections. Monthly summaries help identify patterns without hiding those original entries.

Expenses belong to vehicles and drivers. They are not automatically added to client charges.

## Driver and partner ledgers

| Ledger | What is recorded |
|---|---|
| Driver | Date, driver, salary/advance/trip payment/other, amount and note; history and totals |
| Partner | Manual records of partner money and profit-share entries |

There are no automatic salary, commission or partner-sharing formulas.

**A driver payment visible in Expenses and the driver ledger is the same payment. It counts once.**

A user can inspect one driver’s payments over a period and generate the ledger. The system records the stated payment type; it does not invent salary entitlement or a commission rule. Partner tracking follows the same principle: clear manual records and history, with no automatic decision about how profit should be divided.

## Saved information and smart shortcuts

Vehicles, clients, drivers, materials and routes are saved and reused. Users can add missing items inside forms without losing their draft. Client phone numbers are optional; drivers can have a phone number and vehicle assignment.

Vehicles have a registration number, type and name. Select them from saved records to avoid spelling differences. New vehicles should appear automatically in relevant forms and reports. Vehicles and drivers can become inactive while their history stays available.

| Shortcut | What it does |
|---|---|
| Instant suggestions | Search familiar choices from cached data on the phone |
| Recent/frequent choices | Put commonly used information within easy reach |
| Personal favourites | Pin useful vehicles, clients and routes |
| Useful defaults | Today’s date, recent choices and assigned driver where appropriate |
| Repeat entry | Copy a trip/job, review it and save a new entry |
| Add another | Keep useful selections after saving |
| Draft recovery | Preserve unfinished forms through interruptions/reopening where local data remains available |
| Similar-name hints | Suggest existing clients before creating another |
| Context | Show relevant previous amounts and client balances |

Suggestions should refresh when shared information changes. **Smart means less repeated typing. No AI service is needed.**

The business’s small customer list is an advantage: keeping permitted lookups on the phone can make suggestions immediate. New or changed shared records still need to refresh other users’ copies. A draft, a repeat entry and a possible duplicate are distinct: preserve unfinished work, deliberately reuse details for new work, and question whether separately submitted records describe one actual event.

## Home and reporting

| Area | What users see |
|---|---|
| Quick actions | Add work, expense or payment |
| Fleet | Available/working status and ongoing trip/job |
| Period | Today, this week, this month or custom |
| Money | Received, expenses, pending and profit summary |
| Vehicles | Income, expense, profit and comparisons |
| Clients | Top clients and outstanding balances |
| Charts | Expense categories, payment methods and six-month income/expense |
| Monthly summary | Expenses by category, vehicle and payment method; previous-month comparison |

Secondary detail can sit behind “See more”. A general “today’s trips” feed is not required on Home; ongoing vehicle status is separate. Pending alerts include an age and prepared WhatsApp reminder.

Period labels must explain what a figure covers. A This month chart should use that period consistently; an outstanding balance covering earlier work needs an appropriate label. Wherever practical, users should be able to open the records behind a summary. Profit, income and pending-age definitions must be consistent between Home and detailed reports.

### PDFs stay on the phone

Generate client statements, vehicle monthly reports, driver ledgers and expense summaries locally for the selected period. Users can preview, open, share or save them using supported iPhone actions.

**No generated PDF is uploaded to Supabase.** Only the underlying business records are stored there. There is no cloud PDF archive in this release.

Generating the report can require fetching data, but the file is assembled locally. The preview should identify its client/report name and period before sharing. Users can regenerate it later from saved records. Preview, Share and Save need testing in Safari and the installed PWA, including a clear response when a device cannot complete an action.

## History and transparency

| Action | History must show |
|---|---|
| Create | Initial details, person and time |
| Edit | Previous/new values, person and time |
| Cancel/restore | Person, time and reason |
| Access change | Who changed whose access and when |

Business records are cancelled, not permanently deleted. Cancelled records remain visible and are excluded from normal totals. Users can inspect a record’s history and the wider activity log. Admin/access activity has additional visibility for you.

The backend saves the accepted change and its history together. **Nobody can erase or rewrite history through the app.** This is an app-permissions rule; infrastructure-owner capabilities are separate.

Offline events retain both the recorded time and server acceptance time. Upload order or a phone’s clock must not silently decide which disputed value is correct.

A change from ₹4,000 to ₹4,500 must show both amounts, who changed it and when. “Record updated” alone is insufficient. Client and other saved-detail changes also need history where they affect understanding of work. An unresolved submission must remain distinguishable from an accepted change.

## Offline saving and sync

Offline entries stay on the phone until they can sync. Show **Waiting to sync, Synced, Failed or Needs review** clearly.

| Situation | Required behaviour |
|---|---|
| Save tapped twice | Save the submission once |
| Network drops during saving | Retry without creating another copy |
| Sync fails | Keep the entry and offer recovery |
| Connectivity returns | Sync queued work when the app can run |
| Phone lost before sync | Unsynced data may be lost; it never reached cloud backup |

Every submission needs an ID that stays the same through retries. The server must enforce this, rather than relying only on a disabled Save button.

Backups and a usable recovery process are required. Their real setup must be verified for the selected Supabase plan; selecting Free does not prove automatic backups are already covered.

The phone keeps queued work until the server confirms acceptance. If the server saved an entry but its reply was lost, the phone can safely retry the same submission. A local save must not immediately be labelled Synced.

An iPhone PWA cannot be assumed to keep every task running while closed. Sync should run when the app has the opportunity, especially after reopening or reconnecting. Waiting work stays visible so users know when to leave the app open briefly for upload.

## Conflicts and duplicates

| Problem | How we handle it |
|---|---|
| Same submission sent again | Stable submission ID prevents another saved copy |
| Two people record the same actual trip | Compare similar entries and ask involved users to review |
| Two people edit one record | Preserve their changes and stop silent overwrites |

Registration tells us it is the same vehicle, **not necessarily the same trip**. Repeated trips are valid. Overlapping actual work times provide a stronger warning where available.

If one offline user syncs after ten minutes and another after two hours, the later upload does not automatically win. Safe independent changes can be preserved; competing values need review. Quantity/unit and start/end times must be considered together. An old edit must not silently restore cancelled work.

### The involved users resolve it

Both receive a notification. Either can compare and resolve the entries. The first accepted resolution stands, and the other person is notified. If they act simultaneously, the second sees the accepted result instead of overwriting it.

For the same actual trip, keep the correct record, incorporate reviewed corrections and cancel the duplicate with a reason. For separate trips, confirm that and correct details if necessary. Preserve originals and the resolution in history.

Records remain marked **Needs review**, with a persistent review queue. You handle technical failures, not business disputes.

During an edit dispute, keep the accepted values until resolution. Suspected duplicate new entries need a visible treatment so they do not silently inflate totals; document the exact handling during implementation.

### The delayed-sync example

Two users edit the same trip offline. A reconnects after ten minutes and saves ₹4,500. B reconnects two hours later with ₹4,800. B’s upload must not replace A’s value merely because it arrived later. Preserve the second submission, mark the disagreement and notify both people.

If A changed only the driver and B changed only an unrelated note, both changes may be safely retained. If A cancelled the trip while B changed its amount, that requires review. For separate new records, compare their actual vehicle and work details: a small difference in driver, quantity or charge must not make a likely duplicate invisible.

## iPhone notifications

| Event | Recipient |
|---|---|
| Trip/job started | Other business users |
| Trip/job completed | Other business users |
| Conflict needs review | Both involved users |
| Conflict resolved | Both involved users |

These include **iPhone push notifications**, not only messages inside the app. Tapping a conflict alert opens its review screen. Keep the notification/review history inside the app too.

Onboarding guides users to Add to Home Screen and allow notifications. The discussed web-push baseline is iOS 16.4 or later. Delivery depends on connectivity and notification/Focus settings.

Offline start/completion events broadcast after sync and show the actual event time. Broadcasts help coordination but cannot eliminate conflicts.

Sync-failure alerts, changes to someone else’s entry, payment broadcasts, daily summaries and pending reminders were also suggested. Their default/optional settings are not finalised. Normal successful saves need status feedback. The server cannot report on an entry it has never received from an offline phone.

A conflict notification should explain what needs attention and open that issue directly. Vehicle broadcasts should identify the vehicle and event clearly. A delayed notification must not suggest that an old departure just happened. Muting or dismissing push does not remove the unresolved item from the app’s review queue.

## Your admin tools

| Responsibility | Included tools |
|---|---|
| Access | Approve/revoke users and oversee sessions through supported Clerk controls |
| Transparency | Inspect audit and access history |
| Recovery | Backup status, exports and recovery tools |
| App health | Failed syncs and technical errors |
| Settings | Business/app configuration |
| Infrastructure | Clerk, Supabase, hosting and billing dashboards |

Privileged corrections still need history. Business users keep their equal everyday access.

The four users should not need Clerk or Supabase dashboard access for everyday work. Your admin area provides technical oversight; provider dashboards remain for infrastructure management. Business disputes stay with the involved users even when you can inspect their technical history.

## Speed and responsiveness

| Area | Minimum target |
|---|---|
| Opening | Usable in about three seconds on a normal mobile connection |
| Previously loaded screens | Open in about 200 ms |
| Typing/tapping | Immediate feedback |
| Suggestions | Cached lookups without a network request per keystroke |
| Dashboard | Primary information first; charts do not block |
| Long history | Smooth lists and efficient loading |
| Saving | Immediate feedback plus an honest save/sync state |
| PDFs | Progress feedback without blocking unrelated tasks |

Verify these on real iPhones and representative data. Forms must work with different screen sizes, the keyboard and safe areas. Text and targets must be comfortable for use on site.

Speed includes how the app feels while waiting. Tapping Save should acknowledge the action immediately, while still distinguishing local storage from server confirmation. Revisiting a loaded screen should not unnecessarily blank its content. Cached lookups, efficient queries, indexes, suitable hosting regions and restrained dependencies support that experience.

## The design we liked

The flight-booking reference sets our direction: **good typography and hierarchy, soft rounded surfaces, warm restrained colours, strong black actions and a compact floating navigation dock**.

| Element | Direction |
|---|---|
| Typography | Main amounts and vehicle details stand out; supporting labels stay readable |
| Surfaces | Soft, light and rounded |
| Colour | Warm accents used sparingly; labels communicate meaning too |
| Actions | Strong, high-contrast primary buttons suited to each theme |
| Navigation | Floating dock with obvious selection and comfortable targets |
| Forms | Short, with contextual suggestions and expandable extra details |

The old green/red/yellow prescriptions are not fixed. Exact fonts, tokens and spacing come from design work.

### Light and dark mode are required

Both themes are part of the first release. Dark mode needs its own considered surfaces, contrast and accent treatment; it must not be a simple colour inversion. The warmth and clarity of the chosen reference should carry through both themes.

| Design area | What we expect |
|---|---|
| Light mode | Warm light backgrounds, readable dark text, clear cards and restrained accents |
| Dark mode | Layered dark surfaces, comfortable bright text and accents adjusted for dark backgrounds |
| Theme preference | Proposed implementation: System, Light and Dark, remembering the user's choice |
| Typography | A consistent size/weight scale, readable labels and clear emphasis on important values |
| Hierarchy | Primary action and key work/money information are obvious before secondary detail |
| Colour | Consistent roles for actions and statuses; readable contrast in both themes |
| Components | Inputs, menus, sheets, charts, dock, alerts and all interaction states work in both themes |

Loading, empty, offline, disabled, error, selected and conflict states are part of the design, not finishing touches. The same attention applies to small details such as icon weight, alignment, spacing, input focus and the way amounts line up. Introducing shadcn or React Bits does not mean accepting each component's default appearance; they need to feel like one app.

### Animation is part of the experience

GSAP is the selected tool for coordinated interface animation. The official GSAP skills are available for core animation, React integration, timelines, plugins, scroll behaviour, utilities and performance. Use the relevant guidance when implementing each interaction, rather than adding every plugin because it is available.

| Interaction | Intended motion |
|---|---|
| Floating dock | Clear, responsive movement of the selected state |
| Hyva/JCB switching | A smooth transition that makes the change in work context understandable |
| Sheets and panels | Consistent opening/closing with proper focus and touch handling |
| Extra form details | A clear expansion/collapse that keeps the user's place |
| Saving and work completion | Brief feedback tied to the actual save/work state |
| Theme changes | A comfortable visual transition with readable content throughout |

The final motion should be deliberately designed and tested. Essential actions must remain usable immediately; users should not wait for an entrance animation to type or save. Prefer efficient movement and opacity changes, clean up animations when leaving screens, and respect the iPhone's Reduce Motion setting. Simple component transitions can use their existing behaviour where appropriate so that two animation systems do not compete over the same element.

GSAP, React Bits, shadcn and the design skills give us useful tools. The quality bar is the finished experience: consistent composition, good typography, confident colour choices, purposeful motion and smooth use on actual iPhones.

**Home, Work, Clients, Ledgers and More** is the proposed grouping. The final dock must remain usable instead of squeezing in five destinations at any cost. Your admin area is separate.

| Proposed destination | Main purpose |
|---|---|
| Home | Vehicle status, quick actions and business overview |
| Work | Hyva/JCB records, expenses and payments |
| Clients | Balances, client history and statements |
| Ledgers | Driver and partner records |
| More | Reports, saved information, activity, account and sync status |

The dock must respect the iPhone safe area and avoid covering the final row or Save action. Form screens may need a different treatment while the keyboard is open. We are applying the reference’s visual character to our workflows, with larger supporting labels and controls where on-site use requires them.

The reference image is at `/tmp/codex-clipboard-620e3e34-8332-495d-a5cd-95ce14b2f8bc.png`; preserve a durable copy during design setup. Flighty, Copilot Money and Fleetio Go are additional references, but your supplied visual is the main preference.

## Technology and component setup

| Part | Choice/status |
|---|---|
| Format | iPhone-first PWA |
| Login | Clerk with Google |
| Database/backend | Supabase |
| Budget | Start with Supabase Free; verify limits and recovery |
| Frontend | React, TypeScript and Vite; production app separate from the standalone archived mockup/ project |
| Components | Tailwind and customised shadcn/ui |
| Extra components | React Bits |
| Themes | Light and dark mode required |
| Animation | GSAP for coordinated interface motion; official GSAP skills available |
| Hosting | Cloudflare Workers Free selected; no deployment verified |
| PDFs | Local generation using the existing jsPDF setup as a starting point |
| Offline/push | Required; still to be built |

Clerk speeds up prototyping with ready-made account screens. It does not automatically set up database permissions. Supabase must restrict data to approved accounts and enforce the user/admin boundaries. Next.js is not a requirement.

The deployed frontend lives at an HTTPS address. Clerk handles identity and sessions; Supabase holds shared records and backend rules; each phone holds its offline queue and cached data. Hiding a button is not a permission check: the backend must also reject unauthorised actions.

Starting on free plans is a budget choice. Monitor real database, storage and transfer use. Local PDF generation avoids a stored report-file archive, but fetching report data still uses backend resources. Production credentials belong in environment/provider settings, not this brief or source control.

Cloudflare was selected after the developer confirmed that free hosting is the priority. No domain is currently owned; the developer will choose a paid or free domain later. Use Cloudflare's provided address and Clerk's development environment for testing. A controlled domain or subdomain, the required DNS records and production Google OAuth credentials are needed before production launch. This is not a blocker for local implementation.

The global shadcn MCP runs `npx shadcn@latest mcp`. Project `components.json` includes `@react-bits` at `https://reactbits.dev/r/{name}.json`. Standard shadcn uses the default registry. Registration is verified; an actual component tool call still needs checking after the session loads the server.

The Awwwards-quality skill is installed globally; impeccable and the official GSAP skills are available for design and animation work. Use their guidance to achieve a polished tracking app. Cinematic scrolling and heavy effects are not requirements. GSAP and its React integration are now installed and used for UI mockup screen/dock animation.

## What actually exists today?

| Item | Verified status |
|---|---|
| `package.json` and lockfile | React/Vite, TypeScript, Tailwind, shadcn primitives, GSAP, icons, local fonts and PDF tooling installed |
| `components.json` | Present, valid JSON, React Bits configured |
| `.gitignore` | Dependencies, build output and secrets excluded |
| Global shadcn MCP | Registered and enabled |
| React app and screens | UI mockup archived as an independent mockup/ project; initial real-data routes/forms built in the main app |
| Supabase schema/policies | Migration, permissions, transactional writes and conflict routines tested on local PostgreSQL; no cloud project connected |
| Clerk app integration | SDK and membership gate wired; real Google login awaits service setup |
| Offline, conflict review and push | Account-scoped IndexedDB/queue and server conflict routines tested locally; complete PWA reopening, review UI and push still pending |
| Reports/PDF generation | Sample client statements and work summaries generated locally; full report suite remains |
| Deployment | Cloudflare configuration passes a dry-run; no live deployment |
| Git commits | None yet |

Workspace: `/home/krishna/Documents/eshi`. Component paths and aliases are configured. Only the separate UI mockup uses fictional records. The production entry point does not load those records, and the build checks for their exclusion. No project credentials, approved account list or production domain have been connected. Keep credentials out of this file and Git.

The UI mockup illustrates sample entry forms, searchable work and clients, repeat entry, completion/cancellation, local draft recovery, activity history, PDF downloads and a seeded conflict-resolution example. Full partner-ledger editing, shared adaptive templates, production audit guarantees, authentication, offline sync and push delivery remain production work. The offline switch does not claim a working sync engine.

The user inspected the interactive UI mockup and liked the visual direction, with minor refinement expected. Its purpose is to agree the interface before implementing the real app; it does not need complete product functionality. Build and model checks passed during development. Automated browser verification was blocked by a recorded localhost restriction, so full device, accessibility and performance testing remain production work.

The first production implementation adds validated public configuration, real routing, Clerk/Supabase integration code, account-scoped local storage, exact-paise financial rules and a transactional database write path. Local PostgreSQL tests verify permissions, audit capture, duplicate protection and concurrent changes. Nine local configuration/domain/sync tests and the mockup check pass. Service accounts will be created later, as the developer confirmed; live Google sign-in, cloud sync and multi-iPhone behaviour remain unverified. See tasks.md for the current milestone statuses and docs/local-development.md for setup instructions.

## Details to settle while building

**We have enough scope to start. This is not another planning round.**

| Detail | Why it needs a clear rule |
|---|---|
| Profit | Billed work minus expenses differs from cash received minus cash paid |
| Filtered balances | Reports must explain earlier work/payments and the selected period |
| Shared client payments | A payment may cover work from several vehicles |
| Credit/advances/overpayments | Avoid double counting or unexplained balances |
| Pending age | It needs an actual calculation rule |
| Partner entry types | Manual entries still need consistent meanings |
| Adaptive fields | Keep reuse helpful without cluttering forms |
| Unresolved duplicates | Totals must show their treatment clearly |
| Backups | Restore needs to work on the chosen plan |

Document working assumptions during implementation. Raise a focused question only where the answer materially affects business behaviour. Routine engineering decisions do not need another discovery questionnaire.

## Outside this release

| Item | Status |
|---|---|
| Maps/location and GPS | Future scope |
| Photo attachments | Discussed, not included |
| Cloud PDF archive | Excluded |
| GST and vehicle-document reminders | Excluded |
| Other businesses and old data import | Excluded |
| Automatic rates, salary, commission or partner splits | Excluded |

The original clean-start date was 1 November 2026. Its earlier three-day deadline is historical context. Conversational build estimates were rough guesses, not delivery commitments.

## Next work and keeping this brief current

The ordered implementation plan, task statuses, dependencies and release checks are maintained in [tasks.md](tasks.md). It also records explicit implementation defaults for the financial and sync behaviours discussed above. This briefing remains the readable product reference; the task file records execution progress.

Design Home, Hyva, JCB, Expense and Payment flows in the selected direction. Establish typography, spacing, colour roles and component states in both themes, then define the interface motion. Include loading, draft, offline, saved and conflict states. Scaffold the app, connect real backend workflows and complete clients, ledgers, reporting and admin.

Verify totals, permissions, history, duplicate saves, similar trips, offline edits, cancellation, simultaneous resolution, PDFs, notifications and recovery. Check visual quality, contrast, keyboard behaviour, animation performance and Reduce Motion in both light and dark mode. Deploy the first working app for the four users and refine it from actual use.

**When something changes, update the relevant section, this file’s date and the status table. Planned work becomes completed only after verification.**
