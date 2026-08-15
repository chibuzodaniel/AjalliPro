# Cusica International — Ajalli Table Water ERP

A full Next.js application for daily factory operations: stock, production,
driver & factory sales, customer incentives, expenses, approvals, and
reporting. This replaces the original single-file HTML/JS prototype
(`cusica-erp.html`, kept in this folder for reference) with a real app: a
Postgres database via Prisma, hashed-password accounts via NextAuth, real
weekly customer email delivery via Brevo, and one page per route instead
of a client-side single-page shell.

## Stack

- **Next.js 16** (App Router, TypeScript), Server Components for reads,
  Server Actions for mutations.
- **Postgres + Prisma** — `prisma/schema.prisma` is the source of truth for
  the data model. Works with any Postgres provider (Vercel Postgres/Neon,
  Supabase, Railway, a local instance, etc.) via `DATABASE_URL`.
- **NextAuth v4** (Credentials provider), passwords hashed with `bcryptjs`,
  JWT sessions. Route protection lives in `src/proxy.ts` (Next.js 16 renamed
  `middleware.ts` to `proxy.ts`).
- **Brevo** (`@getbrevo/brevo`) for real weekly customer email delivery,
  triggered manually from the Customers page.
- **Chart.js** via `react-chartjs-2` for the dashboard/reports/production
  trend charts.
- Hand-rolled CSS (`src/app/globals.css`) porting the prototype's dark
  purple design system — no Tailwind/UI-kit dependency for the visual layer.

## Getting started (local dev)

You need a Postgres database — a free one from [Neon](https://neon.tech) or
[Supabase](https://supabase.com) works fine, or point at a Vercel Postgres
database you've already created (pull its URL with `vercel env pull`).

```bash
npm install
cp .env.example .env        # then fill in DATABASE_URL at minimum
npx prisma migrate deploy    # applies the schema to your database
npx prisma db seed           # seeds default incentive tiers
npm run dev                  # runs on http://localhost:3001
```

There's no seeded user account — register the first account (ideally with
the `SUPER_ADMIN_EMAIL` address) from `/register`.

### Environment variables

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Pooled Postgres connection string (app runtime — via PgBouncer on Neon) |
| `DATABASE_URL_UNPOOLED` | Direct/unpooled connection string, used only for `prisma migrate deploy` (see `directUrl` in `prisma/schema.prisma`) |
| `NEXTAUTH_SECRET` | Session encryption secret — generate with `openssl rand -base64 32`, replace the placeholder for anything beyond local dev |
| `NEXTAUTH_URL` | Local dev default is `http://localhost:3001`; set to your deployed URL in production |
| `SUPER_ADMIN_EMAIL` | The one email that always becomes Super Admin on registration |
| `BREVO_API_KEY` | Optional locally — required for the "Send weekly mail now" button on Customers to actually send |
| `BREVO_FROM_EMAIL` | Must be a sender address verified with Brevo (single-sender or domain auth) |

Schema migrations must run over a **direct** (non-pooled) connection, not
the pooled one — running them over a pooled PgBouncer connection can fail
with `prepared statement "s0" already exists` (Prisma Migrate specifically)
or a `SET search_path` that silently doesn't persist. `directUrl` in
`prisma/schema.prisma` handles this automatically as long as
`DATABASE_URL_UNPOOLED` is set; if your provider only gives you one
connection string, use it for both variables. (Confirmed while building
this: hit exactly this error against a Postgres-wire-protocol test server
before adding `directUrl`.)

## Deploying to Vercel

1. Push this repo to GitHub (already done if you're reading this from the
   deployed repo) and import it in the Vercel dashboard.
2. Add a Postgres database to the project — easiest is Vercel's **Storage →
   Postgres** tab (backed by Neon), which sets `DATABASE_URL` for you
   automatically. If you're using an external Postgres instead, add
   `DATABASE_URL` manually in **Settings → Environment Variables**.
3. Add the rest of the environment variables from the table above
   (`NEXTAUTH_SECRET`, `NEXTAUTH_URL` set to your `*.vercel.app` — or custom
   — domain, `SUPER_ADMIN_EMAIL`, and the Brevo pair once you have them)
   for the Production environment (and Preview, if you want previews to work
   too).
4. Deploy. `vercel.json` sets the build command to
   `prisma migrate deploy && next build`, so your database schema is applied
   automatically on every deploy — no separate manual migration step needed
   once `DATABASE_URL` is set.
5. After the first deploy, visit `/register` on your production URL and
   create the Super Admin account.

Note: this repo's migration history was authored against Postgres directly
(`prisma migrate diff` offline, no local Postgres was available in the dev
environment this was built in) — it's schema-correct SQL, but running
`prisma migrate deploy` against your real database on the first deploy is
the actual first live test of it. If anything's off, `prisma db push` from
a machine with `DATABASE_URL` set is the fallback to sync the schema
directly.

## Roles
| Role | Can do | Needs approval? |
|---|---|---|
| Sales Staff | Log daily records | Yes (Admin/Super Admin) |
| Editor | Log daily records | Yes (Admin/Super Admin) |
| Admin Staff | Log daily records, add drivers, add customers, send weekly mail | Yes (Admin/Super Admin) |
| Admin | Everything above, approve pending items, view revenue, print reports | No |
| Super Admin | Everything Admin can do, plus Settings (incentive thresholds, tiers, email template) | No |

The email in `SUPER_ADMIN_EMAIL` is forced to the Super Admin role at
registration (and re-checked on every login), regardless of the role picked
in the sign-up form — there's no Super Admin option in that dropdown.

Sessions auto-logout after 2 minutes of no mouse/keyboard/scroll/touch
activity anywhere in the authenticated app, redirecting to `/login`.

## Core logic
- **Opening stock** for a new daily record = closing stock of the last
  **approved** record (0 if there isn't one yet). **Super Admin can override**
  this on the entry form — useful for the first-ever record, or a correction
  — everyone else gets the computed value read-only. Records can be
  backdated freely (the date field has no restriction), so a Super Admin can
  log a missed prior day with the real opening count and later days will
  chain off its closing stock automatically.
- **Closing stock** = opening + bags produced − factory sales − driver sales
  − leakages. Pump water is a separate ₦ revenue line and doesn't draw from
  the bag stock chain.
- Anything entered by Sales Staff, Editor, or Admin Staff is `PENDING` until
  an Admin/Super Admin approves it in **Approvals**. Only approved records
  count toward stock, dashboard totals, incentive totals, and reports.
- **Expenses are itemized**, not fixed categories — each daily record has a
  free-form list of expense lines (description + ₦ amount), each marked
  paid or unpaid **at entry time** by whoever logs the record. The
  **Expenses** page (Admin+) lists every expense line across every day,
  filterable by paid/unpaid, with a "Mark as paid"/"Mark unpaid" toggle for
  settling them later.
- **Net income** (Admin/Super Admin only) = sachet-bag sales + pump water
  sales − that period's total expenses (regardless of paid/unpaid status —
  an incurred expense reduces net income whether or not it's been settled
  yet), recalculated per range.
- **Customer and driver weekly/yearly bag totals are derived by aggregation**
  from approved daily records (production lines, factory sales, driver
  sales) rather than stored as a running counter — there's no risk of
  double-counting on approval, and it's always consistent with the
  underlying records.
- **Weekly incentive thresholds are configurable** (Settings, Super Admin
  only) — the customer bags/week → bonus bags and driver bags/week → bonus
  bags pairs aren't hardcoded; Dashboard, Drivers, Customers, Incentive
  Tracking, and the weekly mail all read the current configured values.

## Pages
- **Dashboard** — live stock, today's sales, today's and this week's
  production, this week's net income (Admin+), pending approvals count,
  14-day sales/stock charts, top drivers, incentive watch, recent activity.
- **Daily Record** (`/daily-record`) — the day's entry form (production,
  factory sales + optional customer link, pump water, driver sales + optional
  customer link, leakages, expenses) and history table.
