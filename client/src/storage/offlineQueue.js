import { openDB } from "idb";

const DB_NAME = "offline-upi";
const DB_VERSION = 1;
const STORE_NAME = "pending_transactions";
const CONTACTS_STORE = "known_contacts";

let dbPromise = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const store = db.createObjectStore(STORE_NAME, {
          keyPath: "clientTransactionId",
        });
        store.createIndex("status", "status");
        store.createIndex("createdAt", "createdAt");

        db.createObjectStore(CONTACTS_STORE, { keyPath: "id" });
      },
    });
  }
  return dbPromise;
}

// Every time the user sees someone in an online search result, we cache
// their id/name/email here. That's what makes it possible to pick a
// receiver while offline - we can't hit the server to search, but we can
// look someone up in this local cache.
export async function cacheContacts(users) {
  if (!users?.length) return;
  const db = await getDB();
  const tx = db.transaction(CONTACTS_STORE, "readwrite");
  await Promise.all(users.map((u) => tx.store.put(u)));
  await tx.done;
}

export async function searchCachedContacts(query) {
  const db = await getDB();
  const all = await db.getAll(CONTACTS_STORE);
  const term = query.trim().toLowerCase();
  if (!term) return all;
  return all.filter(
    (u) => u.name.toLowerCase().includes(term) || u.email.toLowerCase().includes(term)
  );
}

export function generateClientTransactionId() {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const random = Math.random().toString(16).slice(2, 8).toUpperCase();
  return `OFF-${date}-${random}`;
}

// Adds a payment to the local queue with PENDING_SYNC status.
export async function queuePayment({ receiverId, receiverLabel, amount, note, ownerId }) {
  const db = await getDB();
  const record = {
    clientTransactionId: generateClientTransactionId(),
    receiverId,
    receiverLabel,
    amount: Number(amount),
    note: note || "",
    // optional owner id (set by the caller when available) to ensure
    // queued payments are tied to the user who created them.
    ownerId: ownerId,
    status: "PENDING_SYNC",
    createdAt: new Date().toISOString(),
    attempts: 0,
    lastError: null,
  };
  await db.add(STORE_NAME, record);
  return record;
}

export async function getAllPending() {
  const db = await getDB();
  const all = await db.getAll(STORE_NAME);
  // Return both PENDING_SYNC and FAILED items, sorted by creation time.
  // FAILED items are retryable and should be included in the next sync attempt.
  const pending = all.filter(
    (item) => item.status === "PENDING_SYNC" || item.status === "FAILED"
  );
  return pending.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function getAllQueuedTransactions() {
  const db = await getDB();
  return db.getAll(STORE_NAME);
}

export async function updateStatus(clientTransactionId, status, extra = {}) {
  const db = await getDB();
  const record = await db.get(STORE_NAME, clientTransactionId);
  if (!record) return null;
  const updated = { ...record, status, ...extra };
  await db.put(STORE_NAME, updated);
  return updated;
}

export async function markProcessing(clientTransactionId) {
  return updateStatus(clientTransactionId, "PROCESSING");
}

export async function markCompleted(clientTransactionId) {
  return updateStatus(clientTransactionId, "COMPLETED");
}

export async function markFailed(clientTransactionId, errorMessage) {
  const db = await getDB();
  const record = await db.get(STORE_NAME, clientTransactionId);
  if (!record) return null;
  const updated = {
    ...record,
    status: "FAILED",
    attempts: (record.attempts || 0) + 1,
    lastError: errorMessage,
  };
  await db.put(STORE_NAME, updated);
  return updated;
}

// Once a queued payment is confirmed on the server we don't need the
// local copy anymore - the server's transaction record is now the
// source of truth.
export async function removeFromQueue(clientTransactionId) {
  const db = await getDB();
  await db.delete(STORE_NAME, clientTransactionId);
}
