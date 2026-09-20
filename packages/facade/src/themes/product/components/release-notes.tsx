import type { ComponentChildren } from 'preact';

type NotesProps = { content: string; repositoryUrl: string; tag: string };
type NotesBlock =
  | { type: 'heading'; level: number; text: string }
  | { type: 'paragraph' | 'list' | 'code'; lines: string[] };

// Only these Markdown constructs are rendered. Preact escapes every text node.
export function ReleaseNotes({ content, repositoryUrl, tag }: NotesProps) {
  const blocks = parseBlocks(content);
  return <section id="release-notes" aria-labelledby="notes-title"><h2 id="notes-title">Release notes</h2>{blocks.map((block, index) => {
    if (block.type === 'heading') {
      const children = inline(block.text, repositoryUrl, tag);
      const id = slug(block.text);
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
      if (/^```\s*$/.test(line)) flush();
      else current.lines.push(line);
      continue;
    }
    if (/^```/.test(line)) { flush(); current = { type: 'code', lines: [] }; continue; }
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
