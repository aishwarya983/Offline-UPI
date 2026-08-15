# Troubleshooting Guide - Offline UPI

A practical guide to diagnosing and fixing common issues in the Offline UPI project.

---

## 1. Starting Client and Server Locally

### Prerequisites
- Node.js installed (v16+)
- Supabase project created and configured
- `.env` files in both `server/` and `client/` directories

### Starting the Server

**1. Set up server environment:**
```bash
cd server
cp .env.example .env
# Edit .env with your Supabase credentials and JWT_SECRET (see section 2)
```

**2. Install dependencies:**
```bash
npm install
```

**3. Run the server:**
```bash
npm run dev    # Development mode (auto-reload on file changes)
npm start      # Production mode
```

**Expected output:**
```
Offline UPI API running on port 4000
```

**Server listens on:**
- Local: `http://localhost:4000/api`
- Health check: `http://localhost:4000/health` (returns `{"ok":true}`)

### Starting the Client

**1. Set up client environment:**
```bash
cd client
cp .env.example .env
# Edit .env with VITE_API_URL=http://localhost:4000/api
```

**2. Install dependencies:**
```bash
npm install
```

**3. Run the development server:**
```bash
npm run dev
```

**Expected output:**
```
VITE v... ready in ... ms

➜  Local:   http://localhost:5173/
```

**Client runs on:**
- Local: `http://localhost:5173`
- Default API: `http://localhost:4000/api`

### Seeding Demo Data

To create demo accounts for testing:
```bash
cd server
npm run seed
```

**Output example:**
```
Created aditi@example.com / password: password123
Created rahul@example.com / password: password123
```

**Demo accounts start with ₹10,000 balance each.**

### Troubleshooting Startup

**Server won't start:**
- Check if port 4000 is already in use: `lsof -i :4000` (macOS/Linux)
- Try changing port in code or kill existing process
- Verify `.env` has `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `JWT_SECRET`

**Client won't start:**
- Check if port 5173 is already in use: `lsof -i :5173` (macOS/Linux)
- Delete `node_modules` and run `npm install` again
- Clear Vite cache: `rm -rf .vite`

**API not reachable from client:**
- Verify server is running on port 4000
- Check `VITE_API_URL` in `client/.env` is correct
- Ensure both have the same base URL (e.g., `http://localhost:4000/api`)

---

## 2. Supabase/Environment Configuration

### Required Environment Variables

**Server (`server/.env`):**
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
JWT_SECRET=your-secret-here
CLIENT_ORIGIN=http://localhost:5173
PORT=4000
```

**Client (`client/.env`):**
```
VITE_API_URL=http://localhost:4000/api
```

### Getting Supabase Credentials

1. Go to [supabase.com](https://supabase.com) and create a project
2. In Project Settings > API, copy:
   - **Project URL** → `SUPABASE_URL`
   - **Service Role (secret key)** → `SUPABASE_SERVICE_KEY`
   - ⚠️ **Never use the public key on the backend**
3. Generate a strong JWT secret:
   ```bash
   openssl rand -hex 32  # macOS/Linux
   # or just use a random string like: my-secret-key-should-be-very-long-and-random
   ```

### Setting Up Supabase Database

1. In Supabase, go to SQL Editor
2. Run the schema from `database/schema.sql`:
   - Copy entire contents
   - Paste into Supabase SQL Editor
   - Execute

**Schema creates:**
- `users` table (with balance, password_hash, email unique constraint)
- `transactions` table (with status check, indexes)
- `process_transaction()` PostgreSQL function (atomic payment processor)

### Common Configuration Problems

**"Missing SUPABASE_URL or SUPABASE_SERVICE_KEY"**
- Solution: Check `.env` file exists in `server/` directory
- Verify variables are not commented out
- Ensure no leading/trailing spaces in values

**"Invalid JWT secret"**
- Solution: Regenerate with `openssl rand -hex 32`
- Must be set before server starts
- Changing it invalidates all existing tokens

**"CORS error: Origin not allowed"**
- Solution: Set `CLIENT_ORIGIN` in `server/.env` to your client URL
- Default: `http://localhost:5173`
- For production, update to your actual client domain

