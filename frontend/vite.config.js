import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
export default defineConfig({
    plugins: [react(), tailwindcss()],
    server: {
        port: 5173,
        // Lets the dev server proxy /api calls straight to the backend so you
        // don't need CORS configured for local development.
        proxy: {
            '/api': {
                target: process.env.VITE_DEV_PROXY_TARGET || 'http://localhost:5000',
                changeOrigin: true,
            },
        },
    },
});
