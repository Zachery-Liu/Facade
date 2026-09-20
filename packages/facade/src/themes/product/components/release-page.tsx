import type { ReleasePageManifest } from '../../../manifest/release-page-manifest.js';
import { AssetList } from './asset-list.js';
import { ReleaseNotes } from './release-notes.js';

type ReleasePageProps = { manifest: ReleasePageManifest; basePath?: string };

export function ReleasePage({ manifest, basePath = '/' }: ReleasePageProps) {
  const product = manifest.product ?? { name: manifest.productName };
  const methods = manifest.installMethods ?? [];
  const commands = [...new Set(methods.flatMap((method) => method.prerequisites.map((entry) => entry['command-available'])))];
  return <main><div class="page-shell">
    <header class="site-header">
      <a class="brand" href="#top" aria-label={`${product.name} home`}>{product.icon && <img src={product.icon} alt="" width="36" height="36" />}<span>{product.name}</span></a>
      <nav aria-label="Page navigation"><a href="#downloads">Downloads</a>{manifest.release.notes && <a href="#release-notes">Notes</a>}<a href={basePath + 'install.md'}>Install guide</a></nav>
      <label class="appearance-label">Appearance <select id="appearance"><option value="auto" selected={(manifest.theme?.appearance ?? 'auto') === 'auto'}>Auto</option><option value="light" selected={manifest.theme?.appearance === 'light'}>Light</option><option value="dark" selected={manifest.theme?.appearance === 'dark'}>Dark</option></select></label>
    </header>
    <section class="hero" id="top"><div class="hero-copy"><p class="eyebrow">Latest release · {manifest.release.channel}</p><h1>{product.name}</h1>{product.description && <p class="description">{product.description}</p>}<p class="release-line"><strong>Release {manifest.release.tag}</strong> <span>{manifest.release.name}</span>{manifest.release.prerelease && <span class="pill">Prerelease</span>}</p></div>{product.screenshot && <img class="screenshot" src={product.screenshot.src} alt={product.screenshot.alt} />}</section>
    <section class="recommendation" aria-labelledby="recommend-title"><div><p class="eyebrow">Your download</p><h2 id="recommend-title">Choose a download</h2><p id="recommendation-status" role="status">Select your system to see downloads that meet the provided conditions. All files remain available below.</p></div>
      <div class="environment-controls"><label>Operating system <select id="environment-os"><option value="">Choose OS</option><option value="macos">macOS</option><option value="windows">Windows</option><option value="linux">Linux</option></select></label><label>Architecture <select id="environment-arch"><option value="">Choose architecture</option><option value="arm64">ARM64</option><option value="x64">x64</option><option value="x86">x86</option></select></label><label>Linux libc <select id="environment-libc"><option value="">Unknown</option><option value="glibc">glibc</option><option value="musl">musl</option><option value="none">None</option></select></label><label>System version <input id="environment-version" type="text" inputMode="numeric" placeholder="e.g. 14.0" /></label>{commands.map((command) => <label key={command}>{command} available? <select data-command={command}><option value="unknown">Unknown</option><option value="available">Yes</option><option value="unavailable">No</option></select></label>)}</div><div id="recommendation-result" aria-live="polite" />
    </section>
    <section id="downloads" aria-labelledby="downloads-title"><div class="section-heading"><div><p class="eyebrow">Release files</p><h2 id="downloads-title">All downloads</h2></div><p>Direct links to every file in this release. Check requirements before installing.</p></div><AssetList assets={manifest.assets} /></section>
    {methods.length > 0 && <section id="install-methods" aria-labelledby="methods-title"><div class="section-heading"><div><p class="eyebrow">Other ways to install</p><h2 id="methods-title">Installation commands</h2></div><p>Commands are shown for review only. Facade does not run them.</p></div><div class="method-grid">{methods.map((method) => <article class="method-card" key={method.id}><h3>{method.name}</h3><p>{method.platform} · Version binding: {method.versionBinding}</p>{method.prerequisites.length > 0 && <p>Requires: {method.prerequisites.map((entry) => entry['command-available']).join(', ')}</p>}<code>{method.command}</code><button type="button" class="copy-button" data-copy={method.command}>Copy command</button></article>)}</div></section>}
    {manifest.release.notes && <ReleaseNotes content={manifest.release.notes} repositoryUrl={manifest.source.repositoryUrl} tag={manifest.release.tag} />}
    <footer><p>Download details and verification references are metadata. Facade has not verified these files.</p><nav aria-label="Resources"><a href={manifest.source.repositoryUrl}>Repository</a>{manifest.links?.map((link) => <a key={link.url} href={link.url}>{link.label}</a>)}<a href={basePath + 'manifest.json'}>Manifest</a><a href={basePath + 'install.md'}>Install guide</a><a href={basePath + 'llms.txt'}>Agent index</a></nav></footer>
  </div></main>;
}
