
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import {
  fetchAccount,
  fetchTransactions,
  extractErrorMessage,
} from "../services/api.js";
import { getAllQueuedTransactions } from "../storage/offlineQueue.js";
import StatusBadge from "../components/StatusBadge.jsx";
import { formatAmount, formatRelativeDate } from "../utils/format.js";
import "./Dashboard.css";

function SkeletonDashboard() {
  return (
    <div className="dashboard">
      <div className="balance-card card">
        <div className="balance-card__top">
          <span className="balance-card__label">Available Balance</span>
        </div>
        <div
          className="skeleton"
          style={{ width: 140, height: 36, marginBottom: 12 }}
        />
        <div className="skeleton" style={{ width: 200, height: 14 }} />
      </div>

      <div className="quick-actions">
        <div
          className="skeleton"
          style={{ height: 56, borderRadius: "var(--radius-md)" }}
        />
        <div
          className="skeleton"
          style={{ height: 56, borderRadius: "var(--radius-md)" }}
        />
      </div>

      <div>
        <div
          className="skeleton"
          style={{ width: 120, height: 18, marginBottom: 12 }}
        />
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="skeleton"
            style={{
              height: 52,
              borderRadius: "var(--radius-md)",
              marginBottom: 8,
            }}
          />
        ))}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user, updateBalance } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [pendingLocal, setPendingLocal] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadData() {
    setError("");

    try {
      const [accountRes, txRes, queued] = await Promise.all([
        fetchAccount(),
        fetchTransactions(),
        getAllQueuedTransactions(),
      ]);

      updateBalance(accountRes.data.balance);
      setTransactions(txRes.data.transactions.slice(0, 5));
      setPendingLocal(queued.filter((q) => q.ownerId === user?.id));
    } catch (err) {
      const queued = await getAllQueuedTransactions();

      setPendingLocal(queued.filter((q) => q.ownerId === user?.id));
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return <SkeletonDashboard />;
  }

  const totalPending = pendingLocal.reduce(
    (sum, payment) => sum + Number(payment.amount || 0),
    0
  );

  const completedCount = transactions.filter(
    (transaction) => transaction.status === "COMPLETED"
  ).length;

  // Include locally queued transactions in the dashboard total.
  const totalTransactionCount = transactions.length + pendingLocal.length;

  const combinedRecent = [
    ...pendingLocal.map((payment) => ({
      id: payment.clientTransactionId,
      isLocal: true,
      amount: payment.amount,
      status: payment.status,
      createdAt: payment.createdAt,
      counterpartLabel: payment.receiverLabel,
      direction: "sent",
      lastError: payment.lastError,
    })),
    ...transactions.map((transaction) => ({
      id: transaction.id,
      isLocal: false,
      amount: transaction.amount,
      status: transaction.status,
      createdAt: transaction.createdAt,
      counterpartLabel:
        transaction.direction === "sent"
          ? transaction.receiver?.name
          : transaction.sender?.name,
      direction: transaction.direction,
    })),
  ].slice(0, 6);

  return (
    <div className="dashboard">
      {error && (
        <div className="alert alert--warning">
          {error} Showing what&apos;s saved locally.
        </div>
      )}

      <section className="balance-card card">
        <div className="balance-card__top">
          <span className="balance-card__label">Available Balance</span>
        </div>

        <span className="balance-card__amount mono">
          {formatAmount(user?.balance ?? 0)}
        </span>

        {pendingLocal.length > 0 && (
          <div className="balance-card__pending">
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>

            {formatAmount(totalPending)} pending sync
          </div>
        )}
      </section>

      <section className="stats-row">
        <div className="stat-item">
          <span className="stat-item__value mono">
            {totalTransactionCount}
          </span>
          <span className="stat-item__label">Transactions</span>
        </div>

        <div className="stat-item">
          <span className="stat-item__value mono">{completedCount}</span>
          <span className="stat-item__label">Completed</span>
        </div>

        <div className="stat-item">
          <span className="stat-item__value mono">
            {pendingLocal.length}
          </span>
          <span className="stat-item__label">Pending</span>
        </div>
      </section>

      <section className="quick-actions">
        <Link to="/send" className="quick-action">
          <div className="quick-action__icon">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <polyline points="19 12 12 19 5 12" />
            </svg>
          </div>

          <div className="quick-action__text">
            <span className="quick-action__label">Send Money</span>
            <span className="quick-action__hint">
              Transfer to anyone
            </span>
          </div>
        </Link>

        <Link to="/transactions" className="quick-action">
          <div className="quick-action__icon quick-action__icon--alt">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="8" y1="6" x2="21" y2="6" />
              <line x1="8" y1="12" x2="21" y2="12" />
              <line x1="8" y1="18" x2="21" y2="18" />
              <line x1="3" y1="6" x2="3.01" y2="6" />
              <line x1="3" y1="12" x2="3.01" y2="12" />
              <line x1="3" y1="18" x2="3.01" y2="18" />
            </svg>
          </div>

          <div className="quick-action__text">
            <span className="quick-action__label">History</span>
            <span className="quick-action__hint">
              View all payments
            </span>
          </div>
        </Link>
      </section>

      <section>
        <div className="section-heading">
          <h2>Recent activity</h2>

          {combinedRecent.length > 0 && (
            <Link to="/transactions" className="section-heading__link">
              View all
            </Link>
          )}
        </div>

        {combinedRecent.length === 0 ? (
          <div className="empty-state card">
            <div className="empty-state__icon">
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <line x1="12" y1="1" x2="12" y2="23" />
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
            </div>

            <h3>No transactions yet</h3>
            <p>Send your first payment to see it show up here.</p>
          </div>
        ) : (
          <ul className="tx-list">
            {combinedRecent.map((tx) => (
              <li key={tx.id} className="tx-row">
                <div className="tx-row__icon-wrapper">
                  <span
                    className={`tx-row__icon ${
                      tx.direction === "received"
                        ? "tx-row__icon--in"
                        : ""
                    }`}
                    aria-hidden="true"
                  >
                    {tx.direction === "sent" ? (
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <polyline points="19 12 12 19 5 12" />
                      </svg>
                    ) : (
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <line x1="12" y1="19" x2="12" y2="5" />
                        <polyline points="5 12 12 5 19 12" />
                      </svg>
                    )}
                  </span>
                </div>

                <div className="tx-row__main">
                  <span className="tx-row__party">
                    {tx.direction === "sent" ? "To" : "From"}{" "}
                    {tx.counterpartLabel || "\u2014"}
                  </span>

                  <span className="tx-row__date">
                    {formatRelativeDate(tx.createdAt)}
                  </span>

                  {tx.status === "FAILED" && tx.lastError && (
                    <span className="tx-row__error">
                      {tx.lastError}
                    </span>
                  )}
                </div>

                <div className="tx-row__side">
                  <span
                    className={`tx-row__amount mono ${
                      tx.direction === "received" ? "is-positive" : ""
                    }`}
                  >
                    {tx.direction === "sent" ? "\u2212" : "+"}
                    {formatAmount(tx.amount)}
                  </span>

                  <StatusBadge status={tx.status} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

