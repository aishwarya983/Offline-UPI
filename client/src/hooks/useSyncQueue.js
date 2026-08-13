import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { useNetworkStatus } from "./useNetworkStatus.js";
import {
  getAllPending,
  markProcessing,
  updateStatus,
  markFailed,
  removeFromQueue,
} from "../storage/offlineQueue.js";
import { syncTransactions, extractErrorMessage } from "../services/api.js";

// syncState: "idle" | "syncing" | "done"
export function useSyncQueue({ onBalanceRefresh } = {}) {
  const isOnline = useNetworkStatus();
  const { user } = useAuth();
  const [syncState, setSyncState] = useState("idle");
  const [lastSyncSummary, setLastSyncSummary] = useState(null);
  const [queueSizeAtStart, setQueueSizeAtStart] = useState(0);
  const isSyncingRef = useRef(false);

  const runSync = useCallback(async () => {
    if (isSyncingRef.current) return;
    if (!user) return; // nothing to sync if not authenticated
    const pending = await getAllPending();
    // Only sync items that were created by the currently authenticated user.
    const owned = pending.filter((p) => p.ownerId === user.id);
    if (owned.length === 0) return;

    isSyncingRef.current = true;
    setQueueSizeAtStart(owned.length);
    setSyncState("syncing");

    for (const item of owned) {
      await markProcessing(item.clientTransactionId);
    }

    try {
      const { data } = await syncTransactions(
        owned.map((item) => ({
          clientTransactionId: item.clientTransactionId,
          receiverId: item.receiverId,
          amount: item.amount,
          note: item.note,
        }))
      );

      let succeeded = 0;
      let failed = 0;

      for (const result of data.results) {
        if (result.success) {
          await removeFromQueue(result.clientTransactionId);
          succeeded += 1;
        } else {
          await markFailed(result.clientTransactionId, result.error);
          failed += 1;
        }
      }

      setLastSyncSummary({ succeeded, failed, total: pending.length });
      onBalanceRefresh?.();
    } catch (err) {
        // Network or batch failure: do NOT mark items as permanently FAILED.
        // Return them to PENDING_SYNC and record an attempt + lastError so
        // they remain retryable on the next reconnect.
        for (const item of owned) {
          const attempts = (item.attempts || 0) + 1;
          await updateStatus(item.clientTransactionId, "PENDING_SYNC", {
            attempts,
            lastError: extractErrorMessage(err),
          });
        }
        setLastSyncSummary({ succeeded: 0, failed: pending.length, total: pending.length });
    } finally {
      isSyncingRef.current = false;
      setSyncState("done");
      setTimeout(() => setSyncState("idle"), 4000);
    }
  }, [onBalanceRefresh, user]);

  useEffect(() => {
    if (isOnline) {
      runSync();
    }
  }, [isOnline, runSync]);

  return { isOnline, syncState, lastSyncSummary, runSync, queueSizeAtStart };
}
