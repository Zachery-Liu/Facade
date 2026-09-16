// Usage: node examples/select-installation.mjs manifest.json environment.json
// Reads local JSON only. Never executes the manifest's free-text commands.
import { readFile } from 'node:fs/promises';
import { selectInstallation } from '../packages/facade/dist/selection.js';

const [manifestPath, environmentPath] = process.argv.slice(2);
if (!manifestPath || !environmentPath) {
  console.error('Usage: node examples/select-installation.mjs manifest.json environment.json');
  process.exitCode = 1;
} else {
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  const environment = JSON.parse(await readFile(environmentPath, 'utf8'));
  console.log(JSON.stringify(selectInstallation(manifest, environment), null, 2));
}
