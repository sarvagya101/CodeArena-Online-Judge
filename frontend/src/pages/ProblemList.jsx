import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaSearch, FaTimes, FaCheck } from 'react-icons/fa';
import api from '../api/client.js';

const DIFFICULTY_RANK = { Easy: 1, Medium: 2, Hard: 3 };

const DIFFICULTY_STYLE = {
  Easy: { dot: 'bg-[var(--color-pass-500)]', text: 'text-[var(--color-pass-500)]', bg: 'bg-[var(--color-pass-500)]/10' },
  Medium: { dot: 'bg-[var(--color-warn-500)]', text: 'text-[var(--color-warn-500)]', bg: 'bg-[var(--color-warn-500)]/10' },
  Hard: { dot: 'bg-[var(--color-fail-500)]', text: 'text-[var(--color-fail-500)]', bg: 'bg-[var(--color-fail-500)]/10' },
};

function SkeletonRow() {
  return (
    <div className="panel flex items-center justify-between px-4 py-3.5 animate-pulse">
      <div className="h-4 w-48 rounded bg-[var(--color-ink-600)]" />
      <div className="h-5 w-20 rounded-full bg-[var(--color-ink-600)]" />
    </div>
  );
}

export default function ProblemList() {
  const [problems, setProblems] = useState([]);
  const [original, setOriginal] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchVisible, setSearchVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const searchInputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/api/problems')
      .then((res) => {
        setProblems(res.data.problems);
        setOriginal(res.data.problems);
      })
      .catch((err) => {
        console.error('Error fetching problem list:', err);
        setError('Could not load problems. Is the API running?');
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (searchVisible) searchInputRef.current?.focus();
  }, [searchVisible]);

  const sortByDifficulty = (order) => {
    if (order === 'default') return setProblems([...original]);
    setProblems(
      [...original].sort((a, b) => {
        const diff = (DIFFICULTY_RANK[a.difficulty] || 0) - (DIFFICULTY_RANK[b.difficulty] || 0);
        return order === 'asc' ? diff : -diff;
      }),
    );
  };

  const sortBySolved = (order) => {
    setProblems(
      [...original].sort((a, b) => {
        const diff = (a.solved ? 1 : 0) - (b.solved ? 1 : 0);
        return order === 'solvedFirst' ? -diff : diff;
      }),
    );
  };

  const counts = ['Easy', 'Medium', 'Hard'].map((label) => ({
    label,
    total: original.filter((p) => p.difficulty === label).length,
    solved: original.filter((p) => p.difficulty === label && p.solved).length,
  }));
  const totalSolved = counts.reduce((sum, c) => sum + c.solved, 0);
  const totalCount = counts.reduce((sum, c) => sum + c.total, 0);
  const pct = (solved, total) => (total ? Math.round((solved / total) * 100) : 0);

  const visibleProblems = problems.filter((p) => p.title.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div>
      <div className="flex items-center justify-between mb-5 gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Problem Roster</h1>
          <p className="text-sm text-[var(--color-fg-muted)] mt-0.5">
            {totalSolved} of {totalCount} solved
          </p>
        </div>
        <div className="flex items-center gap-2">
          {searchVisible && (
            <input
              ref={searchInputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search problems…"
              className="w-48 rounded-lg border border-[var(--color-ink-border)] bg-[var(--color-ink-800)] px-3 py-2 text-sm outline-none focus:border-[var(--color-torch-500)] transition-colors"
            />
          )}
          <button
            className="btn btn-secondary"
            onClick={() => { setSearchVisible((v) => !v); setSearchTerm(''); }}
            title={searchVisible ? 'Close search' : 'Search'}
          >
            {searchVisible ? <FaTimes /> : <FaSearch />}
          </button>
          <select
            className="rounded-lg border border-[var(--color-ink-border)] bg-[var(--color-ink-800)] px-3 py-2 text-sm outline-none"
            defaultValue=""
            onChange={(e) => {
              const v = e.target.value;
              if (v === 'default' || v === 'asc' || v === 'desc') sortByDifficulty(v);
              if (v === 'solvedFirst' || v === 'unsolvedFirst') sortBySolved(v);
              e.target.value = '';
            }}
          >
            <option value="" disabled>Sort…</option>
            <option value="default">Default order</option>
            <option value="asc">Easy → Hard</option>
            <option value="desc">Hard → Easy</option>
            <option value="solvedFirst">Solved first</option>
            <option value="unsolvedFirst">Unsolved first</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-6">
        {counts.map(({ label, solved, total }) => {
          const style = DIFFICULTY_STYLE[label];
          return (
            <div key={label} className="panel p-4">
              <div className="flex items-center justify-between mb-2">
                <span className={`badge ${style.bg} ${style.text}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                  {label}
                </span>
                <span className="text-xs text-[var(--color-fg-muted)]">{solved}/{total}</span>
              </div>
              <div className="h-1.5 rounded-full bg-[var(--color-ink-700)] overflow-hidden mb-2">
                <div
                  className={`h-full ${style.dot} transition-all duration-700`}
                  style={{ width: `${pct(solved, total)}%` }}
                />
              </div>
              <p className="text-xl font-semibold font-[family-name:var(--font-display)]">{pct(solved, total)}%</p>
            </div>
          );
        })}
      </div>

      {error && (
        <div className="panel border-[var(--color-fail-500)]/40 p-4 text-sm text-[var(--color-fail-500)] mb-4">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-2">
        {loading ? (
          [...Array(6)].map((_, i) => <SkeletonRow key={i} />)
        ) : visibleProblems.length === 0 ? (
          <div className="panel p-6 text-center text-sm text-[var(--color-fg-muted)]">
            No problems match "{searchTerm}".
          </div>
        ) : (
          visibleProblems.map((problem) => {
            const style = DIFFICULTY_STYLE[problem.difficulty];
            return (
              <button
                key={problem._id}
                onClick={() => navigate(`/problem/${problem._id}`)}
                className={`panel flex items-center justify-between px-4 py-3.5 text-left transition-colors hover:border-[var(--color-torch-500)]/50 ${problem.solved ? 'bg-[var(--color-pass-500)]/[0.04]' : ''}`}
              >
                <span className="font-medium">{problem.title}</span>
                <span className="flex items-center gap-2 shrink-0">
                  <span className={`badge ${style.bg} ${style.text}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                    {problem.difficulty}
                  </span>
                  {problem.solved && (
                    <span className="badge bg-[var(--color-pass-500)]/10 text-[var(--color-pass-500)]">
                      <FaCheck size={10} /> Solved
                    </span>
                  )}
                </span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
