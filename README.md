# Ledgerly — Orders & Settlements

A small full-stack orders and settlement workspace built for the CrossVal Backend / Full Stack Developer take-home.

**Live demo:** [crossval-orders-settlements-hz9bpty55-varora1406s-projects.vercel.app](https://crossval-orders-settlements-hz9bpty55-varora1406s-projects.vercel.app)

## What it supports

- Email/password sign-up and sign-in; each user can access only their own orders.
- Order creation with customer, due date, and one or more line items.
- Derived order total, amount paid, amount due, and settlement status.
- Multiple full or partial payments, payment history, and server-side over-payment prevention.
- A responsive dashboard with status filters plus an order detail/payment workflow.
- Read-only financial documents after the first payment, preventing silent divergence between the original order and settlement history.

## Status rules

All money is represented as integer cents.

| Status | Rule |
| --- | --- |
| `pending` | No recorded payments and the order is not past due. |
| `partially_paid` | A positive amount was received but amount due is still positive. |
| `paid` | Total payments equal the order total. |
| `overdue` | The due date is before today and the order is not fully paid. |

The canonical assignment flow is covered by tests: a $1,000 order receives $400, then $600, and rejects a further $1 payment.

## API

All order routes require the HTTP-only session cookie issued on sign-up/sign-in.

| Method | Route | Purpose |
| --- | --- | --- |
| `POST` | `/api/auth/signup` | Create a user and authenticated session. |
| `POST` | `/api/auth/login` | Sign in and issue an authenticated session. |
| `GET`, `POST` | `/api/orders` | List/create the current user’s orders. |
| `GET`, `PATCH`, `DELETE` | `/api/orders/:id` | Read/update/delete a current user order. |
| `POST` | `/api/orders/:id/payments` | Record one payment and recalculate the status. |

`POST /api/orders/:id/payments` validates a positive integer-cent amount on the server and rejects anything above the remaining balance. Orders cannot be edited or deleted after their first payment.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Run the rules tests with `npm test`; validate the production bundle with `npm run build`.

## Architecture and trade-offs

The app is Next.js + TypeScript, with API route handlers and a small domain module (`src/lib/orders.ts`). That module is deliberately independent of HTTP/storage and is tested directly, keeping financial rules easy to audit.

For a zero-configuration take-home deployment, this demo stores users, sessions, and orders in process memory. That makes it easy to evaluate the full workflow without provisioning a third-party database, but data is intentionally ephemeral across cold starts/redeploys and should not be treated as production storage.

For production, I would replace `src/lib/store.ts` with PostgreSQL and enforce the payment write in a transaction: lock the order row (`SELECT ... FOR UPDATE`), re-sum settlement amounts or maintain a checked balance, insert the payment, and commit. An optimistic `version` column on orders would make concurrent document updates explicit. I would also use a real password-auth provider/Argon2, signed/rotated sessions, rate limits, an immutable audit log, refunds/credit notes, currency-aware decimal handling, and CSV export.

## Project structure

```text
src/app/                         Dashboard, login, styles, and REST routes
src/lib/orders.ts                Pure money, payment, and status rules
src/lib/orders.test.ts           Assignment-rule tests
src/lib/store.ts                 Demo persistence and ownership boundary
```