**Supabase connection timeout**
- Check internet connection
- Verify `SUPABASE_URL` is correct (no trailing slashes)
- Confirm project is active in Supabase dashboard

**Database query errors in server logs**
- First run `database/schema.sql` to create tables
- Check Supabase has a `public` schema
- Verify `SUPABASE_SERVICE_KEY` is the Service Role key (not public key)

---

## 3. Login/Authentication Problems

### Common Login Errors

**"You need to be logged in"**
- You're making an API request without a valid token
- Solution: Log in first, then make requests
- Check that `localStorage.getItem("offline_upi_token")` has a value

**"Your session has expired. Log in again"**
- JWT token is invalid or expired (expires after 7 days)
- Solution: Log out and log in again
- Tokens in `localStorage` will be cleared

**"Email or password incorrect"**
- Check capitalization of email (database is case-sensitive)
- Verify password is correct
- If stuck, use `npm run seed` to create known test accounts

**Registration fails with no error**
- Email already exists (must be unique)
- Try with a different email or use timestamp in email: `user.123456@example.com`
- Server checks password strength; ensure it's valid

### How Authentication Works

1. **Register**: Email + password → hashed with bcrypt, stored in Supabase
2. **Login**: Email + password → compared against hash → JWT token returned
3. **API Calls**: Token stored in localStorage → sent in `Authorization: Bearer <token>` header
4. **Verification**: Server verifies JWT signature, extracts user ID
5. **Session Duration**: Tokens valid for 7 days

### Debugging Authentication

**Check if logged in:**
```javascript
// In browser DevTools console
localStorage.getItem("offline_upi_token")
// Returns: "eyJ..." (token) or null (not logged in)
```

**Manually test login API:**
```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"aditi@example.com","password":"password123"}'
# Response: {"user":{"id":"...","name":"Aditi Rao","email":"aditi@example.com"},"token":"eyJ..."}
```

**Check token validity:**
```javascript
// In browser console
const token = localStorage.getItem("offline_upi_token");
try {
  const payload = JSON.parse(atob(token.split('.')[1]));
  console.log("Token expires:", new Date(payload.exp * 1000));
} catch (e) {
  console.log("Invalid token format");
}
```

---

## 4. Offline Payment Queue Issues

### Understanding the Queue

