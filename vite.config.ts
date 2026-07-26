import path from 'node:path';
import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

const repositoryRoot = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react(), tailwindcss(), viteSingleFile()],
  resolve: {
    alias: {
      '@shared': path.join(repositoryRoot, 'shared'),
    },
  },
  build: {
    assetsInlineLimit: 100_000_000,
    emptyOutDir: false,
    outDir: path.join(repositoryRoot, 'dist'),
    target: 'es2020',
  },
});
