# Offline UPI

A simulated digital payment app that keeps working when your internet doesn't.

This is **not connected to real UPI, banks, or NPCI**. It's a portfolio project that explores a
question I found genuinely interesting: most payment app demos assume you're always online, but
real networks drop out, especially on mobile data. What actually happens to a payment you tried
to make in that gap?

## Why I built this

Every "digital payment" tutorial I found assumed a constant connection: fill a form, hit submit,
done. But that's not how it works outside a wifi-tethered demo. I wanted to build the boring but
important part - what a client app does the moment `navigator.onLine` flips to `false` mid-flow,
and how it recovers without losing or duplicating money once the connection comes back.

## How it works

```
ONLINE                              OFFLINE
  |                                    |
Send Payment                     Create Payment
  |                                    |
Express API                      Save to IndexedDB
  |                                    |
Validate + update balances       Marked PENDING_SYNC
  |                                    |
Supabase (atomic)                Shown in transaction list
  |                                    |
Completed                        Internet returns
                                        |
                                  Auto-sync to backend
                                        |
                                  Backend validates + processes
                                        |
                                  Completed (or Failed, with a reason)
```

The frontend detects connectivity with the browser's `online`/`offline` events. While offline, a
payment never touches the network - it's written straight to IndexedDB with a status of
`PENDING_SYNC` and a locally generated transaction ID (`OFF-20260812-8F92A1`). When the browser
comes back online, a hook picks up anything still pending and replays it against the API.

The tricky part is making sure a retried sync can't charge someone twice. Every transaction has a
client-generated ID that's unique in the database. The actual balance transfer happens inside a
single Postgres function (`process_transaction` in `database/schema.sql`) that checks for that ID
first - if it's already been processed, it just returns the existing result instead of moving
money again.

## Features

- Email/password auth with bcrypt + JWT, protected routes
- Simulated account balance (every new account starts at ₹10,000)
- Dashboard with balance, live online/offline indicator, quick actions, recent activity
- Send Money flow: search a registered user, review a payment summary, confirm
- Real offline payments via IndexedDB, not a UI simulation
- Automatic background sync when connectivity returns, with a status banner
- Duplicate-transaction protection enforced at the database level
- Transaction history with search and status filtering
- Transaction detail view
- Friendly error handling (insufficient balance, invalid amount, receiver not found, sync
  failures) instead of raw stack traces

## Tech stack

**Frontend:** React, Vite, React Router, Axios, IndexedDB (via the `idb` library)

**Backend:** Node.js, Express, JWT, bcrypt

**Database:** Supabase (PostgreSQL)

## Project structure

```
offline-upi/
├── client/               React frontend
│   └── src/
│       ├── components/   Layout, network indicator, status badges
│       ├── pages/        Login, Register, Dashboard, Send Money, Transactions
│       ├── services/     Axios API client
│       ├── hooks/        useNetworkStatus, useSyncQueue
│       ├── storage/      IndexedDB queue (all offline logic lives here)
│       ├── context/      AuthContext
│       └── utils/        formatting helpers
│
├── server/                Express backend
│   └── src/
│       ├── controllers/   route handlers
│       ├── routes/
│       ├── middleware/    auth guard, error handler
│       ├── config/        Supabase client
│       └── utils/         auth helpers, seed script
│
└── database/
    └── schema.sql          tables + the atomic payment function
```

## Setup

### 1. Create a Supabase project

Go to [supabase.com](https://supabase.com), create a free project, then open the SQL editor and
run everything in `database/schema.sql`. This creates the `users` and `transactions` tables plus
the `process_transaction` function that the backend calls for every payment.

From your Supabase project settings, grab:
- **Project URL** (Settings → API)
- **service_role key** (Settings → API - this is a secret key, keep it server-side only)

### 2. Backend

```bash
cd server
cp .env.example .env
# fill in SUPABASE_URL, SUPABASE_SERVICE_KEY, and a random JWT_SECRET
npm install
npm run dev
```

The API runs on `http://localhost:4000` by default.

Optional: seed two demo accounts so you can test a payment without registering by hand:

```bash
npm run seed
```

This creates `aditi@example.com` and `rahul@example.com`, both with password `password123`.

### 3. Frontend

```bash
cd client
cp .env.example .env
# VITE_API_URL should point at your backend, e.g. http://localhost:4000/api
npm install
npm run dev
```

Open `http://localhost:5173`.

### Environment variables

**server/.env**

| Variable | Description |
|---|---|
| `PORT` | Port for the Express server (default 4000) |
| `CLIENT_ORIGIN` | Frontend origin, for CORS |
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_SERVICE_KEY` | Supabase service role key (server-only, never expose to the client) |
| `JWT_SECRET` | Any long random string, used to sign auth tokens |

**client/.env**

| Variable | Description |
|---|---|
| `VITE_API_URL` | Base URL of the backend API |

## Testing it

1. Register two accounts (or run `npm run seed` in `server/`).
2. Log in as user A, send money to user B while online - watch both balances update and the
   transaction show as **Completed**.
3. Turn off your wifi (or use dev tools' "Offline" network throttling), send another payment.
   It never hits the network - it's written to IndexedDB and shows as **Pending Sync**
   immediately.
4. Turn the connection back on. A banner appears and the payment syncs automatically, no refresh
   needed. It becomes **Completed** once the backend processes it.
5. Try sending more than your balance - you should see "Insufficient balance." and nothing
   changes.

## Deployment

- **Frontend →Vercel:** point it at the `client/` folder, set `VITE_API_URL` to your deployed
  backend's URL.
- **Backend → Render:** point it at the `server/` folder, set the same environment variables as
  local, plus `CLIENT_ORIGIN` set to your deployed frontend's URL.
- **Database:** already hosted on Supabase, nothing extra to deploy.

## What I'd build next

- Push notifications when a synced payment settles while the app is backgrounded
- A retry backoff instead of syncing everything the instant the connection returns
- Multi-currency support (right now everything is hardcoded to INR)
