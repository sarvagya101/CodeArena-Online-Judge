import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import CodeMirror from '@uiw/react-codemirror';
import { cpp } from '@codemirror/lang-cpp';
import { python } from '@codemirror/lang-python';
import { java } from '@codemirror/lang-java';
import { vscodeDark } from '@uiw/codemirror-theme-vscode';
import confetti from 'canvas-confetti';
import { FaArrowLeft, FaHistory, FaCheckCircle, FaTimesCircle, FaExclamationTriangle } from 'react-icons/fa';
import api from '../api/client.js';

const LANG_EXTENSIONS = { cpp: [cpp()], python: [python()], java: [java()] };
const STARTER_CODE = {
  cpp: '#include <iostream>\nusing namespace std;\n\nint main() {\n    \n    return 0;\n}\n',
  python: '# Write your solution here\n',
  java: 'public class Solution {\n    public static void main(String[] args) {\n        \n    }\n}\n',
};

function fireConfetti() {
  confetti({
    particleCount: 120,
    spread: 80,
    origin: { y: 0.6 },
    colors: ['#46d18a', '#f2a93b', '#ffffff'],
  });
}

function Terminal({ label, content, isError }) {
  return (
    <div className="terminal mt-3">
      <div className="terminal-bar">
        <span className="terminal-dot bg-[#ff5f57]" />
        <span className="terminal-dot bg-[#febc2e]" />
        <span className="terminal-dot bg-[#28c840]" />
        <span className="ml-2 text-xs text-[var(--color-fg-muted)] font-[family-name:var(--font-mono)]">{label}</span>
      </div>
      <pre className={`terminal-body ${isError ? 'text-[var(--color-fail-500)]' : 'text-[var(--color-pass-500)]'}`}>
        {content || '(no output)'}
      </pre>
    </div>
  );
}

