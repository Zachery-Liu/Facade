import type { ComponentChildren } from 'preact';

type NotesProps = { content: string; repositoryUrl: string; tag: string };

// Only these Markdown constructs are rendered. Preact escapes every text node.
export function ReleaseNotes({ content, repositoryUrl, tag }: NotesProps) {
  const blocks = content.replace(/\r\n?/g, '\n').split(/\n\s*\n/).filter(Boolean);
  return <section id="release-notes" aria-labelledby="notes-title"><h2 id="notes-title">Release notes</h2>{blocks.map((block, index) => {
    const heading = /^(#{1,3})\s+(.+)$/.exec(block);
    if (heading) {
      const title = heading[2] ?? '';
      const children = inline(title, repositoryUrl, tag);
      const id = slug(title);
      return heading[1]?.length === 1 ? <h3 id={id} key={index}>{children}</h3> : <h4 id={id} key={index}>{children}</h4>;
    }
    if (block.split('\n').every((line) => /^[-*]\s+/.test(line))) return <ul key={index}>{block.split('\n').map((line, item) => <li key={item}>{inline(line.replace(/^[-*]\s+/, ''), repositoryUrl, tag)}</li>)}</ul>;
    if (/^```/.test(block)) return <pre key={index}><code>{block.replace(/^```[^\n]*\n?/, '').replace(/\n?```\s*$/, '')}</code></pre>;
    return <p key={index}>{block.split('\n').flatMap((line, lineIndex) => lineIndex === 0 ? inline(line, repositoryUrl, tag) : [<br key={`br-${lineIndex}`} />, ...inline(line, repositoryUrl, tag)])}</p>;
  })}</section>;
}

function inline(value: string, repositoryUrl: string, tag: string): ComponentChildren[] {
  const parts: ComponentChildren[] = [];
  const pattern = /(`[^`\n]+`|\[[^\]\n]+\]\([^\s)]+\)|\*\*[^*\n]+\*\*)/g;
  let start = 0;
  for (const match of value.matchAll(pattern)) {
    const at = match.index ?? start;
    if (at > start) parts.push(value.slice(start, at));
    const token = match[0];
    if (token.startsWith('`')) parts.push(<code key={at}>{token.slice(1, -1)}</code>);
    else if (token.startsWith('**')) parts.push(<strong key={at}>{token.slice(2, -2)}</strong>);
    else {
      const split = token.indexOf('](');
      const label = token.slice(1, split);
      const href = safeHref(token.slice(split + 2, -1), repositoryUrl, tag);
      parts.push(href ? <a key={at} href={href}>{label}</a> : label);
    }
    start = at + token.length;
  }
  if (start < value.length) parts.push(value.slice(start));
  return parts;
}

function safeHref(value: string, repositoryUrl: string, tag: string): string | undefined {
  if (value.startsWith('#')) return /^#[A-Za-z0-9_-]+$/.test(value) ? value : undefined;
  try {
    if (/^[A-Za-z][A-Za-z\d+.-]*:/.test(value)) {
      const url = new URL(value);
      return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : undefined;
    }
    if (value.startsWith('/') || value.startsWith('\\') || value.includes('..') || value.includes('%') || value.includes('\\')) return undefined;
    const root = new URL(repositoryUrl);
    const url = new URL(`${root.pathname.replace(/\/$/, '')}/blob/${encodeURIComponent(tag)}/${value}`, root.origin);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : undefined;
  } catch { return undefined; }
}

function slug(value: string): string { return value.toLowerCase().replace(/[^a-z0-9 -]/g, '').trim().replace(/\s+/g, '-'); }
