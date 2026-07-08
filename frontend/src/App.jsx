import { Routes, Route, Link } from 'react-router-dom';
import ProblemList from './pages/ProblemList.jsx';
import ProblemDetails from './pages/ProblemDetails.jsx';

function App() {
  return (
    <div className="min-h-full">
      <header className="border-b border-[var(--color-ink-border)] bg-[var(--color-ink-900)]/70 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center gap-2">
          <Link to="/" className="flex items-center gap-2 group">
            <svg width="26" height="26" viewBox="0 0 32 32" className="shrink-0">
              <rect width="32" height="32" rx="7" fill="var(--color-ink-800)" />
              <path d="M9 21 L9 11 L13 11 L13 21 Z M13 16 L20 11 L20 14 L16.5 16 L20 18 L20 21 Z" fill="var(--color-torch-500)" />
            </svg>
            <span className="font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight text-[var(--color-fg)] group-hover:text-[var(--color-torch-400)] transition-colors">
              CodeArena
            </span>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        <Routes>
          <Route path="/" element={<ProblemList />} />
          <Route path="/problem/:id" element={<ProblemDetails />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
