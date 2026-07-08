<div align="center">

# ⚡ CodeArena

### *A modern, secure, Docker-sandboxed Online Judge.*

[![MERN Stack](https://img.shields.io/badge/Stack-MERN-blue.svg?style=for-the-badge)](https://react.dev/)
[![Docker](https://img.shields.io/badge/Docker-Enabled-blue?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

<p align="center">
  <a href="#-features">Features</a> •
  <a href="#%EF%B8%8F-tech-stack">Tech Stack</a> •
  <a href="#-local-setup">Setup</a> •
  <a href="#-api-reference">API</a> •
  <a href="#-security">Security</a> •
  <a href="#-whats-changed">What changed</a>
</p>

---

CodeArena compiles and executes submitted code inside isolated, network-disabled Docker containers, with live verdicts, a per-test-case breakdown, and full submission history — for **C++, Python, and Java**.

</div>

---

## ✨ Features

- **🐳 Real Docker sandboxing** — every run executes in a fresh, `--rm` container with no network access, a memory cap, a CPU cap, and a process-count cap.
- **🖊️ Rich code editor** — CodeMirror 6 with syntax highlighting for all three supported languages.
- **⚙️ Three-stage workflow** — `Compile` → `Run with custom input` → `Submit` against the official test cases.
- **📋 Per-test-case breakdown** — input, expected output, actual output, and a clear verdict for each case.
- **📊 Submission history & replay** — click a past submission to reload its exact code and result.
- **📈 Progress dashboard** — Easy/Medium/Hard completion tracked from real submission records.
- **🔍 Search & sort** — filter by title, sort by difficulty or solved status.
- **🎉 Micro-interactions** — a confetti burst on an accepted verdict, a shake on a rejected one.

---

## 🛠️ Tech Stack

### Frontend
| Technology | Version | Purpose |
| :--- | :--- | :--- |
| **React** | 19.2 | Component-driven UI |
| **Vite** | 8 | Dev server & production bundler (replaces the retired Create React App) |
| **Tailwind CSS** | 4.3 | Utility-first styling, CSS-first config |
| **React Router** | 7.18 | Client-side routing |
| **CodeMirror 6** | latest | Multi-language code editor |
| **Axios** | 1.18 | HTTP client |
| **canvas-confetti** | 1.9 | Success animation |

### Backend
| Technology | Version | Purpose |
| :--- | :--- | :--- |
| **Node.js** | 20.19+ | Runtime |
| **Express** | 5.2 | REST API |
| **MongoDB + Mongoose** | 9.7 | Persistence for problems & submissions |
| **Docker** | any recent | Isolated code execution |
| **express-rate-limit** | 8.5 | Request throttling, with a separate stricter limiter on execution endpoints |

### Execution matrix
| Language | Image | Compile | Run |
| :--- | :--- | :--- | :--- |
| **C++** | `gcc:latest` | `g++ source.cpp -o output` | `./output` |
| **Python** | `python:3.12-alpine` | `py_compile` (syntax check only) | `python solution.py` |
| **Java** | `eclipse-temurin:21` | `javac Solution.java` | `java Solution` |

---

## 🖥️ Local setup

**Prerequisites:** Node.js 20.19+, a MongoDB connection string (e.g. MongoDB Atlas), and Docker running locally (required for compile/run/submit — the API itself will start without it, but code execution will fail until Docker is reachable).

```bash
git clone https://github.com/sarvagya101/codeArena-online-Judge codearena
cd codearena
npm install                # installs backend + frontend via npm workspaces

cp backend/.env.example backend/.env      # then fill in MONGO_URI
cp frontend/.env.example frontend/.env    # optional for local dev (Vite proxies /api by default)

npm run seed                # loads the sample problem set
npm run dev                 # runs backend (port 5000) + frontend (port 5173) together
```

Open http://localhost:5173.

For production, `npm run build` builds the frontend to `frontend/dist/` (serve it from any static host or CDN) and `npm start` runs the backend API alone.

---

## 🔌 API reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| GET | `/api/health` | Liveness + DB connection check |
| GET | `/api/problems` | List all problems, with `solved` computed from submission history |
| GET | `/api/problems/:id` | Full problem detail |
| POST | `/api/problems/:id/compile` | Compile-only check |
| POST | `/api/problems/:id/run` | Run against custom input |
| POST | `/api/problems/:id/submit` | Run against the official test cases and persist the result |
| GET | `/api/submissions/:id` | Submission history for a problem (returns `[]`, not a 404, when empty) |

---

## 🛡️ Security

- **No shell interpolation of user code** — code is always written to a file first; execution reads it from disk.
- **Network-isolated containers** — every `docker run` includes `--network none`, plus memory, CPU, and process-count caps.
- **Per-request scratch directories** — each compile/run/submit gets its own temp folder (a random UUID), so concurrent requests can never overwrite each other's files, and everything is deleted afterwards.
- **Static blacklist** — submitted code is screened for shell execution, dangerous imports, infinite loops, and raw file/network access before it ever reaches a container.
- **Separate rate limits** — general API traffic and the (expensive) execution endpoints are throttled independently.

---

## 📄 What's changed

This is a modernization pass over the original OnlineJudge_MERN project — same core idea, updated stack, new name, redesigned UI, and a set of real bugs fixed:

- **Solved-status bug:** a problem used to be marked "solved" by checking whether a leftover file existed in `/temp` — shared across every visitor and wiped on every restart. It's now derived from actual `Submission` records.
- **Concurrency bug:** compile/run/submit used to write to filenames keyed only by problem ID (e.g. `output_<problemId>`), so two people working the same problem at the same time could overwrite each other's binary mid-run. Every execution now gets an isolated scratch directory.
- **Submission-history table bug:** the history table's header (`# / Input / Expected / Actual / Status`) didn't match what the body actually rendered (`# / Language / Result / Passed / Total / Submitted At`). Rebuilt with a matching 6-column header.
- **Broken test case:** the N-Queens problem had a literal `"..."` placeholder as an expected output for one test case, so it could never pass. Replaced with a real, checkable case.
- **Unsafe/unreliable Python compile step:** the old compile command ran `pip install pyflakes` over the network on every single compile call, which also conflicts with running containers network-isolated. Simplified to an offline syntax check.
- **Deprecated Mongoose options:** `useNewUrlParser`/`useUnifiedTopology` (removed years ago upstream) in `seed.js`.
- **CORS/proxy misconfiguration:** the old CORS allow-list included the backend's own local port instead of the frontend's; the CRA `proxy` field was missing its protocol. Origins are now environment-driven with sane local defaults.
- **Missing input validation:** `code`/`language` were previously trusted as-is; unrecognized languages silently fell back to C++. Now validated and rejected with a clear 400.
- **Frontend crash-if-unset env var:** `process.env.REACT_APP_API_URL` had no fallback, so a missing env var sent every request to the literal string `"undefined/api/..."`. The new client falls back to a relative path.
- **`Procfile.txt`:** Heroku-style platforms look for a file literally named `Procfile`, not `Procfile.txt` — renamed.
- **Dependency hygiene:** dropped unused packages (`framer-motion`, `devicons-react`, `react-loading-skeleton`, `bootstrap`, `@testing-library/*`, CRA's `react-scripts`/`web-vitals`) and mismatched/duplicated dependencies that had accumulated at the repo root.

### Roadmap
- [ ] Authenticated accounts (so "solved" is per-user, not global)
- [ ] Leaderboards
- [ ] Runtime/memory profiling per submission

---

## 📸 Screenshots

<!-- Add a screenshot or two once the app is running, e.g.: -->
<!-- ![Problem list](docs/screenshots/problem-list.png) -->
<!-- ![Problem detail with editor](docs/screenshots/problem-detail.png) -->

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome. See [`CONTRIBUTING.md`](CONTRIBUTING.md) for guidelines, and please check the [open issues](https://github.com/sarvagya101/CodeaArena-Online-Judge/issues) before starting work.

---

## 📄 License

Distributed under the MIT License. See [`LICENSE`](LICENSE) for details.

---

## 👤 Author

**Sarvagya Sharma**\n
B.Tech CSE student at Delhi Technological University

- GitHub: [@sarvagya101](https://github.com/sarvagya101)
- LinkedIn: [Sarvagya Sharma](https://www.linkedin.com/in/sarvagya-sharma-643946377/)
- Email: sarvagya101@gmail.com

---

## 🙏 Acknowledgments

- Built as a modernization of the original OnlineJudge_MERN project.

<div align="center">

If this project helped you, consider giving it a ⭐ on GitHub!

</div>
