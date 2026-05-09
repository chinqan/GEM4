import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig(({ command }) => ({
  test: {
    exclude: ['node_modules', 'dist', 'e2e', '.kiro'],
  },
  resolve: {
    alias: {
      '@game': resolve(__dirname, 'src/game'),
      '@rendering': resolve(__dirname, 'src/rendering'),
      '@ui': resolve(__dirname, 'src/ui'),
      '@audio': resolve(__dirname, 'src/audio'),
      '@state': resolve(__dirname, 'src/state'),
      '@input': resolve(__dirname, 'src/input'),
      '@types': resolve(__dirname, 'src/types'),
    },
  },
  server: {
    port: 3000,
    open: true,
  },
  build: {
    target: 'es2022',
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          pixi: ['pixi.js'],
        },
      },
    },
  },
  define: {
    __TELEMETRY_ENDPOINT__: JSON.stringify(process.env.VITE_TELEMETRY_ENDPOINT ?? ''),
    __BUILD_VERSION__: JSON.stringify(process.env.VITE_BUILD_VERSION ?? '0.0.0'),
    __ENABLE_DEVTOOLS__: JSON.stringify(
      process.env.VITE_ENABLE_DEVTOOLS ?? (command === 'serve' ? 'true' : 'false'),
    ),
  },
}));