Payments made while offline are stored in **IndexedDB** (browser's local storage):
- Database name: `offline-upi`
- Store name: `pending_transactions`
- Status field: `PENDING_SYNC`, `PROCESSING`, `FAILED`, or `COMPLETED`
- Synced transactions are removed from IndexedDB (server is source of truth)

### Common Queue Problems

**Queued payment doesn't appear after syncing**
- This is correct! Once synced successfully, the payment is removed from IndexedDB
- Check the Transactions page - it should appear in the server transaction list
- Look for status `COMPLETED` with today's date

**Queued payment shows FAILED and doesn't retry**
- Failed payments auto-retry when connection is restored
- Go online and wait a few seconds
- Check if sync banner appears at top of page
- If still failed, see section 7 below

**Too many payments in the queue**
- Queue stores all non-completed items (PENDING_SYNC, PROCESSING, FAILED)
- This is normal when offline
- They'll sync once connection is restored
- Don't worry - blockchain-style duplicates are impossible (server checks client_transaction_id)

### Inspecting IndexedDB Queue

**From Browser DevTools:**
1. Open DevTools (F12)
2. Go to Application → IndexedDB → offline-upi → pending_transactions
3. View all queued transactions

**Via JavaScript Console:**
```javascript
// See all queued transactions
const db = await window.indexedDB.databases();
console.log(db);

// Or use the app's built-in function:
import { getAllQueuedTransactions } from './src/storage/offlineQueue.js';
const queue = await getAllQueuedTransactions();
console.log(queue);
```

**Export queue for debugging:**
```javascript
// Copy to console
(async () => {
  const db = await window.indexedDB.databases();
  const store = db.pending_transactions;
  if (store) {
    const items = await store.getAll();
    console.log(JSON.stringify(items, null, 2));
  }
})();
```

### Clearing the Queue (Debugging Only)

⚠️ **Warning**: Only do this if you understand IndexedDB won't have lost data!

```javascript
// In browser console - ONLY for testing/debugging
indexedDB.deleteDatabase('offline-upi');
location.reload();
```

---

## 5. IndexedDB/Pending Transaction Inspection

### What IndexedDB Stores

Each pending transaction contains:
```javascript
{
  clientTransactionId: "OFF-20260815-ABC123",  // Unique ID, prevents duplicates
  receiverId: "uuid",                          // Receiver's account ID
  receiverLabel: "Alice",                      // Receiver's name
  amount: 500,                                 // Payment amount
  note: "Lunch money",                         // Optional note
  ownerId: "uuid",                             // Sender's account ID
  status: "PENDING_SYNC",                      // One of 4 states
  createdAt: "2026-08-15T10:30:45.123Z",       // ISO timestamp
  attempts: 0,                                 // Retry count
  lastError: null,                             // Error message if failed
}
```

### Monitoring Queue Status

**Real-time monitoring (DevTools):**
1. Application → IndexedDB → offline-upi → pending_transactions
2. Refresh to see updates
3. Watch status change as sync happens

**From code (for debugging):**
```javascript
import { getAllQueuedTransactions } from './src/storage/offlineQueue.js';

async function checkQueue() {
  const all = await getAllQueuedTransactions();
  const byStatus = {};
  
  for (const tx of all) {
    if (!byStatus[tx.status]) byStatus[tx.status] = [];
    byStatus[tx.status].push({
      id: tx.clientTransactionId,
      amount: tx.amount,
      error: tx.lastError,
    });
  }
  
  console.log(byStatus);
}

checkQueue();
```

### Finding Failed Transactions

```javascript
import { getAllQueuedTransactions } from './src/storage/offlineQueue.js';

async function findFailed() {
  const all = await getAllQueuedTransactions();
  const failed = all.filter(tx => tx.status === 'FAILED');
  
  failed.forEach(tx => {
    console.log(`${tx.clientTransactionId}: ${tx.lastError} (attempt ${tx.attempts})`);
  });
}

findFailed();
```

### Understanding Transaction States

| State | Meaning | Next Step |
|-------|---------|-----------|
| `PENDING_SYNC` | Waiting to sync to server | Connect to internet |
| `PROCESSING` | Currently syncing with server | Wait for completion |
| `FAILED` | Sync failed (see lastError) | Auto-retries on connection restore |
| `COMPLETED` | Successfully synced | Removed from queue |

Note: `COMPLETED` items are automatically removed from IndexedDB after successful sync.

---

## 6. Offline → Online Synchronization Problems

### How Sync Works

1. **Detection**: Browser's `navigator.onLine` event triggers
2. **Fetch Queue**: App loads all `PENDING_SYNC` and `FAILED` items from IndexedDB
3. **Mark Processing**: Marks items as `PROCESSING` before sending
4. **Send Batch**: Sends all to `/api/transactions/sync` endpoint
5. **Process Results**: For each item:
   - Success → Remove from queue, update balance
   - Failure → Mark as `FAILED`, store error message
6. **Show Banner**: Display sync summary (X synchronized, Y failed)

### Sync Doesn't Happen

**Problem: Offline payments don't sync when connection returns**

**Checklist:**
1. Verify you're online: Check browser shows "Back online" indicator
2. Give it 3-5 seconds for auto-sync to trigger
3. Refresh the page (F5) to manually trigger sync
4. Check Network tab in DevTools for `/api/transactions/sync` request

**If sync still doesn't happen:**
- Check server is running and accessible
- Verify `VITE_API_URL` in client `.env` is correct
- Look at browser console for error messages

### Sync Fails with "Network Error"

**Cause**: Server unreachable

**Solutions:**
- Check server is running: `curl http://localhost:4000/health`
- Verify firewall isn't blocking port 4000
- Check `VITE_API_URL` matches server location
- Restart both server and client

### Sync Fails with Specific Payment Error

**Common errors:**
- "Insufficient balance" - User doesn't have enough funds to send
- "Receiver not found" - Recipient account doesn't exist
- "Invalid amount" - Payment amount is ≤ 0 or non-numeric
- "You can't send money to yourself" - Sender = Receiver

**Solutions:**
- Review the transaction (Dashboard or Transactions page)
- See error message displayed below transaction in red
- Fix the issue (e.g., add funds) and sync will auto-retry

### Sync Shows Progress but Never Completes

**Problem: Sync banner says "Syncing..." but never finishes**

**Causes & Fixes:**
- Server is slow or hung: Restart server with `npm run dev`
- Network is unstable: Wait for stable connection
- Browser cache issue: Clear cache (DevTools → Network → Disable cache)
- JWT token expired: Log out and log back in

### Verify Sync Manually

**Test sync via curl (all must be online for this to work):**
```bash
# 1. Get a valid token by logging in
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"aditi@example.com","password":"password123"}'

# 2. Use token in sync request (replace TOKEN and IDs)
curl -X POST http://localhost:4000/api/transactions/sync \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "transactions": [{
      "clientTransactionId": "OFF-20260815-TEST1",
      "receiverId": "receiver-uuid",
      "amount": 100,
      "note": "test"
    }]
  }'

# Response: {"results":[{"clientTransactionId":"...","success":true/false,"error":"..."}]}
```

---

## 7. FAILED Transaction Retry Behavior

### How Retries Work

1. **First failure**: Transaction marked `FAILED`, error message stored
2. **Auto-retry on online**: When internet returns, FAILED items are included in sync
3. **Increment attempts**: `attempts` counter increases with each retry
4. **Permanent failure**: If still fails after retry, stays `FAILED` until user fixes root cause

### Why a Payment Might Stay FAILED

| Reason | Permanent? | Fix |
|--------|-----------|-----|
| Network error | No | Automatic retry on reconnect |
| Insufficient balance | Yes (until funds added) | Add balance, then retry |
| Receiver not found | Yes | Verify recipient exists |
| Invalid amount | Yes | Use valid amount (> 0) |
| Duplicate (same ID) | No | Should never happen | 

### Retrying a FAILED Payment

**Automatic (built-in):**
- Transaction stays in queue with `FAILED` status
- When connection returns, auto-sync includes it
- See sync banner for results

**Manual (if auto-retry doesn't work):**
1. Refresh the page (F5)
2. This re-triggers the sync hook
3. Sync banner will show result

### Monitoring Retry Attempts

**Check retry count:**
```javascript
import { getAllQueuedTransactions } from './src/storage/offlineQueue.js';

async function checkRetries() {
  const all = await getAllQueuedTransactions();
  all.forEach(tx => {
    if (tx.status === 'FAILED') {
      console.log(`${tx.clientTransactionId}: ${tx.attempts} attempts, error: ${tx.lastError}`);
    }
  });
}

checkRetries();
```

### Understanding Sync Banner Messages

**During sync:**
- "Syncing X payments..." (shows count of items being synced)

**Success:**
- "✓ X payments synchronized" (all succeeded)

**Partial failure:**
- "✓ X synchronized. Y payments failed — will retry automatically" (some failed)

**All failed:**
- "Z payments failed — will retry automatically" (all failed)

---

## 8. Common API/Network Errors

### "CORS error: Origin not allowed"

**Cause**: Client and server don't have matching CORS configuration

**Solution:**
```bash
# In server/.env, set CLIENT_ORIGIN to your client URL:
CLIENT_ORIGIN=http://localhost:5173

# Or for production:
CLIENT_ORIGIN=https://yourfrontend.com

# Then restart server
```

### "401 - You need to be logged in"

**Cause**: No authorization token sent with request

**Solution:**
- Check you're logged in (token in localStorage)
- Verify `Authorization` header is being sent
- Look in DevTools Network tab to see request headers

### "401 - Your session has expired"

**Cause**: JWT token is invalid or expired (7 day expiry)

**Solution:**
```javascript
// Check token expiry in console
const token = localStorage.getItem("offline_upi_token");
const payload = JSON.parse(atob(token.split('.')[1]));
const expiryDate = new Date(payload.exp * 1000);
console.log("Token expires at:", expiryDate);
```

**To fix**: Log out, clear localStorage, and log in again

### "404 - Not found"

**Cause**: API endpoint doesn't exist or URL is wrong

**Solution:**
- Verify `VITE_API_URL` in `client/.env` is correct
- Check server is running on correct port (4000)
- Verify path is correct (e.g., `/api/transactions`, not `/transactions`)

### "500 - Something went wrong"

**Cause**: Server error (not a client issue)

**Debug:**
1. Check server console for error logs
2. Verify `.env` has all required variables
3. Restart server: `npm run dev`
4. Check Supabase credentials are correct

### Network Request Timeout

**Cause**: Server not responding (too slow or down)

**Solution:**
1. Verify server is running: `curl http://localhost:4000/health`
2. Check Network tab in DevTools for slow requests
3. Restart server
4. Check for infinite loops or database locks in server logs

### "Insufficient balance"

**Cause**: User doesn't have enough money to send

**Solution:**
- Check Account balance in dashboard
- Send smaller amount
- Use seed script to create accounts with ₹10,000: `npm run seed`

### "Receiver not found"

**Cause**: Recipient's account doesn't exist

**Solution:**
- Search for correct receiver in Send Money page
- Verify email/name of recipient
- Have recipient register first
- Use demo accounts if testing

---

## 9. Running Lint and Test Checks

### ESLint (Code Quality)

**Run linter:**
```bash
# In client directory
cd client
npm run lint

# Or from project root
cd client && npm run lint
```

**Fix automatically:**
```bash
# ESLint can fix many issues automatically
npx eslint src --fix
```

**What it checks:**
- React hooks used correctly
- Unused imports/variables
- Code style consistency
- Proper conditional rendering

### Running Tests

**API integration tests:**
```bash
# Terminal 1: Start server
cd server
npm run dev

# Terminal 2: Run API tests (once server is ready)
cd server
bash scripts/run_api_tests.sh
```

**What the test suite does:**
1. Creates two test users
2. Makes an online payment
3. Makes an offline sync payment
4. Verifies balances changed correctly
5. Tests sync idempotency (replaying same transaction)

**Expected output:**
```
API is reachable
Balances before: A=10000.00, B=10000.00
Online payment processed
Balances after online: A=9500.00, B=10500.00
Sync response:
  {success: true, ...}
Balances after sync: A=9750.00, B=10750.00
Retry sync response:
  {success: true, ...}  # Same result as first sync
```

### Checking Build

**Build the client for production:**
```bash
cd client
npm run build
```

**Preview production build:**
```bash
cd client
npm run preview
```

This runs the built app locally to verify it works in production mode.

---

## 10. Security Reminders

### NEVER Commit Secrets

⚠️ **Critical**: These files should NEVER be in Git:
- `server/.env`
- `client/.env` (if it contains secrets)
- `*.pem` files
- API keys, tokens, passwords

**Verify they're in .gitignore:**
```bash
cat .gitignore
# Should include: .env, *.pem, node_modules/, dist/
```

**If you accidentally committed secrets:**
1. Immediately rotate all keys/secrets
2. Force push to remove from history (be careful!)
3. Delete .env files from local
4. Regenerate JWT secret and Supabase keys

### Using Environment Variables Safely

**Correct way (server):**
```javascript
// server/.env
SUPABASE_SERVICE_KEY=secret-here  // ← Never send to browser
JWT_SECRET=secret-here            // ← Never send to browser
```

```javascript
// server code
const token = process.env.SUPABASE_SERVICE_KEY;  // ✓ Safe on server only
```

**Correct way (client):**
```javascript
// client/.env
VITE_API_URL=http://localhost:4000/api  // ✓ Public, client can see
```

```javascript
// client code
const API_URL = import.meta.env.VITE_API_URL;  // ✓ Public only
```

**What NOT to do:**
```javascript
// ✗ DON'T: Sending server secrets to browser
api.post('/init', { 
  supabaseKey: process.env.SUPABASE_SERVICE_KEY  // ✗ NEVER
});

// ✗ DON'T: Hardcoding secrets in code
const token = "my-secret-key-123";  // ✗ NEVER

// ✗ DON'T: Storing secrets in localStorage
localStorage.setItem('api_key', 'secret');  // ✗ NEVER (except JWT tokens for session)
```

### Best Practices

✓ **Do:**
- Use strong JWT secret (32+ characters)
- Rotate keys periodically
- Use `.env.example` as template for new developers
- Keep `.env` files only on machines that need them
- Use Supabase Service Role key only on backend
- Store JWT tokens in localStorage (they're session-based)

✗ **Don't:**
- Share `.env` files via email or chat
- Commit `.env` to any branch
- Use weak secrets
- Expose server-side secrets on frontend
- Reuse JWT secret across projects

### Checking for Accidental Secret Exposure

**Before committing:**
```bash
# Look for common patterns in staged files
git diff --cached | grep -i "secret\|key\|password"

# Or use a pre-commit hook library like pre-commit
```

**If secrets are committed:**
```bash
# Remove from history (⚠️ destructive)
git filter-branch --tree-filter 'rm -f .env' HEAD
# Then force push: git push origin +main
```

---

## Summary: Quick Troubleshooting Checklist

| Issue | Quick Fix |
|-------|-----------|
| Server won't start | Check `.env` has all vars, verify port 4000 free |
| Client won't start | Verify `VITE_API_URL` in `.env`, check port 5173 |
| Can't log in | Use demo: `aditi@example.com` / `password123`, or check email format |
| Offline payments don't sync | Go online, wait 3-5s, check sync banner at top |
| API returns 401 | Token expired, log out and log back in |
| API returns 404 | Check `VITE_API_URL`, verify endpoint path |
| Payment in queue but didn't sync | View Transactions page, check error message |
| Sync shows "failed" | Check error message in red text below transaction |
| IndexedDB queue is huge | Normal when offline, will sync when online |
| Linter complaining | Run `npm run lint` in client/, fix errors or use `--fix` |

---

## Getting Help

When troubleshooting, collect this information:
1. **Error message** - Full text from browser console or server logs
2. **Steps to reproduce** - Exact actions that caused the issue
3. **Environment** - OS, Node version, browser
4. **Logs** - Console output from both server and client
5. **State** - Are you online/offline? Logged in? Which page?

**For API issues:**
- Check Network tab in DevTools (F12 → Network)
- Verify request headers include `Authorization: Bearer ...`
- Check response JSON for error message
- Look at server console for processing logs

**For offline issues:**
- Check IndexedDB: DevTools → Application → IndexedDB → offline-upi
- Verify `navigator.onLine` in browser console
- Check sync queue with `getAllQueuedTransactions()`
- Manually test sync with curl (see section 6)

**For auth issues:**
- Check localStorage: `localStorage.getItem("offline_upi_token")`
- Decode JWT: paste in [jwt.io](https://jwt.io) to see expiry
- Verify `.env` has `JWT_SECRET` set
- Check Supabase has `users` table created

---

**Last Updated:** 2026-08-15
**Project:** Offline UPI v1.0
