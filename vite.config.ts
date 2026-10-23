import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Relative base so the build works on GitHub Pages (/3d-selection-vault/)
// and on any other static host or subfolder.
export default defineConfig({
  base: './',
  plugins: [react()],
});
