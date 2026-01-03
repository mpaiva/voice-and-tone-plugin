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
      // Move ui.html to dist root and copy Tesseract worker files
      {
        name: 'post-build-tasks',
        closeBundle: () => {
          // Move ui.html to dist root
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

          // Copy Tesseract worker files for local OCR (avoids CSP issues in Figma)
          const tesseractDir = path.resolve(__dirname, 'dist/tesseract');
          if (!fs.existsSync(tesseractDir)) {
            fs.mkdirSync(tesseractDir, { recursive: true });
          }

          const workerFiles = [
            'node_modules/tesseract.js/dist/worker.min.js',
            'node_modules/tesseract.js-core/tesseract-core-simd.wasm.js',
            'node_modules/tesseract.js-core/tesseract-core-simd-lstm.wasm.js'
          ];

          for (const file of workerFiles) {
            const srcFile = path.resolve(__dirname, file);
            const destFile = path.resolve(tesseractDir, path.basename(file));
            if (fs.existsSync(srcFile)) {
              fs.copyFileSync(srcFile, destFile);
              console.log(`Copied ${path.basename(file)} to dist/tesseract/`);
            }
          }

          // Copy English trained data from public/tesseract (bundled locally for CSP)
          const engDataSrc = path.resolve(__dirname, 'public/tesseract/eng.traineddata.gz');
          if (fs.existsSync(engDataSrc)) {
            fs.copyFileSync(engDataSrc, path.resolve(tesseractDir, 'eng.traineddata.gz'));
            console.log('Copied eng.traineddata.gz to dist/tesseract/');
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
