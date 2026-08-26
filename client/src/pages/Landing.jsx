import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { Navigate } from "react-router-dom";
import "./Landing.css";

export default function Landing() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="route-loading">
        <div className="landing-loader" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="landing">
      <header className="landing-header">
        <div className="landing-header__inner">
          <div className="landing-header__brand">
            <span className="landing-header__mark" aria-hidden="true">₹</span>
            <span className="landing-header__name">Offline UPI</span>
          </div>
          <div className="landing-header__actions">
            <Link to="/login" className="btn btn--ghost btn--sm">Log in</Link>
            <Link to="/register" className="btn btn--primary btn--sm">Get started</Link>
          </div>
        </div>
      </header>

      <section className="hero">
        <div className="hero__inner">
          <div className="hero__badge">Offline-first digital payments</div>
          <h1 className="hero__title">
            Payments that work<br />
            <span className="hero__title-accent">even when you don&apos;t.</span>
          </h1>
          <p className="hero__subtitle">
            Send and receive money even when your internet drops out.
            Payments queue locally, sync automatically, and never duplicate.
          </p>
          <div className="hero__actions">
            <Link to="/register" className="btn btn--primary btn--lg">
              Create free account
            </Link>
            <Link to="/login" className="btn btn--secondary btn--lg">
              Sign in
            </Link>
          </div>
          <div className="hero__meta">
            <span className="hero__meta-item">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              ₹10,000 simulated balance
            </span>
            <span className="hero__meta-item">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              No bank account needed
            </span>
            <span className="hero__meta-item">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              Real offline functionality
            </span>
          </div>
        </div>

        <div className="hero__visual">
          <div className="hero-phone">
            <div className="hero-phone__notch" />
            <div className="hero-phone__screen">
              <div className="hero-phone__header">
                <div className="hero-phone__status">
                  <span className="hero-phone__dot hero-phone__dot--offline" />
                  Offline
                </div>
                <span className="hero-phone__time">9:41</span>
              </div>
              <div className="hero-phone__balance">
                <span className="hero-phone__balance-label">Available Balance</span>
                <span className="hero-phone__balance-amount">₹8,500.00</span>
              </div>
              <div className="hero-phone__tx">
                <div className="hero-phone__tx-row">
                  <div className="hero-phone__tx-icon hero-phone__tx-icon--offline">⚡</div>
                  <div className="hero-phone__tx-info">
                    <span className="hero-phone__tx-name">To Priya Sharma</span>
                    <span className="hero-phone__tx-time">Queued · Syncs when online</span>
                  </div>
                  <span className="hero-phone__tx-amount">−₹500.00</span>
                </div>
                <div className="hero-phone__tx-row">
                  <div className="hero-phone__tx-icon hero-phone__tx-icon--done">✓</div>
                  <div className="hero-phone__tx-info">
                    <span className="hero-phone__tx-name">To Rahul Mehta</span>
                    <span className="hero-phone__tx-time">2h ago · Completed</span>
                  </div>
                  <span className="hero-phone__tx-amount">−₹1,000.00</span>
                </div>
              </div>
              <div className="hero-phone__send-btn">Send Money</div>
            </div>
          </div>
        </div>
      </section>

      <section className="how-it-works" id="how-it-works">
        <div className="section-container">
          <span className="section-label">How it works</span>
          <h2 className="section-title">Three steps. No connectivity required.</h2>
          <div className="steps">
            <div className="step">
              <div className="step__number">1</div>
              <div className="step__content">
                <h3>Create a payment</h3>
                <p>Select a recipient, enter an amount, and confirm. The payment is validated and queued locally in your browser.</p>
              </div>
              <div className="step__flow">
                <div className="step__flow-line" />
                <div className="step__flow-box">IndexedDB</div>
              </div>
            </div>
            <div className="step">
              <div className="step__number">2</div>
              <div className="step__content">
                <h3>Payment stays safe</h3>
                <p>Your payment data is stored securely in the browser. It won&apos;t be lost, duplicated, or processed twice — even on retry.</p>
              </div>
              <div className="step__flow">
                <div className="step__flow-line" />
                <div className="step__flow-box">Duplicate protection</div>
              </div>
            </div>
            <div className="step">
              <div className="step__number">3</div>
              <div className="step__content">
                <h3>Auto-sync when online</h3>
                <p>The moment connectivity returns, pending payments sync to the server automatically. Balances update in real time.</p>
              </div>
              <div className="step__flow">
                <div className="step__flow-line" />
                <div className="step__flow-box">Server</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="features" id="features">
        <div className="section-container">
          <span className="section-label">Why Offline UPI</span>
          <h2 className="section-title">Built for the real world.</h2>
          <div className="features-grid">
            <div className="feature">
              <div className="feature__icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12.55a11 11 0 0 1 14.08 0"/>
                  <path d="M1.42 9a16 16 0 0 1 21.16 0"/>
                  <path d="M8.53 16.11a6 6 0 0 1 6.95 0"/>
                  <circle cx="12" cy="20" r="1"/>
                </svg>
              </div>
              <h3>Works offline</h3>
              <p>Network drops don&apos;t break your payment flow. Create payments anytime, sync when connected.</p>
            </div>
            <div className="feature">
              <div className="feature__icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
              </div>
              <h3>Never double-charged</h3>
              <p>Every transaction has a unique ID. The server checks before processing, so retries can never create duplicates.</p>
            </div>
            <div className="feature">
              <div className="feature__icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12 6 12 12 16 14"/>
                </svg>
              </div>
              <h3>Auto synchronization</h3>
              <p>Payments sync in the background the instant you&apos;re back online. No manual action needed.</p>
            </div>
            <div className="feature">
              <div className="feature__icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
              </div>
              <h3>Secure by design</h3>
              <p>End-to-end encryption, atomic database transactions, and server-side balance validation protect every payment.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="cta-section">
        <div className="section-container">
          <div className="cta-card">
            <h2>Ready to try it?</h2>
            <p>Create a free account and start with a ₹10,000 simulated balance. No bank details required.</p>
            <div className="cta-card__actions">
              <Link to="/register" className="btn btn--primary btn--lg">
                Get started free
              </Link>
              <Link to="/login" className="btn btn--secondary btn--lg">
                Sign in
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="landing-footer">
        <div className="landing-footer__inner">
          <div className="landing-footer__brand">
            <span className="landing-header__mark" aria-hidden="true">₹</span>
            <span>Offline UPI</span>
          </div>
          <p className="landing-footer__note">
            A portfolio project exploring offline-first digital payments.
            Not connected to real UPI, banks, or NPCI.
          </p>
          <div className="landing-footer__links">
            <Link to="/login">Log in</Link>
            <Link to="/register">Create account</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
