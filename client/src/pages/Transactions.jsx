import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchTransactions, extractErrorMessage } from "../services/api.js";
import { getAllQueuedTransactions } from "../storage/offlineQueue.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useNetworkStatus } from "../hooks/useNetworkStatus.js";
import StatusBadge from "../components/StatusBadge.jsx";
import { formatAmount, formatRelativeDate } from "../utils/format.js";
import "./Transactions.css";

const FILTERS = [
  { value: "", label: "All" },
  { value: "COMPLETED", label: "Completed" },
  { value: "PENDING_SYNC", label: "Pending" },
  { value: "FAILED", label: "Failed" },
];

export default function Transactions() {
  const isOnline = useNetworkStatus();
  const [transactions, setTransactions] = useState([]);
  const [localQueue, setLocalQueue] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const { user } = useAuth();

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");
      try {
        const { data } = await fetchTransactions({
          status: statusFilter || undefined,
          search: search || undefined,
        });
        setTransactions(data.transactions);
      } catch (err) {
        setError(extractErrorMessage(err));
        setTransactions([]);
      } finally {
        setLoading(false);
      }
      const queue = await getAllQueuedTransactions();
      setLocalQueue(queue.filter((q) => q.ownerId === user?.id));
    }
    const timeout = setTimeout(load, 200);
    return () => clearTimeout(timeout);
  }, [search, statusFilter, isOnline]);

  const localAsRows = localQueue
    .filter((item) => !statusFilter || item.status === statusFilter)
    .filter((item) => {
      if (!search) return true;
      const term = search.toLowerCase();
      return (
        item.receiverLabel?.toLowerCase().includes(term) ||
        item.note?.toLowerCase().includes(term)
      );
    })
    .map((item) => ({
      id: item.clientTransactionId,
      isLocal: true,
      amount: item.amount,
      status: item.status,
      createdAt: item.createdAt,
      counterpart: item.receiverLabel,
      direction: "sent",
      lastError: item.lastError,
      attempts: item.attempts,
    }));

  const serverAsRows = transactions.map((t) => ({
    id: t.id,
    isLocal: false,
    amount: t.amount,
    status: t.status,
    createdAt: t.createdAt,
    counterpart: t.direction === "sent" ? t.receiver?.name : t.sender?.name,
    direction: t.direction,
  }));

  const rows = [...localAsRows, ...serverAsRows].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt)
  );

  return (
    <div className="transactions-page">
      <h1 className="page-title">Transactions</h1>

      <div className="tx-filters">
        <input
          type="text"
          className="tx-filters__search"
          placeholder="Search by name or note"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="tx-filters__chips">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              className={`chip ${statusFilter === f.value ? "chip--active" : ""}`}
              onClick={() => setStatusFilter(f.value)}
              type="button"
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="alert alert--warning">{error} Showing what's saved locally.</div>}

      {!loading && rows.length === 0 ? (
        <div className="empty-state card">
          <h3>No transactions found</h3>
          <p>Try a different search or filter.</p>
        </div>
      ) : (
        <ul className="tx-list">
          {rows.map((tx) =>
            tx.isLocal ? (
              <li key={tx.id} className="tx-row">
                <div className="tx-row__main">
                  <span className="tx-row__party">To {tx.counterpart || "—"}</span>
                  <span className="tx-row__date mono">{tx.id}</span>
                  {tx.status === "FAILED" && tx.lastError && (
                    <span className="tx-row__error">{tx.lastError}</span>
                  )}
                </div>
                <div className="tx-row__side">
                  <span className="tx-row__amount mono">−{formatAmount(tx.amount)}</span>
                  <StatusBadge status={tx.status} />
                </div>
              </li>
            ) : (
              <Link key={tx.id} to={`/transactions/${tx.id}`} className="tx-row">
                <div className="tx-row__main">
                  <span className="tx-row__party">
                    {tx.direction === "sent" ? "To" : "From"} {tx.counterpart || "—"}
                  </span>
                  <span className="tx-row__date">{formatRelativeDate(tx.createdAt)}</span>
                </div>
                <div className="tx-row__side">
                  <span
                    className={`tx-row__amount mono ${tx.direction === "received" ? "is-positive" : ""}`}
                  >
                    {tx.direction === "sent" ? "−" : "+"}
                    {formatAmount(tx.amount)}
                  </span>
                  <StatusBadge status={tx.status} />
                </div>
              </Link>
            )
          )}
        </ul>
      )}
    </div>
  );
}
