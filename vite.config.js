import { defineConfig } from 'vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';

export default defineConfig({
  // Serve and build from the public folder
  root: 'public',
  build: {
    // Output to project-level dist directory
    outDir: '../dist',
    emptyOutDir: true
  },
  plugins: [
    viteStaticCopy({
      targets: [
        { src: 'pages/js/*.js', dest: 'pages/js' },
        { src: 'resources/i18n/*.json', dest: 'resources/i18n' },
        { src: 'pages/html/*.html', dest: 'pages/html' }
      ]
    })
  ]
}); 