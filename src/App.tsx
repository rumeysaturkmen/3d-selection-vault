import { lazy, Suspense, useEffect } from 'react';
import { Link, NavLink, Route, Routes, useLocation } from 'react-router-dom';
import Catalogue from './pages/Catalogue';
import TechniquePage from './pages/Technique';
import About from './pages/About';
import Papers from './pages/Papers';
import ThemeToggle from './ThemeToggle';

// The 3D graph pulls in three.js, so it loads only when someone opens it.
const GraphPage = lazy(() => import('./pages/Graph'));
import { REPO_URL, techniques } from './lib/data';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export default function App() {
  return (
    <div className="shell">
      <ScrollToTop />
      <header className="site-header">
        <Link to="/" className="brand" aria-label="3D Selection Vault home">
          <span className="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="22" height="22">
              <path d="M12 2 21 7v10l-9 5-9-5V7z" fill="none" stroke="currentColor" strokeWidth="1.6" />
              <path d="M3 7l9 5 9-5M12 12v10" fill="none" stroke="currentColor" strokeWidth="1.6" />
              <circle cx="12" cy="12" r="2.2" fill="var(--accent)" stroke="none" />
            </svg>
          </span>
          <span>3D Selection Vault</span>
        </Link>
        <nav className="site-nav">
          <NavLink to="/" end className="nav-home">
            Techniques
          </NavLink>
          <NavLink to="/graph">Graph</NavLink>
          <NavLink to="/papers">Papers</NavLink>
          <NavLink to="/about">About</NavLink>
          <a
            className="nav-cta"
            href={`${REPO_URL}/issues/new/choose`}
            target="_blank"
            rel="noreferrer"
          >
            <span className="long">Suggest a technique</span>
            <span className="short">Suggest</span>
          </a>
          <ThemeToggle />
        </nav>
      </header>
      <main className="site-main">
        <Routes>
          <Route path="/" element={<Catalogue />} />
          <Route path="/technique/:id" element={<TechniquePage />} />
          <Route
            path="/graph"
            element={
              <Suspense fallback={<p className="muted">Loading the graph…</p>}>
                <GraphPage />
              </Suspense>
            }
          />
          <Route path="/papers" element={<Papers />} />
          <Route path="/about" element={<About />} />
          <Route
            path="*"
            element={
              <div className="empty">
                <h1>Page not found</h1>
                <p>
                  <Link to="/">Back to all techniques</Link>
                </p>
              </div>
            }
          />
        </Routes>
      </main>
      <footer className="site-footer">
        <span>
          {techniques.length} techniques · Open data under MIT
        </span>
      </footer>
    </div>
  );
}
