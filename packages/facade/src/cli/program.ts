import { Command } from 'commander';
import { buildFreshGitHubRelease } from '../build/fresh-github-build.js';
import { buildOfflineRelease } from '../build/offline-build.js';

const VERSION = '0.0.0-development';

export function createProgram(): Command {
  const program = new Command()
    .name('facade')
    .description('Generate static software release pages for humans and agents.')
    .version(VERSION);
  program.action(() => { program.outputHelp(); });
  program.command('build')
    .description('Build static release files from GitHub or an offline repository snapshot fixture.')
    .option('--config <path>', 'Facade YAML configuration', '.github/facade.yml')
    .option('--repository <owner/repository>', 'GitHub repository override')
    .option('--tag <tag>', 'Exact GitHub release tag override')
    .option('--fixture <path>', 'Offline repository snapshot fixture')
    .option('--out-dir <path>', 'Output directory', 'dist')
    .option('--base-path <path>', 'Site base path', '/')
    .action(async (options: { config: string; repository?: string; tag?: string; fixture?: string; outDir: string; basePath: string }) => {
      const result = options.fixture === undefined
        ? await buildFreshGitHubRelease({
            configPath: options.config,
            outDir: options.outDir,
            basePath: options.basePath,
            environment: process.env,
            ...(options.repository === undefined && options.tag === undefined ? {} : {
              overrides: {
                ...(options.repository === undefined ? {} : { repository: options.repository }),
                ...(options.tag === undefined ? {} : { strategy: 'tag' as const, tag: options.tag }),
              },
            }),
          })
        : await buildOfflineRelease({ fixturePath: options.fixture, outDir: options.outDir, basePath: options.basePath });
      process.stdout.write(JSON.stringify(result) + '\n');
    });
  return program;
}
