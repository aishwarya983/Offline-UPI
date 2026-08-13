import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useSyncQueue } from "../hooks/useSyncQueue.js";
import { fetchAccount } from "../services/api.js";
import NetworkIndicator from "./NetworkIndicator.jsx";
import SyncBanner from "./SyncBanner.jsx";
import usePendingCount from "../hooks/usePendingCount.js";
import "./Layout.css";

export default function Layout() {
  const { user, logout, updateBalance } = useAuth();
  const navigate = useNavigate();

  const refreshBalance = async () => {
    try {
      const { data } = await fetchAccount();
      updateBalance(data.balance);
    } catch {
      // if this fails we just keep showing the last known balance
    }
  };

  const { isOnline, syncState, lastSyncSummary, queueSizeAtStart } = useSyncQueue({
    onBalanceRefresh: refreshBalance,
  });

  const pendingCount = usePendingCount();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header__brand">
          <span className="app-header__mark">₹</span>
          <span>Offline UPI</span>
        </div>

        <nav className="app-header__nav">
          <NavLink to="/" end>
            Dashboard
          </NavLink>
          <NavLink to="/send">Send Money</NavLink>
          <NavLink to="/transactions">Transactions</NavLink>
        </nav>

        <div className="app-header__right">
          <NetworkIndicator isOnline={isOnline} />
          {pendingCount > 0 && (
            <span className="pending-indicator">{pendingCount} payments pending sync</span>
          )}
          <span className="app-header__user">{user?.name}</span>
          <button className="btn btn--ghost btn--sm" onClick={handleLogout}>
            Log out
          </button>
        </div>
      </header>

      <SyncBanner
        isOnline={isOnline}
        syncState={syncState}
        summary={lastSyncSummary}
        queueSize={queueSizeAtStart}
      />

      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}
