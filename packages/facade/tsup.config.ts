import { defineConfig } from 'tsup';

export const actionConfig = defineConfig({
  clean: true,
  dts: false,
  entry: { index: 'src/action/index.ts' },
  format: ['cjs'],
  noExternal: [/.*/],
  outDir: '../../action/dist',
  outExtension: () => ({ js: '.cjs' }),
  platform: 'node',
  target: 'node24',
});

export default [
  defineConfig({
    clean: true,
    dts: true,
    entry: ['src/cli/index.ts'],
    format: ['esm'],
    outDir: 'dist',
    target: 'node22',
  }),
  actionConfig,
];
