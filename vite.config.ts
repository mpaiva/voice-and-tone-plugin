import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';
import path from 'path';
import fs from 'fs';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const isCodeBuild = mode === 'code';

  if (isCodeBuild) {
    // Build the plugin code (code.ts)
    return {
      build: {
        rollupOptions: {
          input: path.resolve(__dirname, 'src/code.ts'),
          output: {
            entryFileNames: 'code.js',
            format: 'iife'
          }
        },
        outDir: 'dist',
        emptyOutDir: false,
        target: 'es2017'
      }
    };
  }

  // Build the UI (ui.html with React)
  return {
    plugins: [
      react(),
      viteSingleFile(),
      // Move ui.html to dist root
      {
        name: 'move-ui-html',
        closeBundle: () => {
          const srcPath = path.resolve(__dirname, 'dist/src/ui.html');
          const destPath = path.resolve(__dirname, 'dist/ui.html');
          if (fs.existsSync(srcPath)) {
            fs.renameSync(srcPath, destPath);
            try {
              fs.rmdirSync(path.resolve(__dirname, 'dist/src'));
            } catch (e) {
              // Directory not empty, ignore
            }
          }
        }
      }
    ],
    build: {
      rollupOptions: {
        input: path.resolve(__dirname, 'src/ui.html'),
        output: {
          entryFileNames: 'ui.js',
          assetFileNames: 'ui.[ext]'
        }
      },
      outDir: 'dist',
      emptyOutDir: false,
      target: 'es2017'
    }
  };
});
