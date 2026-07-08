import axios from 'axios';

// BUG FIX: the previous frontend read `process.env.REACT_APP_API_URL` directly
// in every component with no fallback. If the env var wasn't set at build
// time, every request went to `"undefined/api/..."` and failed silently.
// Vite's dev proxy (see vite.config.js) forwards "/api" to the backend, and
// in production VITE_API_URL should point at the deployed API — but we still
// fall back to a same-origin relative path instead of the literal string
// "undefined" if it's missing.
const baseURL = import.meta.env.VITE_API_URL || '';

const api = axios.create({
  baseURL,
  timeout: 20000,
});

export default api;
