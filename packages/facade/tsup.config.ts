import { defineConfig } from 'tsup';

export default defineConfig({
  clean: true,
  dts: true,
  entry: { index: 'src/cli/index.ts', selection: 'src/selection.ts' },
  format: ['esm'],
  outDir: 'dist',
  target: 'node22',
});
