const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const problemRoutes = require('./routes/problemRoutes');

// ── Fail fast on missing required config ────────────────────────────────────
if (!process.env.MONGO_URI) {
    console.error('❌ Missing MONGO_URI in environment. Copy .env.example to .env and fill it in.');
    process.exit(1);
}

const app = express();

// ── 1. CORS ──────────────────────────────────────────────────────────────────
// Configure allowed origins via env (comma separated) so this never has to be
// hard-coded / edited again for every new deployment.
const defaultOrigins = ['http://localhost:5173', 'http://localhost:3000'];
const allowedOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map((o) => o.trim())
    : defaultOrigins;

app.use(cors({
    origin: allowedOrigins,
    credentials: true,
}));

// ── 2. Rate limiting ─────────────────────────────────────────────────────────
app.set('trust proxy', 1);

const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many requests. Please try again later.' },
});

// Code execution is expensive (spawns Docker containers), so it gets its own,
// stricter limiter instead of sharing the general API budget.
const executionLimiter = rateLimit({
    windowMs: 5 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many code executions. Please slow down and try again shortly.' },
});

app.use(generalLimiter);

// ── 3. Body parsing (built into Express 5, no body-parser dependency needed) ─
app.use(express.json({ limit: '1mb' }));

// ── 4. Logger ────────────────────────────────────────────────────────────────
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
});

// ── 5. Health check (useful for uptime monitors / container orchestrators) ──
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        status: 'ok',
        db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    });
});

// ── 6. Routes ────────────────────────────────────────────────────────────────
app.use('/api', problemRoutes(executionLimiter));

// ── 7. 404 + centralized error handler ──────────────────────────────────────
app.use((req, res) => {
    res.status(404).json({ success: false, message: 'Route not found' });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
});

// ── 8. Start server after DB connects ───────────────────────────────────────
mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log('✅ MongoDB connected');
        const PORT = process.env.PORT || 5000;
        const server = app.listen(PORT, () => console.log(`🚀 CodeArena API running on port ${PORT}`));

        // Graceful shutdown
        const shutdown = () => {
            console.log('Shutting down gracefully...');
            server.close(() => {
                mongoose.connection.close(false).then(() => process.exit(0));
            });
        };
        process.on('SIGINT', shutdown);
        process.on('SIGTERM', shutdown);
    })
    .catch((err) => {
        console.error('❌ MongoDB connection error:', err);
        process.exit(1);
    });
