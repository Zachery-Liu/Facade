// Usage: node examples/select-installation.mjs manifest.json environment.json
// Reads local JSON only. Never executes the manifest's free-text commands.
import { readFile } from 'node:fs/promises';
import { selectInstallation, validateReleasePageManifest } from '../packages/facade/dist/selection.js';

const [manifestPath, environmentPath] = process.argv.slice(2);
if (!manifestPath || !environmentPath) {
  console.error('Usage: node examples/select-installation.mjs manifest.json environment.json');
  process.exitCode = 1;
} else {
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  const validation = validateReleasePageManifest(manifest);
  if (!validation.success) {
    console.error(JSON.stringify({ status: 'needs-input', diagnostics: validation.diagnostics }, null, 2));
    process.exitCode = 2;
  } else {
    const environment = JSON.parse(await readFile(environmentPath, 'utf8'));
    // Selection is intentionally the final operation: this example has no network,
    // child-process, download, digest-verification, or installation capability.
    console.log(JSON.stringify(selectInstallation(validation.manifest, environment), null, 2));
  }
}
