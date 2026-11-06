import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// base: './' makes the built app work from any folder or static host
// (GitHub Pages, Netlify, a USB stick...). Routing uses #hashes, so no server setup is needed.
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        // React in its own file: the app's own file stays smaller, and React stays cached between updates.
        manualChunks: (id) => (/node_modules\/(react|react-dom|scheduler)\//.test(id) ? 'react' : undefined),
      },
    },
  },
  test: { environment: 'node' },
});
