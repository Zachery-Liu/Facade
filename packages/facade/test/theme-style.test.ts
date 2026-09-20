import { describe, expect, it } from 'vitest';
import { renderThemeStyle } from '../src/themes/product/theme-style.js';

function contrast(first: string, second: string): number {
  const luminance = (color: string) => {
    const channels = [1, 3, 5].map((start) => {
      const value = Number.parseInt(color.slice(start, start + 2), 16) / 255;
      return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * (channels[0] ?? 0) + 0.7152 * (channels[1] ?? 0) + 0.0722 * (channels[2] ?? 0);
  };
  const values = [luminance(first), luminance(second)].sort((a, b) => b - a);
  return ((values[0] ?? 0) + 0.05) / ((values[1] ?? 0) + 0.05);
}

describe('Product Theme accent', () => {
  it.each(['#ffffff', '#000000', '#777777', '#ffff00', '#5265d8'])('keeps %s readable in both appearances and on hover', (accent) => {
    const css = renderThemeStyle(accent);
    const textColors = [...css.matchAll(/--accent-text:(#[0-9a-f]{6})/g)].map((match) => match[1] ?? '');
    const buttonText = /--accent-on:(#[0-9a-f]{6})/.exec(css)?.[1] ?? '';
    expect(css).toContain(`--accent:${accent}`);
    expect(css).toContain('background:var(--accent);color:var(--accent-on)');
    expect(css).toContain('.download-button:hover{text-decoration:underline}');
    expect(css).not.toContain('filter:brightness');
    expect(css).toContain('outline:3px solid var(--accent-text)');
    expect(textColors).toHaveLength(3);
    expect(contrast(textColors[0] ?? '', '#f7f8fc')).toBeGreaterThanOrEqual(4.5);
    expect(contrast(textColors[1] ?? '', '#1b2638')).toBeGreaterThanOrEqual(4.5);
    expect(contrast(textColors[2] ?? '', '#1b2638')).toBeGreaterThanOrEqual(4.5);
    expect(contrast(buttonText, accent)).toBeGreaterThanOrEqual(4.5);
  });
});
