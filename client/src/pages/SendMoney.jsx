import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useNetworkStatus } from "../hooks/useNetworkStatus.js";
import { searchUsers, createTransaction, extractErrorMessage } from "../services/api.js";
import { queuePayment, cacheContacts, searchCachedContacts, getAllQueuedTransactions } from "../storage/offlineQueue.js";
import { formatAmount } from "../utils/format.js";
import "./SendMoney.css";

const STEP_FORM = "form";
const STEP_CONFIRM = "confirm";
const STEP_DONE = "done";

export default function SendMoney() {
  const { user, updateBalance } = useAuth();
  const isOnline = useNetworkStatus();
  const navigate = useNavigate();

  const [step, setStep] = useState(STEP_FORM);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [receiver, setReceiver] = useState(null);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [outcome, setOutcome] = useState(null); // { queued: bool, message: string }

  // Watch for a queued offline payment to become synchronized.
  useEffect(() => {
    if (!outcome?.queued || !outcome?.clientTransactionId) return;

    let cancelled = false;
    const check = async () => {
      try {
        const all = await getAllQueuedTransactions();
        const exists = all.some((r) => r.clientTransactionId === outcome.clientTransactionId);
        if (!exists && !cancelled) {
          // The queued item has been removed from IndexedDB -> synchronized.
          setOutcome({
            queued: false,
            message: `Your payment of ${formatAmount(amount)} to ${receiver?.name || receiver?.email} has been synchronized.`,
          });
        }
      } catch (e) {
        // ignore and retry on next interval
      }
    };

    const timer = setInterval(check, 1000);
    // run an immediate check too
    check();

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [outcome, amount, receiver]);

  useEffect(() => {
    if (receiver) {
      setResults([]);
      return;
    }

    if (!isOnline) {
      // offline: fall back to whoever we've cached locally from past
      // online searches, so payments can still be addressed correctly
      searchCachedContacts(query).then(setResults);
      return;
    }

    const timeout = setTimeout(async () => {
      try {
        const { data } = await searchUsers(query);
        setResults(data.users);
        cacheContacts(data.users);
      } catch {
        setResults([]);
      }
    }, 250);
    return () => clearTimeout(timeout);
  }, [query, isOnline, receiver]);

  function selectReceiver(person) {
    setReceiver(person);
    setQuery(person.name);
    setResults([]);
  }

  function handleContinue(e) {
    e.preventDefault();
    setError("");

    if (!receiver) {
      setError("Choose someone to pay from the list.");
      return;
    }
    const numericAmount = Number(amount);
    if (!numericAmount || numericAmount <= 0) {
      setError("Enter a valid payment amount.");
      return;
    }
    if (isOnline && numericAmount > (user?.balance ?? 0)) {
      setError("Insufficient balance.");
      return;
    }

    setStep(STEP_CONFIRM);
  }

  async function handleConfirm() {
    setSubmitting(true);
    setError("");

    if (!isOnline) {
      const record = await queuePayment({
        receiverId: receiver.id,
        receiverLabel: receiver.name || receiver.email,
        amount: Number(amount),
        note,
        ownerId: user?.id,
      });
      setOutcome({
        queued: true,
        clientTransactionId: record.clientTransactionId,
        message: `Your payment of ${formatAmount(record.amount)} to ${record.receiverLabel} has been saved and will sync automatically when you're back online.`,
      });
      setStep(STEP_DONE);
      setSubmitting(false);
      return;
    }

    try {
      const clientTransactionId = `ON-${Date.now().toString(36).toUpperCase()}`;
      const { data } = await createTransaction({
        receiverId: receiver.id,
        amount: Number(amount),
        note,
        clientTransactionId,
      });
      updateBalance((user.balance ?? 0) - data.transaction.amount);
      setOutcome({
        queued: false,
        message: `${formatAmount(data.transaction.amount)} sent to ${receiver.name || receiver.email}.`,
      });
      setStep(STEP_DONE);
    } catch (err) {
      setError(extractErrorMessage(err));
      setStep(STEP_FORM);
    } finally {
      setSubmitting(false);
    }
  }

  if (step === STEP_DONE && outcome) {
    return (
      <div className="send-money">
        <div className="card confirm-result">
          <div className={`confirm-result__icon ${outcome.queued ? "is-pending" : "is-success"}`}>
            {outcome.queued ? "⏳" : "✓"}
          </div>
          <h2>{outcome.queued ? "Payment saved" : "Payment sent"}</h2>
          <p>{outcome.message}</p>
          <div className="confirm-result__actions">
            <button className="btn btn--secondary" onClick={() => navigate("/")}>
              Back to dashboard
            </button>
            <button
              className="btn btn--primary"
              onClick={() => {
                setStep(STEP_FORM);
                setReceiver(null);
                setQuery("");
                setAmount("");
                setNote("");
                setOutcome(null);
              }}
            >
              Send another
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === STEP_CONFIRM) {
    return (
      <div className="send-money">
        <div className="card">
          <h2>Payment Summary</h2>

          {!isOnline && (
            <div className="alert alert--warning">
              You're offline. The payment has been saved and will sync later.
            </div>
          )}

          <dl className="summary-list">
            <div>
              <dt>Amount</dt>
              <dd className="mono">{formatAmount(amount)}</dd>
            </div>
            <div>
              <dt>To</dt>
              <dd>{receiver.name || receiver.email}</dd>
            </div>
            {note && (
              <div>
                <dt>Note</dt>
                <dd>{note}</dd>
              </div>
            )}
          </dl>

          {error && <div className="alert alert--error">{error}</div>}

          <div className="confirm-result__actions">
            <button className="btn btn--secondary" onClick={() => setStep(STEP_FORM)} disabled={submitting}>
              Back
            </button>
            <button className="btn btn--primary" onClick={handleConfirm} disabled={submitting}>
              {submitting ? "Processing..." : "Confirm Payment"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="send-money">
      <h1 className="page-title">Send Money</h1>

      {!isOnline && (
        <div className="alert alert--warning">
          You're offline. Payments will be saved locally and synchronized when you're back
          online. You can only pay people you've searched for before while online.
        </div>
      )}

      <form className="card" onSubmit={handleContinue}>
        <div className="field">
          <label htmlFor="receiver">Receiver</label>
          <input
            id="receiver"
            type="text"
            placeholder="Search by name or email"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setReceiver(null);
            }}
            autoComplete="off"
          />
          {results.length > 0 && (
            <ul className="receiver-results">
              {results.map((person) => (
                <li key={person.id}>
                  <button type="button" onClick={() => selectReceiver(person)}>
                    <span>{person.name}</span>
                    <span className="receiver-results__email">{person.email}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {receiver && (
            <span className="field-hint">Paying {receiver.name} ({receiver.email})</span>
          )}
          {!isOnline && results.length === 0 && !receiver && (
            <span className="field-hint">
              Showing people you've searched for before while online. New contacts need one
              online search first.
            </span>
          )}
        </div>

        <div className="field">
          <label htmlFor="amount">Amount (₹)</label>
          <input
            id="amount"
            type="number"
            inputMode="decimal"
            min="1"
            step="0.01"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="note">Note (optional)</label>
          <textarea
            id="note"
            rows={2}
            placeholder="What's this for?"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        {error && <div className="alert alert--error">{error}</div>}

        <button className="btn btn--primary btn--block" type="submit">
          Continue
        </button>
      </form>
    </div>
  );
}
