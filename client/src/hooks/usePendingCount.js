import { useEffect, useState } from "react";
import { getAllQueuedTransactions } from "../storage/offlineQueue.js";
import { useAuth } from "../context/AuthContext.jsx";

export default function usePendingCount() {
  const { user } = useAuth();
  const [count, setCount] = useState(0);

  useEffect(() => {
    let mounted = true;
    async function load() {
      if (!user) {
        setCount(0);
        return;
      }
      const all = await getAllQueuedTransactions();
      const mine = all.filter((r) => r.ownerId === user.id && (r.status === "PENDING_SYNC" || r.status === "PROCESSING" || r.status === "FAILED"));
      if (mounted) setCount(mine.length);
    }
    load();
    const id = setInterval(load, 3000);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, [user]);

  return count;
}
