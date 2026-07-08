# Contributing to CodeArena

Thanks for your interest in improving CodeArena! Contributions of all sizes are welcome — bug fixes, new features, documentation, or just filing a good issue.

## Getting started

1. Fork the repo and clone your fork:
   ```bash
   git clone https://github.com/sarvagya101/codearena.git
   cd codearena
   ```
2. Install dependencies and set up your environment as described in the [README](README.md#-local-setup).
3. Create a branch for your change:
   ```bash
   git checkout -b feature/short-description
   ```

## Development workflow

- Run `npm run dev` from the repo root to start the backend and frontend together.
- Backend code lives in `backend/`, frontend code in `frontend/`.
- Make sure Docker is running locally if you're touching anything related to compile/run/submit.
- Keep changes focused — smaller, single-purpose pull requests are easier to review and merge.

## Commit messages

Use clear, descriptive commit messages, ideally in the imperative mood (e.g. `Fix concurrency bug in submission handler` rather than `Fixed bug`).

## Submitting a pull request

1. Push your branch and open a pull request against `main`.
2. Describe **what** the change does and **why**, and link any related issues.
3. Make sure the app still builds and runs locally (`npm run build`, `npm start`) before requesting review.
4. Be responsive to review feedback — small follow-up commits are fine.

## Reporting bugs / requesting features

Please open an issue and include:
- A clear description of the problem or request
- Steps to reproduce (for bugs), including language used and sample code if relevant
- What you expected to happen vs. what actually happened
- Environment details (OS, Node version, Docker version) if relevant

## Code of conduct

Be respectful and constructive. This project welcomes contributors of all experience levels.

---

Questions? Feel free to open an issue or reach out to [Sarvagya Sharma](mailto:sarvagya101@gmail.com).
