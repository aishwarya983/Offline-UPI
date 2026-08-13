import "./StatusBadge.css";

const LABELS = {
  PENDING_SYNC: "Pending Sync",
  PROCESSING: "Processing",
  COMPLETED: "Completed",
  FAILED: "Failed",
};

export default function StatusBadge({ status }) {
  const label = LABELS[status] || status;

  if (status === "PENDING_SYNC") {
    return <span className="stamp stamp--pending">{label}</span>;
  }

  return <span className={`status-pill status-pill--${status.toLowerCase()}`}>{label}</span>;
}
