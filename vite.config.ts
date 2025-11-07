import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path, { resolve } from 'path';
import { copyFileSync, existsSync, writeFileSync } from 'fs';

// https://vitejs.dev/config/
export default defineConfig({
 plugins: [react(), {
    name: 'copy-files',
    writeBundle() {
      // Copy manifest.json
      const manifestSrc = path.resolve(__dirname, 'manifest.json');
      const manifestDest = path.resolve(__dirname, 'dist/manifest.json');
      copyFileSync(manifestSrc, manifestDest);

      // Copy or create content.css if it exists
      const cssSrc = path.resolve(__dirname, 'src/content.css');
      const cssDest = path.resolve(__dirname, 'dist/content.css');

      if (existsSync(cssSrc)) {
        copyFileSync(cssSrc, cssDest);
      } else {
        // Create empty content.css if it doesn't exist
        writeFileSync(cssDest, '/* Content styles */\n');
      }

      console.log('✅ Copied manifest.json and content.css to dist/');
    }
  }],
  server: {
    port: 3000,
    strictPort: false,
    host: '127.0.0.1',
  },
  build: {
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'popup.html'),
        auth: resolve(__dirname, 'auth.html'),
        background: resolve(__dirname, 'src/background.ts'),
        content: resolve(__dirname, 'src/content.ts'),
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        assetFileNames: (assetInfo) => {
          // Keep HTML files as .html
          if (assetInfo.name?.endsWith('.html')) {
            return '[name][extname]';
          }
          return '[name][extname]';
        },
      },
    },
    outDir: 'dist',
    emptyOutDir: true,
  },
  define: {
    'process.env': {},
  },
});
