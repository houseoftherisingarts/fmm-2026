import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  server: {
    port: 3000,
    host: '0.0.0.0',
    watch: {
      // Ignore the ruflo/claude-flow daemon's working dirs. Their SQLite
      // WAL/SHM files churn constantly and were triggering full page
      // reloads mid-game (the Hnefatafl board appeared to "restart"
      // because the page literally reloaded on every daemon write).
      ignored: [
        '**/.swarm/**',
        '**/.claude-flow/**',
        '**/.claude/**',
        '**/ruvector.db*',
        '**/*.db-shm',
        '**/*.db-wal',
        // .gitkeep is non-HMR-eligible — any change forces a full page
        // reload, which would interrupt an in-progress Hnefatafl game.
        '**/.gitkeep',
      ],
    },
  },
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
      src: path.resolve(__dirname, 'src'),
    },
    // Dedupe React/three so @react-three/fiber doesn't pull a second copy
    // (causes "Invalid hook call" / null useMemo).
    dedupe: ['react', 'react-dom', 'three'],
  },
  optimizeDeps: {
    include: ['@react-three/fiber', 'three'],
  },
  build: {
    target: 'es2020',
    rollupOptions: {
      output: {
        // firebase/analytics is intentionally NOT listed here — it's
        // dynamically imported only after LOI 25 consent, so Rollup
        // emits it as its own lazy chunk and it never lands in the
        // critical-path vendor-firebase bundle.
        manualChunks: {
          'vendor-react':    ['react', 'react-dom', 'react-router-dom'],
          'vendor-firebase': ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/storage'],
          'vendor-motion':   ['framer-motion'],
          'vendor-icons':    ['lucide-react'],
        },
      },
    },
    chunkSizeWarningLimit: 500,
  },
});
