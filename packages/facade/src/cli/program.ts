import { Command } from 'commander';
import { buildOfflineRelease } from '../build/offline-build.js';

const VERSION = '0.0.0-development';

export function createProgram(): Command {
  const program = new Command()
    .name('facade')
    .description('Generate static software release pages for humans and agents.')
    .version(VERSION);
  program.action(() => { program.outputHelp(); });
  program.command('build')
    .description('Build static release files from an offline repository snapshot fixture.')
    .requiredOption('--fixture <path>', 'Repository snapshot fixture')
    .option('--out-dir <path>', 'Output directory', 'dist')
    .option('--base-path <path>', 'Site base path', '/')
    .action(async (options: { fixture: string; outDir: string; basePath: string }) => {
      const result = await buildOfflineRelease({ fixturePath: options.fixture, outDir: options.outDir, basePath: options.basePath });
      process.stdout.write(JSON.stringify(result) + '\n');
    });
  return program;
}
