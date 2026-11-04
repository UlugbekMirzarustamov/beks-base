import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// base: './' makes the built app work from any folder or static host
// (GitHub Pages, Netlify, a USB stick...). Routing uses #hashes, so no server setup is needed.
export default defineConfig({
  base: './',
  plugins: [react()],
  test: { environment: 'node' },
});
