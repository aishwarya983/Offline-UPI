import "./SyncBanner.css";

export default function SyncBanner({ syncState, summary, queueSize }) {
  if (syncState === "idle") return null;

  if (syncState === "syncing") {
    return (
      <div className="sync-banner sync-banner--active">
        <span className="sync-banner__spinner" aria-hidden="true" />
        Back online. Syncing {queueSize} pending {queueSize === 1 ? "payment" : "payments"}...
      </div>
    );
  }

  if (syncState === "done" && summary) {
    const { succeeded, failed } = summary;
    if (failed === 0) {
      return (
        <div className="sync-banner sync-banner--success">
          ✓ {succeeded} {succeeded === 1 ? "payment" : "payments"} synchronized
        </div>
      );
    }
    return (
      <div className="sync-banner sync-banner--warning">
        {succeeded > 0 && `✓ ${succeeded} synchronized. `}
        {failed} {failed === 1 ? "payment" : "payments"} couldn't be synced — we'll retry when
        you're back online.
      </div>
    );
  }

  return null;
}
