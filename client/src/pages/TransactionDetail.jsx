import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { fetchTransaction, extractErrorMessage } from "../services/api.js";
import StatusBadge from "../components/StatusBadge.jsx";
import { formatAmount, formatFullDateTime } from "../utils/format.js";
import "./TransactionDetail.css";

export default function TransactionDetail() {
  const { id } = useParams();
  const [transaction, setTransaction] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");
      try {
        const { data } = await fetchTransaction(id);
        setTransaction(data.transaction);
      } catch (err) {
        setError(extractErrorMessage(err));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) {
    return <p className="detail-loading">Loading...</p>;
  }

  if (error || !transaction) {
    return (
      <div className="empty-state card">
        <h3>Couldn't load this transaction</h3>
        <p>{error || "It may not exist, or you're offline."}</p>
        <Link to="/transactions" className="btn btn--secondary" style={{ marginTop: 16 }}>
          Back to transactions
        </Link>
      </div>
    );
  }

  const rows = [
    ["Transaction ID", <span key="txid" className="mono">{transaction.clientTransactionId}</span>],
    ["Sender", `${transaction.sender.name} (${transaction.sender.email})`],
    ["Receiver", `${transaction.receiver.name} (${transaction.receiver.email})`],
    ["Amount", <span key="amount" className="mono">{formatAmount(transaction.amount)}</span>],
    ["Date & time", formatFullDateTime(transaction.createdAt)],
    ["Status", <StatusBadge key="status" status={transaction.status} />],
    ["Note", transaction.note || "—"],
  ];

  return (
    <div className="detail-page">
      <Link to="/transactions" className="detail-back">
        ← Back
      </Link>

      <div className="card">
        <h1 className="page-title">Transaction Details</h1>
        <dl className="detail-list">
          {rows.map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
