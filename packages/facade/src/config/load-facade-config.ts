import { readFile } from 'node:fs/promises';
import { parse } from 'yaml';
import { FacadeError } from '../runtime/facade-error.js';
import { FacadeConfigInputSchema, type FacadeConfigInput } from './facade-config.js';

export interface LoadedFacadeConfig {
  readonly config: FacadeConfigInput;
  readonly sourceText: string;
}

export async function loadFacadeConfig(path: string): Promise<LoadedFacadeConfig> {
  let sourceText: string;
  try {
    sourceText = await readFile(path, 'utf8');
  } catch (cause) {
    throw new FacadeError('CONFIG_READ_FAILED', 'Unable to read the Facade configuration file.', { cause });
  }

  try {
    return { config: FacadeConfigInputSchema.parse(parse(sourceText)), sourceText };
  } catch (cause) {
    throw new FacadeError('CONFIG_INVALID', 'The Facade configuration file is invalid.', { cause });
  }
}
