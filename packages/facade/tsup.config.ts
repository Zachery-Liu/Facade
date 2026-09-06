import { defineConfig } from 'tsup';

export default defineConfig({
  clean: true,
  dts: true,
  entry: ['src/cli/index.ts'],
  format: ['esm'],
  outDir: 'dist',
  target: 'node20',
});