- **Total Produced** (`/production`) — bags produced by day and by packer,
  filterable week/month/year/overall or a custom date range, with a chart
  and packer leaderboard.
- **Drivers** (`/drivers`) — add/approve drivers; weekly bags computed
  automatically from approved driver-sale records.
- **Customers** (`/customers`) — add customers; preview and send the real
  weekly summary email via Brevo.
- **Incentive Tracking** (`/incentives`) — Customers/Drivers sub-tabs with
  this week's bags, a progress bar toward the bonus threshold, bonus status,
  all-time weeks-qualified count, and (for customers) year-to-date bags.
- **Approvals** (`/approvals`, Admin+) — pending daily records and pending
  drivers, approve/reject.
- **Expenses** (`/expenses`, Admin+) — every expense line across every daily
  record, filterable by paid/unpaid/all, with paid-total/unpaid-total KPIs
  and a mark-paid/unpaid toggle.
- **Reports** (`/reports`) — week/month/year/overall totals, sales trend
  chart, record detail table, print/Save-as-PDF.
- **Settings** (`/settings`, Super Admin) — editable weekly incentive
  thresholds, per-sale incentive tier table, weekly mail email template
  (subject/intro/signature), and a production requirement calculator
  (expected demand + safety buffer % vs current stock — not persisted, just
  a quick calculation).

## Deviations from the original prototype (intentional)

1. **Customer weekly/year-to-date bag tracking actually works now.** In the
   prototype, `customer.weeklyBags` was initialized but nothing ever
   incremented it, because factory sales weren't linked to a customer — so
   Incentive Tracking's customer tab and the weekly mail generator were
   permanently stuck at 0. The daily record form now has an optional
   customer selector on the factory-sale section (and on each driver-sale
   row), and weekly/yearly bags are computed from those links.
2. **"Today" uses the local calendar date**, not UTC. The prototype's
   `toISOString().slice(0,10)` could report the wrong date around midnight
   in Lagos time (UTC+1).
3. **Real authentication.** Sign-in is hashed-password accounts via
   NextAuth, not a name/email/role picker with no verification.
4. **A real database.** Data persists in Postgres via Prisma instead of the
   prototype's browser-session key-value storage.
5. **Weekly customer mail actually sends**, via Brevo, instead of being
   a preview-only feature — see Known limitations for what's still manual.
6. **Weekly incentive thresholds are editable**, not hardcoded — the
   prototype's Settings page described them as "fixed company policy" with
   no way to change them.

Everything else — the approval flow, the stock chain formula, the per-sale
incentive tier table, pump-water-as-a-₦-amount, print/export, the visual
design — is ported 1:1 from the prototype.

## Known limitations
1. **Weekly mail sending is manual, not scheduled.** An Admin/Admin
   Staff/Super Admin clicks "Send weekly mail now" on the Customers page —
   there's no cron/scheduled job firing it automatically every week. (Adding
   a Vercel Cron route that calls the same send logic would be the natural
   next step if automatic sending is wanted.)
2. **One record per date.** The `date` field is unique on `DailyRecord` —
   attempting a second entry for an existing date returns a validation
   error rather than allowing duplicates (the prototype allowed duplicates
   silently, which was a bug, not a feature).
