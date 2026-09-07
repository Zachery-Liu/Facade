#!/usr/bin/env node

import { createProgram } from './program.js';

try {
  await createProgram().parseAsync();
} catch (error) {
  const code = error instanceof Error && error.name === 'FacadeError' && 'code' in error ? String(error.code) : 'BUILD_FAILED';
  const message = error instanceof Error && error.name === 'FacadeError' ? error.message : 'Unable to build the release site.';
  process.stderr.write(code + ': ' + message + '\n');
  process.exitCode = 1;
}
