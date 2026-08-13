import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { fetchAccount, fetchTransactions, extractErrorMessage } from "../services/api.js";
import { getAllQueuedTransactions } from "../storage/offlineQueue.js";
import StatusBadge from "../components/StatusBadge.jsx";
import { formatAmount, formatRelativeDate } from "../utils/format.js";
import "./Dashboard.css";

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
      // if we're offline, we can still show locally queued payments
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

  const combinedRecent = [
    ...pendingLocal.map((p) => ({
      id: p.clientTransactionId,
      isLocal: true,
      amount: p.amount,
      status: p.status,
      createdAt: p.createdAt,
      counterpartLabel: p.receiverLabel,
      direction: "sent",
    })),
    ...transactions.map((t) => ({
      id: t.id,
      isLocal: false,
      amount: t.amount,
      status: t.status,
      createdAt: t.createdAt,
      counterpartLabel: t.direction === "sent" ? t.receiver?.name : t.sender?.name,
      direction: t.direction,
    })),
  ].slice(0, 6);

  return (
    <div className="dashboard">
      {error && <div className="alert alert--warning">{error} Showing what's saved locally.</div>}

      <section className="balance-card card">
        <span className="balance-card__label">Available Balance</span>
        <span className="balance-card__amount mono">
          {loading ? "···" : formatAmount(user?.balance ?? 0)}
        </span>
        {pendingLocal.length > 0 && (
          <div className="balance-card__pending">
            Pending: −{formatAmount(pendingLocal.reduce((s, p) => s + Number(p.amount || 0), 0))}
          </div>
        )}
        <span className="balance-card__note">
          Signed in as {user?.name} · {user?.email}
        </span>
      </section>

      <section className="quick-actions">
        <Link to="/send" className="quick-action">
          <span className="quick-action__icon" aria-hidden="true">↗</span>
          <span>Send Money</span>
        </Link>
        <Link to="/transactions" className="quick-action">
          <span className="quick-action__icon" aria-hidden="true">≡</span>
          <span>Transactions</span>
        </Link>
      </section>

      <section>
        <div className="section-heading">
          <h2>Recent activity</h2>
          <Link to="/transactions" className="section-heading__link">
            View all
          </Link>
        </div>

        {combinedRecent.length === 0 && !loading ? (
          <div className="empty-state card">
            <h3>No transactions yet</h3>
            <p>Send your first payment to see it show up here.</p>
          </div>
        ) : (
          <ul className="tx-list">
            {combinedRecent.map((tx) => (
              <li key={tx.id} className="tx-row">
                <div className="tx-row__main">
                  <span className="tx-row__party">
                    {tx.direction === "sent" ? "To" : "From"} {tx.counterpartLabel || "—"}
                  </span>
                  <span className="tx-row__date">{formatRelativeDate(tx.createdAt)}</span>
                </div>
                <div className="tx-row__side">
                  <span className={`tx-row__amount mono ${tx.direction === "received" ? "is-positive" : ""}`}>
                    {tx.direction === "sent" ? "−" : "+"}
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
