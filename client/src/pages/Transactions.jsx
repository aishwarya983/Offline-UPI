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
        <div className="tx-filters__search-wrapper">
          <svg className="tx-filters__search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input
            type="text"
            className="tx-filters__search"
            placeholder="Search by name or note"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
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

      {error && <div className="alert alert--warning">{error} Showing what&apos;s saved locally.</div>}

      {!loading && rows.length === 0 ? (
        <div className="empty-state card">
          <div className="empty-state__icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
          </div>
          <h3>No transactions found</h3>
          <p>Try a different search or filter.</p>
        </div>
      ) : (
        <ul className="tx-list">
          {rows.map((tx) =>
            tx.isLocal ? (
              <li key={tx.id} className="tx-row">
                <div className="tx-row__icon-wrapper">
                  <span className="tx-row__icon" aria-hidden="true">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>
                  </span>
                </div>
                <div className="tx-row__main">
                  <span className="tx-row__party">To {tx.counterpart || "\u2014"}</span>
                  <span className="tx-row__date">{formatRelativeDate(tx.createdAt)}</span>
                  {tx.status === "FAILED" && tx.lastError && (
                    <span className="tx-row__error">{tx.lastError}</span>
                  )}
                </div>
                <div className="tx-row__side">
                  <span className="tx-row__amount mono">{"\u2212"}{formatAmount(tx.amount)}</span>
                  <StatusBadge status={tx.status} />
                </div>
              </li>
            ) : (
              <Link key={tx.id} to={`/transactions/${tx.id}`} className="tx-row">
                <div className="tx-row__icon-wrapper">
                  <span className={`tx-row__icon ${tx.direction === "received" ? "tx-row__icon--in" : ""}`} aria-hidden="true">
                    {tx.direction === "sent" ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>
                    ) : (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>
                    )}
                  </span>
                </div>
                <div className="tx-row__main">
                  <span className="tx-row__party">
                    {tx.direction === "sent" ? "To" : "From"} {tx.counterpart || "\u2014"}
                  </span>
                  <span className="tx-row__date">{formatRelativeDate(tx.createdAt)}</span>
                </div>
                <div className="tx-row__side">
                  <span
                    className={`tx-row__amount mono ${tx.direction === "received" ? "is-positive" : ""}`}
                  >
                    {tx.direction === "sent" ? "\u2212" : "+"}
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
