import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import {resolve} from 'node:path';

export default defineConfig({
  base: '/integrations/remotion-quote-elements/',
  plugins: [react()],
  build: {rollupOptions: {input: {
    index: resolve(import.meta.dirname, 'index.html'),
    quoteCard: resolve(import.meta.dirname, 'quote-card/index.html'),
    lowerThird: resolve(import.meta.dirname, 'lower-third-quote/index.html'),
    sourceCredit: resolve(import.meta.dirname, 'source-credit/index.html'),
  }}},
});
