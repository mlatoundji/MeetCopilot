import { defineConfig } from 'vite';

export default defineConfig({
  // Serve and build from the public folder
  root: 'public',
  build: {
    // Output to project-level dist directory
    outDir: '../dist',
    emptyOutDir: true
  }
}); 