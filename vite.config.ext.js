import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [react()],
  publicDir: false,
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
  build: {
    outDir: 'extension',
    emptyOutDir: false,
    cssCodeSplit: false,
    minify: false,
    target: 'es2020',
    rollupOptions: {
      input: path.resolve(__dirname, 'src/ext-content.jsx'),
      output: {
        entryFileNames: 'content.js',
        chunkFileNames: 'content-[name].js',
        assetFileNames: 'content-[name][extname]',
        format: 'iife',
        inlineDynamicImports: true,
        name: 'ClockExt',
      },
    },
  },
})
