import "./NetworkIndicator.css";

export default function NetworkIndicator({ isOnline }) {
  return (
    <span className={`network-indicator ${isOnline ? "is-online" : "is-offline"}`}>
      <span className="network-indicator__dot" aria-hidden="true" />
      {isOnline ? "Online" : "Offline"}
    </span>
  );
}
