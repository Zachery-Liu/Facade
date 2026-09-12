export function compileFullNameGlob(glob: string): RegExp {
  let pattern = '^';
  for (let index = 0; index < glob.length; index += 1) {
    const character = glob[index]!;
    if (character === '*') pattern += '[\\s\\S]*';
    else if (character === '?') pattern += '[\\s\\S]';
    else if (character === '[') {
      const closing = glob.indexOf(']', index + 1);
      if (closing === -1) throw new Error('Unclosed glob character class');
      const content = glob.slice(index + 1, closing);
      const negated = content.startsWith('!') || content.startsWith('^');
      const characters = (negated ? content.slice(1) : content).replace(/\\/g, '\\\\').replace(/]/g, '\\]');
      if (characters === '') throw new Error('Empty glob character class');
      pattern += `[${negated ? '^' : ''}${characters}]`;
      index = closing;
    } else pattern += character.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
  return new RegExp(pattern + '$');
}

export function isValidFullNameGlob(glob: string): boolean {
  try {
    compileFullNameGlob(glob);
    return true;
  } catch {
    return false;
  }
}
