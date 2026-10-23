import { Component, StrictMode, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';
import './styles.css';

// Collect any error the browser reports, so a failed page can say what went wrong.
const seen: string[] = [];
const note = (msg: string) => {
  if (msg && !seen.includes(msg)) seen.push(msg);
};
window.addEventListener('error', (e) => note(e.error?.stack || e.message));
window.addEventListener('unhandledrejection', (e) => note(String(e.reason?.stack || e.reason)));

function showFailure(extra?: string) {
  if (extra) note(extra);
  if (document.getElementById('crash')) return;
  const box = document.createElement('div');
  box.id = 'crash';
  box.className = 'crash';
  const details = seen.length ? seen.join('\n\n') : 'No error was reported; the page simply did not draw.';
  box.innerHTML = `
    <h1>This page failed to load</h1>
    <p>Reloading usually fixes it. If you see this, please send a screenshot of this box so the bug can be fixed.</p>
    <p><button type="button">Reload page</button></p>
    <pre></pre>
    <p class="small">${navigator.userAgent}</p>`;
  box.querySelector('pre')!.textContent = `${location.href}\n\n${details}`;
  box.querySelector('button')!.addEventListener('click', () => location.reload());
  document.body.appendChild(box);
}

// If the app ever ends up blank after moving between pages, show the failure instead of a white screen.
const root = document.getElementById('root')!;
const checkDrawn = () =>
  setTimeout(() => {
    if (!root.querySelector('.site-header')) showFailure();
  }, 1200);
window.addEventListener('hashchange', checkDrawn);
checkDrawn();

class Boundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: Error, info: { componentStack?: string | null }) {
    showFailure(`${error.stack || error.message}${info.componentStack ?? ''}`);
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

// HashRouter keeps every page working on GitHub Pages without server rewrites.
createRoot(root, {
  onUncaughtError: (error) => showFailure(String((error as Error)?.stack ?? error)),
  onRecoverableError: (error) => note(String((error as Error)?.stack ?? error)),
}).render(
  <StrictMode>
    <Boundary>
      <HashRouter>
        <App />
      </HashRouter>
    </Boundary>
  </StrictMode>,
);
