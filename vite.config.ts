import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
  esbuild: {
    target: 'esnext',
  },
  optimizeDeps: {
    exclude: ['@gorules/zen-engine', '@gorules/zen-engine-wasm32-wasip1'],
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'esnext',
    rollupOptions: {
      external: ['electron'],
    },
  },
});
