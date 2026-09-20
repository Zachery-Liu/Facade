import type { ComponentChildren } from 'preact';

type NotesProps = { content: string; repositoryUrl: string; tag: string };
type NotesBlock =
  | { type: 'heading'; level: number; text: string }
  | { type: 'paragraph' | 'list'; lines: string[] }
  | { type: 'code'; lines: string[]; fenceLength: number };
const pageIds = ['top', 'appearance', 'recommend-title', 'recommendation-status', 'recommendation-result', 'environment-os', 'environment-arch', 'environment-libc', 'environment-version', 'downloads', 'downloads-title', 'install-methods', 'methods-title', 'release-notes', 'notes-title', 'facade-manifest'];

// Only these Markdown constructs are rendered. Preact escapes every text node.
export function ReleaseNotes({ content, repositoryUrl, tag }: NotesProps) {
  const blocks = parseBlocks(content);
  const usedIds = new Set(pageIds);
  return <section id="release-notes" aria-labelledby="notes-title"><h2 id="notes-title">Release notes</h2>{blocks.map((block, index) => {
    if (block.type === 'heading') {
      const children = inline(block.text, repositoryUrl, tag);
      const id = headingId(block.text, usedIds);
      return block.level === 1 ? <h3 id={id} key={index}>{children}</h3> : <h4 id={id} key={index}>{children}</h4>;
    }
    if (block.type === 'list') return <ul key={index}>{block.lines.map((line, item) => <li key={item}>{inline(line.replace(/^[-*]\s+/, ''), repositoryUrl, tag)}</li>)}</ul>;
    if (block.type === 'code') return <pre key={index}><code>{block.lines.join('\n')}</code></pre>;
    return <p key={index}>{block.lines.flatMap((line, lineIndex) => lineIndex === 0 ? inline(line, repositoryUrl, tag) : [<br key={`br-${lineIndex}`} />, ...inline(line, repositoryUrl, tag)])}</p>;
  })}</section>;
}

function parseBlocks(content: string): NotesBlock[] {
  const blocks: NotesBlock[] = [];
  let current: Extract<NotesBlock, { lines: string[] }> | undefined;
  const flush = () => { if (current) blocks.push(current); current = undefined; };
  for (const line of content.replace(/\r\n?/g, '\n').split('\n')) {
    if (current?.type === 'code') {
      const closingFence = /^(`{3,})\s*$/.exec(line);
      if (closingFence && (closingFence[1]?.length ?? 0) >= current.fenceLength) flush();
      else current.lines.push(line);
      continue;
    }
    const openingFence = /^(`{3,})[^`]*$/.exec(line);
    if (openingFence) { flush(); current = { type: 'code', lines: [], fenceLength: openingFence[1]?.length ?? 3 }; continue; }
    if (line.trim() === '') { flush(); continue; }
    const heading = /^(#{1,3})\s+(.+)$/.exec(line);
    if (heading) {
      flush();
      blocks.push({ type: 'heading', level: heading[1]?.length ?? 1, text: heading[2] ?? '' });
      continue;
    }
    const type = /^[-*]\s+/.test(line) ? 'list' : 'paragraph';
    if (current?.type !== type) { flush(); current = { type, lines: [] }; }
    current?.lines.push(line);
  }
  flush();
  return blocks;
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
  if (value.startsWith('#')) return /^#[\p{L}\p{M}\p{N}_-]+$/u.test(value) ? value.normalize('NFC').toLowerCase() : undefined;
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

function headingId(value: string, usedIds: Set<string>): string {
  const base = value.normalize('NFC').toLowerCase().replace(/[^\p{L}\p{M}\p{N}_ -]/gu, '').trim().replace(/[\s-]+/g, '-').replace(/^-|-$/g, '') || 'section';
  let id = base;
  let suffix = 2;
  while (usedIds.has(id)) id = `${base}-${suffix++}`;
  usedIds.add(id);
  return id;
}
