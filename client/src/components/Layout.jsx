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
          <span className="app-header__mark" aria-hidden="true">₹</span>
          <span className="app-header__name">Offline UPI</span>
        </div>

        <nav className="app-header__nav" aria-label="Main navigation">
          <NavLink to="/dashboard" end>
            <svg className="nav-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
            <span>Dashboard</span>
          </NavLink>
          <NavLink to="/send">
            <svg className="nav-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>
            <span>Send Money</span>
          </NavLink>
          <NavLink to="/transactions">
            <svg className="nav-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
            <span>Transactions</span>
          </NavLink>
        </nav>

        <div className="app-header__right">
          <NetworkIndicator isOnline={isOnline} />
          {pendingCount > 0 && (
            <span className="pending-indicator" title={`${pendingCount} payment${pendingCount === 1 ? "" : "s"} waiting to sync`}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              {pendingCount} pending
            </span>
          )}
          <div className="app-header__user-menu">
            <span className="app-header__avatar" aria-hidden="true">
              {user?.name?.charAt(0) || "?"}
            </span>
            <span className="app-header__user">{user?.name}</span>
          </div>
          <button className="btn btn--ghost btn--sm" onClick={handleLogout} title="Log out">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            <span className="btn-label-desktop">Log out</span>
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
