# Cusica International — Ajalli Table Water ERP

A full Next.js application for daily factory operations: stock, production,
driver & factory sales, customer incentives, expenses, approvals, and
reporting. This replaces the original single-file HTML/JS prototype
(`cusica-erp.html`, kept in this folder for reference) with a real app: a
Postgres/SQLite-backed database via Prisma, hashed-password accounts via
NextAuth, and one page per route instead of a client-side single-page shell.

## Stack

- **Next.js 16** (App Router, TypeScript), Server Components for reads,
  Server Actions for mutations.
- **SQLite + Prisma** — `prisma/schema.prisma` is the source of truth for
  the data model; `prisma/dev.db` is the local database file (gitignored).
- **NextAuth v4** (Credentials provider), passwords hashed with `bcryptjs`,
  JWT sessions. Route protection lives in `src/proxy.ts` (Next.js 16 renamed
  `middleware.ts` to `proxy.ts`).
- **Chart.js** via `react-chartjs-2` for the dashboard/reports/production
  trend charts.
- Hand-rolled CSS (`src/app/globals.css`) porting the prototype's dark
  purple design system — no Tailwind/UI-kit dependency for the visual layer.

## Getting started

```bash
npm install
npx prisma migrate dev    # creates prisma/dev.db and applies the schema
npx prisma db seed        # seeds default incentive tiers
npm run dev                # runs on http://localhost:3001
```

Copy `.env.example` to `.env` and adjust if needed. Key variables:

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | SQLite file path, defaults to `file:./dev.db` |
| `NEXTAUTH_SECRET` | Session encryption secret — replace the default for anything beyond local dev |
| `NEXTAUTH_URL` | Must match the port the app runs on (`3001` by default; the dev/start scripts pin the port since `3000` is commonly taken) |
| `SUPER_ADMIN_EMAIL` | The one email that always becomes Super Admin on registration |

There's no seeded user account — register the first account (ideally with
the `SUPER_ADMIN_EMAIL` address) from `/register`.

## Roles
| Role | Can do | Needs approval? |
|---|---|---|
| Sales Staff | Log daily records | Yes (Admin/Super Admin) |
| Editor | Log daily records | Yes (Admin/Super Admin) |
| Admin Staff | Log daily records, add drivers, add customers | Yes (Admin/Super Admin) |
| Admin | Everything above, approve pending items, view revenue, print reports | No |
| Super Admin | Everything Admin can do, plus Settings (incentive tiers, production requirement) | No |

The email in `SUPER_ADMIN_EMAIL` is forced to the Super Admin role at
registration (and re-checked on every login), regardless of the role picked
in the sign-up form — there's no Super Admin option in that dropdown.

## Core logic
- **Opening stock** for a new daily record = closing stock of the last
  **approved** record (0 if there isn't one yet).
- **Closing stock** = opening + bags produced − factory sales − driver sales
  − leakages. Pump water is a separate ₦ revenue line and doesn't draw from
  the bag stock chain.
- Anything entered by Sales Staff, Editor, or Admin Staff is `PENDING` until
  an Admin/Super Admin approves it in **Approvals**. Only approved records
  count toward stock, dashboard totals, incentive totals, and reports.
- **Revenue** (Admin/Super Admin only) = sachet-bag sales + pump water sales
  − that period's expenses (rolls, packing bags, gas, other), recalculated
  per range.
- **Customer and driver weekly/yearly bag totals are derived by aggregation**
  from approved daily records (production lines, factory sales, driver
  sales) rather than stored as a running counter — there's no risk of
  double-counting on approval, and it's always consistent with the
  underlying records.

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
4. **A real database.** Data persists in SQLite via Prisma instead of the
   prototype's browser-session key-value storage.

Everything else — the approval flow, the stock chain formula, the
per-sale incentive tier table, the weekly thresholds (500 bags/customer,
1000 bags/driver), pump-water-as-a-₦-amount, print/export, the visual
design — is ported 1:1 from the prototype.

## Pages
- **Dashboard** — live stock, today's sales, this week's total produced,
  this week's revenue (Admin+), pending approvals count, 14-day sales/stock
  charts, top drivers, incentive watch, recent activity.
- **Daily Record** (`/daily-record`) — the day's entry form (production,
  factory sales + optional customer link, pump water, driver sales + optional
  customer link, leakages, expenses) and history table.
- **Total Produced** (`/production`) — bags produced by day and by packer,
  filterable week/month/year/overall, with a chart and packer leaderboard.
- **Drivers** (`/drivers`) — add/approve drivers; weekly bags computed
  automatically from approved driver-sale records.
- **Customers** (`/customers`) — add customers; weekly mail generator
  (in-app preview only, see Limitations).
- **Incentive Tracking** (`/incentives`) — Customers/Drivers sub-tabs with
  this week's bags, a progress bar toward the bonus threshold, bonus status,
  all-time weeks-qualified count, and (for customers) year-to-date bags.
- **Approvals** (`/approvals`, Admin+) — pending daily records and pending
  drivers, approve/reject.
- **Reports** (`/reports`) — week/month/year/overall totals, sales trend
  chart, record detail table, print/Save-as-PDF.
- **Settings** (`/settings`, Super Admin) — editable customer incentive tier
  table, and a production requirement calculator (expected demand + safety
  buffer % vs current stock — not persisted, just a quick calculation).

## Known limitations
1. **Weekly customer mail is composed, not delivered.** `/customers`
   generates the per-customer weekly summary + bonus flag in-app, but
   actually emailing it out on a schedule would need a background job wired
   to a real provider (SendGrid, Mailgun, etc.) — out of scope here.
2. **Local dev only.** No deployment configuration (hosting, managed
   Postgres, etc.) is set up yet.
3. **One record per date.** The `date` field is unique on `DailyRecord` —
   attempting a second entry for an existing date returns a validation
   error rather than allowing duplicates (the prototype allowed duplicates
   silently, which was a bug, not a feature).
