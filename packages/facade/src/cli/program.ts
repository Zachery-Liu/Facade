import { Command } from 'commander';

const VERSION = '0.0.0-development';

export function createProgram(): Command {
  return new Command()
    .name('facade')
    .description('Generate static software release pages for humans and agents.')
    .version(VERSION);
}