function TestCaseTable({ rows }) {
  return (
    <div className="overflow-x-auto mt-3 rounded-lg border border-[var(--color-ink-border)]">
      <table className="w-full text-sm" style={{ tableLayout: 'fixed' }}>
        <colgroup>
          <col style={{ width: '5%' }} />
          <col style={{ width: '25%' }} />
          <col style={{ width: '20%' }} />
          <col style={{ width: '25%' }} />
          <col style={{ width: '25%' }} />
        </colgroup>
        <thead className="bg-[var(--color-ink-700)] text-left">
          <tr>
            <th className="px-3 py-2">#</th>
            <th className="px-3 py-2">Input</th>
            <th className="px-3 py-2">Expected</th>
            <th className="px-3 py-2">Actual</th>
            <th className="px-3 py-2">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((test, i) => (
            <tr key={i} className="border-t border-[var(--color-ink-border)] align-top">
              <td className="px-3 py-2">{i + 1}</td>
              <td className="px-3 py-2 font-[family-name:var(--font-mono)] break-words">{test.input}</td>
              <td className="px-3 py-2 font-[family-name:var(--font-mono)] break-words">{test.expectedOutput}</td>
              <td className={`px-3 py-2 font-[family-name:var(--font-mono)] break-words ${test.passed ? 'text-[var(--color-pass-500)]' : 'text-[var(--color-fail-500)]'}`}>
                {test.result || 'N/A'}
                {test.error && <pre className="mt-1 text-[11px] text-[var(--color-fail-500)] whitespace-pre-wrap">{test.error}</pre>}
              </td>
              <td className="px-3 py-2">
                <span className={`badge ${test.passed ? 'bg-[var(--color-pass-500)]/10 text-[var(--color-pass-500)]' : test.result === 'Runtime error' ? 'bg-[var(--color-warn-500)]/10 text-[var(--color-warn-500)]' : 'bg-[var(--color-fail-500)]/10 text-[var(--color-fail-500)]'}`}>
                  {test.passed ? <FaCheckCircle size={10} /> : test.result === 'Runtime error' ? <FaExclamationTriangle size={10} /> : <FaTimesCircle size={10} />}
                  {test.passed ? 'Accepted' : test.result === 'Runtime error' ? 'Runtime Error' : 'Wrong Answer'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function ProblemDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [problem, setProblem] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [codeByLanguage, setCodeByLanguage] = useState(STARTER_CODE);
  const [language, setLanguage] = useState('cpp');

  const [verdict, setVerdict] = useState('');
  const [testResult, setTestResult] = useState(null);
  const [submissionHistory, setSubmissionHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);

  const [compileResult, setCompileResult] = useState(null);
  const [compiled, setCompiled] = useState(false);
  const [lastCompiledCode, setLastCompiledCode] = useState('');
  const [compiling, setCompiling] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [shake, setShake] = useState(false);

  const [customInput, setCustomInput] = useState('');
  const [runOutput, setRunOutput] = useState(null);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    api.get(`/api/problems/${id}`)
      .then((res) => setProblem(res.data.problem))
      .catch((err) => {
        console.error('Error fetching problem:', err);
        setLoadError('Could not load this problem.');
      });

    // BUG FIX: submission history used to silently disappear on a 404 when
    // there simply weren't any submissions yet (the backend returned 404 for
    // "none found"), so `.catch` fired instead of showing an empty state.
    // The backend now returns 200 with an empty array, and the frontend
    // treats "no submissions" as normal, not an error.
    api.get(`/api/submissions/${id}`)
      .then((res) => setSubmissionHistory(res.data.submissions || []))
      .catch((err) => console.error('Error fetching submissions:', err));
  }, [id]);

  const resetVerdictState = () => {
    setVerdict('');
    setTestResult(null);
    setCompileResult(null);
  };

  const handleLanguageChange = (e) => {
    setLanguage(e.target.value);
    resetVerdictState();
    setCompiled(false);
    setLastCompiledCode('');
    setRunOutput(null);
    setCustomInput('');
  };

  const handleCompile = () => {
    const currentCode = codeByLanguage[language];
    setCompileResult(null);
    setCompiled(false);
    setCompiling(true);
    setLastCompiledCode(currentCode);
    resetVerdictState();

    api.post(`/api/problems/${id}/compile`, { code: currentCode, language })
      .then(() => {
        setCompiled(true);
        setCompileResult({ success: true, message: 'Compilation successful' });
      })
      .catch((err) => {
        setCompiled(false);
        const data = err.response?.data || {};
        setCompileResult({ success: false, message: data.message || 'Compilation failed', error: data.error || err.message });
      })
      .finally(() => setCompiling(false));
  };

  const handleRun = async () => {
    const currentCode = codeByLanguage[language];
    if (!compiled || currentCode !== lastCompiledCode) {
      setRunOutput({ error: 'Please compile your code first before running' });
      return;
    }

    setRunning(true);
    setRunOutput(null);
    try {
      const res = await api.post(`/api/problems/${id}/run`, { code: currentCode, language, input: customInput });
      setRunOutput({ output: res.data.output, error: res.data.error });
    } catch (err) {
      setRunOutput({ error: err.response?.data?.error || err.response?.data?.message || err.message });
    } finally {
      setRunning(false);
    }
  };

  const handleSubmit = async () => {
    const currentCode = codeByLanguage[language];
    if (!compiled || currentCode !== lastCompiledCode) {
      setCompileResult({ success: false, message: 'Please compile your latest code before submitting' });
      return;
    }

    setSubmitting(true);
    resetVerdictState();

    try {
      const res = await api.post(`/api/problems/${id}/submit`, { code: currentCode, language });
      setVerdict(res.data.result);

      if (res.data.result === 'Success') {
        fireConfetti();
      } else {
        setShake(false);
        setTimeout(() => {
          setShake(true);
          setTimeout(() => setShake(false), 500);
        }, 10);
      }

      setTestResult({ passed: res.data.passed, total: res.data.total, details: res.data.testResults || [] });

      const historyRes = await api.get(`/api/submissions/${id}`);
      setSubmissionHistory(historyRes.data.submissions || []);
    } catch (err) {
      const data = err.response?.data;
      setVerdict(`Error: ${data?.error || data?.message || err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewSubmission = (submission) => {
    setLanguage(submission.language);
    setCodeByLanguage((prev) => ({ ...prev, [submission.language]: submission.code }));
    setShowHistory(false);
    setVerdict(submission.result);
    setTestResult({ passed: submission.passed, total: submission.total, details: submission.testResults || [] });
  };

  if (loadError) {
    return (
      <div className="panel p-6 text-center">
        <p className="text-[var(--color-fail-500)] mb-4">{loadError}</p>
        <button className="btn btn-secondary" onClick={() => navigate('/')}><FaArrowLeft /> Back to list</button>
      </div>
    );
  }

  if (!problem) {
    return <p className="text-[var(--color-fg-muted)]">Loading problem…</p>;
  }

  return (
    <div>
      <div className="flex gap-2 mb-4">
        <button className="btn btn-secondary" onClick={() => (showHistory ? setShowHistory(false) : navigate('/'))}>
          <FaArrowLeft /> {showHistory ? 'Back to problem' : 'Back to list'}
        </button>
        {!showHistory && (
          <button className="btn btn-secondary" onClick={() => setShowHistory(true)}>
            <FaHistory /> Submission history
          </button>
        )}
      </div>

      {!showHistory && (
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h2 className="text-xl font-semibold mb-3">{problem.title}</h2>
            <p className="text-sm leading-relaxed mb-4">{problem.statement}</p>

            <h3 className="text-sm font-semibold text-[var(--color-fg-muted)] uppercase tracking-wide mb-2">Examples</h3>
            {problem.examples.map((example, i) => {
              const [inputPart, outputPart] = example.split('Output:');
              return (
                <pre key={i} className="panel px-3 py-2 mb-2 text-xs font-[family-name:var(--font-mono)] whitespace-pre-wrap">
                  <strong>Input:</strong> {inputPart.replace('Input:', '').trim()}{'\n'}
                  <strong>Output:</strong> {outputPart?.trim() || ''}
                </pre>
              );
            })}

            <h3 className="text-sm font-semibold text-[var(--color-fg-muted)] uppercase tracking-wide mt-4 mb-2">Constraints</h3>
            <ul className="list-disc list-inside text-sm space-y-1 text-[var(--color-fg-muted)]">
              {problem.constraints.map((c, i) => <li key={i}>{c}</li>)}
            </ul>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-[var(--color-fg-muted)] uppercase tracking-wide">Your solution</h3>
              <select
                value={language}
                onChange={handleLanguageChange}
                className="rounded-lg border border-[var(--color-ink-border)] bg-[var(--color-ink-800)] px-3 py-1.5 text-sm outline-none"
              >
                <option value="cpp">C++</option>
                <option value="python">Python</option>
                <option value="java">Java</option>
              </select>
            </div>

            <CodeMirror
              value={codeByLanguage[language]}
              height="350px"
              theme={vscodeDark}
              extensions={LANG_EXTENSIONS[language]}
              onChange={(value) => setCodeByLanguage((prev) => ({ ...prev, [language]: value }))}
              style={{ fontSize: '14px', borderRadius: '0.6rem', overflow: 'hidden', border: '1px solid var(--color-ink-border)' }}
            />

            {compileResult && (
              <div className={`mt-3 panel p-3 text-sm ${compileResult.success ? 'border-[var(--color-pass-500)]/40' : 'border-[var(--color-fail-500)]/40'}`}>
                <strong className={compileResult.success ? 'text-[var(--color-pass-500)]' : 'text-[var(--color-fail-500)]'}>
                  {compileResult.message}
                </strong>
                {compileResult.error && (
                  <pre className="mt-2 bg-[#08090b] rounded-lg p-2 text-xs font-[family-name:var(--font-mono)] whitespace-pre-wrap">{compileResult.error}</pre>
                )}
              </div>
            )}

            {verdict && (
              <div className={`mt-3 panel p-3 verdict-stamp ${shake ? 'shake' : ''} ${verdict === 'Success' ? 'border-[var(--color-pass-500)]/40' : 'border-[var(--color-fail-500)]/40'}`}>
                <div className="flex items-center justify-between">
                  <strong className={verdict === 'Success' ? 'text-[var(--color-pass-500)]' : 'text-[var(--color-fail-500)]'}>
                    Verdict: {verdict}
                  </strong>
                  {testResult && (
                    <span className="badge bg-[var(--color-ink-700)]">
                      {testResult.passed}/{testResult.total} passed
                    </span>
                  )}
                </div>
                {testResult?.details?.length > 0 && <TestCaseTable rows={testResult.details} />}
              </div>
            )}

            <div className="flex gap-2 mt-3">
              <button className="btn btn-primary" onClick={handleCompile} disabled={compiling || submitting || !codeByLanguage[language]}>
                {compiling ? 'Compiling…' : 'Compile'}
              </button>
              <button className="btn btn-signal" onClick={handleSubmit} disabled={submitting || compiling || !codeByLanguage[language]}>
                {submitting ? 'Submitting…' : 'Submit'}
              </button>
            </div>

            <div className="mt-3">
              <label className="text-xs text-[var(--color-fg-muted)]">Custom input</label>
              <textarea
                rows={3}
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                placeholder="Enter custom input here…"
                className="w-full mt-1 rounded-lg border border-[var(--color-ink-border)] bg-[var(--color-ink-800)] px-3 py-2 text-sm font-[family-name:var(--font-mono)] outline-none focus:border-[var(--color-torch-500)]"
              />
            </div>

            <button className="btn btn-secondary mt-2" onClick={handleRun} disabled={running || compiling || submitting || !codeByLanguage[language]}>
              {running ? 'Running…' : '▶ Run code'}
            </button>

            {runOutput && <Terminal label={runOutput.error ? 'stderr' : 'stdout'} content={runOutput.error || runOutput.output} isError={!!runOutput.error} />}
          </div>
        </div>
      )}

      {showHistory && (
        <div>
          <h3 className="text-lg font-semibold mb-3">Submission history</h3>
          {submissionHistory.length === 0 ? (
            <div className="panel p-6 text-center text-sm text-[var(--color-fg-muted)]">No submissions yet.</div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-[var(--color-ink-border)]">
              {/*
                BUG FIX: this table used to reuse the test-case table's 5-column
                <colgroup>/<thead> (# / Input / Expected / Actual / Status) while
                its <tbody> actually rendered 6 different columns (# / Language /
                Result / Passed / Total / Submitted At). The header and body were
                completely out of sync. It now has its own matching header.
              */}
              <table className="w-full text-sm" style={{ tableLayout: 'fixed' }}>
                <colgroup>
                  <col style={{ width: '6%' }} />
                  <col style={{ width: '14%' }} />
                  <col style={{ width: '16%' }} />
                  <col style={{ width: '12%' }} />
                  <col style={{ width: '12%' }} />
                  <col style={{ width: '40%' }} />
                </colgroup>
                <thead className="bg-[var(--color-ink-700)] text-left">
                  <tr>
                    <th className="px-3 py-2">#</th>
                    <th className="px-3 py-2">Language</th>
                    <th className="px-3 py-2">Result</th>
                    <th className="px-3 py-2">Passed</th>
                    <th className="px-3 py-2">Total</th>
                    <th className="px-3 py-2">Submitted at</th>
                  </tr>
                </thead>
                <tbody>
                  {submissionHistory.map((s, i) => (
                    <tr
                      key={s._id}
                      onClick={() => handleViewSubmission(s)}
                      className="border-t border-[var(--color-ink-border)] cursor-pointer hover:bg-[var(--color-ink-700)]/50"
                    >
                      <td className="px-3 py-2">{i + 1}</td>
                      <td className="px-3 py-2"><span className="badge bg-[var(--color-signal-500)]/10 text-[var(--color-signal-500)]">{s.language.toUpperCase()}</span></td>
                      <td className="px-3 py-2">
                        <span className={`badge ${s.result === 'Success' ? 'bg-[var(--color-pass-500)]/10 text-[var(--color-pass-500)]' : 'bg-[var(--color-fail-500)]/10 text-[var(--color-fail-500)]'}`}>
                          {s.result}
                        </span>
                      </td>
                      <td className="px-3 py-2">{s.passed}</td>
                      <td className="px-3 py-2">{s.total}</td>
                      <td className="px-3 py-2 text-[var(--color-fg-muted)]">{new Date(s.submittedAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
