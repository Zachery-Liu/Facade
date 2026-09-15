import { Command } from 'commander';
import { buildFreshGitHubRelease } from '../build/fresh-github-build.js';
import { buildOfflineRelease } from '../build/offline-build.js';
import { inspectGitHubRelease, inspectOfflineRelease, renderInspectText } from '../inspect/inspect-release.js';

const VERSION = '0.0.0-development';

export function createProgram(): Command {
  const program = new Command()
    .name('facade')
    .description('Generate static software release pages for humans and agents.')
    .version(VERSION);
  program.action(() => { program.outputHelp(); });
  program.command('build')
    .description('Build static release files from GitHub or an offline repository snapshot fixture.')
    .option('--config <path>', 'Facade YAML configuration')
    .option('--repository <owner/repository>', 'GitHub repository override')
    .option('--tag <tag>', 'Exact GitHub release tag override')
    .option('--fixture <path>', 'Offline repository snapshot fixture')
    .option('--out-dir <path>', 'Output directory', 'dist')
    .option('--base-path <path>', 'Site base path', '/')
    .action(async (options: { config?: string; repository?: string; tag?: string; fixture?: string; outDir: string; basePath: string }) => {
      const result = options.fixture === undefined
        ? await buildFreshGitHubRelease({
            configPath: options.config ?? '.github/facade.yml',
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
        : await buildOfflineRelease({ fixturePath: options.fixture, outDir: options.outDir, basePath: options.basePath, ...(options.config === undefined ? {} : { configPath: options.config }) });
      process.stdout.write(JSON.stringify(result) + '\n');
    });
  program.command('inspect')
    .description('Inspect release asset classification, evidence, overrides, and diagnostics.')
    .option('--config <path>', 'Facade YAML configuration')
    .option('--repository <owner/repository>', 'GitHub repository override')
    .option('--tag <tag>', 'Exact GitHub release tag override')
    .option('--fixture <path>', 'Offline repository snapshot fixture')
    .option('--json', 'Write deterministic structured JSON')
    .action(async (options: { config?: string; repository?: string; tag?: string; fixture?: string; json?: boolean }) => {
      const overrides = options.repository === undefined && options.tag === undefined ? undefined : {
        ...(options.repository === undefined ? {} : { repository: options.repository }),
        ...(options.tag === undefined ? {} : { strategy: 'tag' as const, tag: options.tag }),
      };
      const resolution = options.fixture === undefined
        ? await inspectGitHubRelease({
            configPath: options.config ?? '.github/facade.yml',
            environment: process.env,
            ...(overrides === undefined ? {} : { overrides }),
          })
        : await inspectOfflineRelease({ fixturePath: options.fixture, ...(options.config === undefined ? {} : { configPath: options.config }) });
      process.stdout.write(options.json ? JSON.stringify(resolution, null, 2) + '\n' : renderInspectText(resolution));
    });
  return program;
}
