/**
 * CadQuery and Python Syntax Tokenizer
 * Supports Python keywords, builtins, numbers, comments, strings, CadQuery methods,
 * and parses CadQuery selector sub-expressions inside strings (e.g. "|Z and >Y").
 */

export interface Token {
  text: string;
  type:
    | 'keyword'
    | 'cadquery-method'
    | 'cadquery-class'
    | 'cadquery-selector-dir' // |Z, >Y, <X, etc. (yellow)
    | 'cadquery-selector-op'  // and, or, not (blue)
    | 'cadquery-selector-type'// %CIRCLE, %LINE
    | 'string'
    | 'comment'
    | 'number'
    | 'operator'
    | 'punctuation'
    | 'identifier'
    | 'text';
}

const PYTHON_KEYWORDS = new Set([
  'and', 'as', 'assert', 'async', 'await', 'break', 'class', 'continue',
  'def', 'del', 'elif', 'else', 'except', 'finally', 'for', 'from',
  'global', 'if', 'import', 'in', 'is', 'lambda', 'nonlocal', 'not',
  'or', 'pass', 'raise', 'return', 'try', 'while', 'with', 'yield',
  'True', 'False', 'None'
]);

const CADQUERY_METHODS = new Set([
  'box', 'sphere', 'cylinder', 'circle', 'rect', 'polygon', 'text',
  'extrude', 'revolve', 'loft', 'sweep', 'twistExtrude',
  'fillet', 'chamfer', 'hole', 'cboreHole', 'cskHole',
  'faces', 'edges', 'vertices', 'solids', 'wires', 'shells',
  'workplane', 'Workplane', 'transformed', 'center', 'polarArray',
  'cut', 'cutThruAll', 'cutBlind', 'union', 'intersect',
  'translate', 'rotate', 'rotateAboutCenter', 'mirror', 'val', 'vals',
  'all', 'first', 'last', 'end', 'close', 'show_object'
]);

// Sub-tokenizer for CadQuery selector string contents like "|Z and >Y" or "%CIRCLE"
export function tokenizeSelectorString(strContent: string, quoteChar: string): Token[] {
  const tokens: Token[] = [];
  tokens.push({ text: quoteChar, type: 'string' });

  // Regex to match CadQuery selector parts:
  // Directional: [|<>]?[XYZ] or combinations like |X, |Y, |Z, >X, <X, >Y, <Y, >Z, <Z
  // Type: %(CIRCLE|LINE|PLANE|ARC|SPHERE)
  // Operators: and, or, not
  // Parens and other
  const selectorRegex = /(\|[XYZ]|>[XYZ]|<[XYZ]|%[A-Z]+|\b(?:and|or|not)\b|\(|\)|[^\s()]+|\s+)/gi;
  let match: RegExpExecArray | null;

  while ((match = selectorRegex.exec(strContent)) !== null) {
    const part = match[0];
    const upperPart = part.toUpperCase();
    const lowerPart = part.toLowerCase();

    if (/^(\|[XYZ]|>[XYZ]|<[XYZ])$/i.test(part)) {
      tokens.push({ text: part, type: 'cadquery-selector-dir' });
    } else if (/^%[A-Z]+$/i.test(part)) {
      tokens.push({ text: part, type: 'cadquery-selector-type' });
    } else if (lowerPart === 'and' || lowerPart === 'or' || lowerPart === 'not') {
      tokens.push({ text: part, type: 'cadquery-selector-op' });
    } else {
      tokens.push({ text: part, type: 'string' });
    }
  }

  tokens.push({ text: quoteChar, type: 'string' });
  return tokens;
}

export function tokenizeLine(line: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  const len = line.length;

  while (i < len) {
    // Comments
    if (line[i] === '#') {
      tokens.push({ text: line.substring(i), type: 'comment' });
      break;
    }

    // Strings
    if (line[i] === '"' || line[i] === "'") {
      const quote = line[i];
      let j = i + 1;
      let escaped = false;
      while (j < len) {
        if (!escaped && line[j] === quote) {
          break;
        }
        escaped = !escaped && line[j] === '\\';
        j++;
      }
      const rawStringContent = line.substring(i + 1, Math.min(j, len));
      const isClosed = j < len;
      
      // Check if this string contains CadQuery selector syntax (|Z, >X, and, %CIRCLE)
      if (/[|<>]?[XYZ]|%[A-Z]+/i.test(rawStringContent)) {
        tokens.push(...tokenizeSelectorString(rawStringContent, quote));
      } else {
        tokens.push({ text: line.substring(i, isClosed ? j + 1 : len), type: 'string' });
      }
      i = isClosed ? j + 1 : len;
      continue;
    }

    // Numbers
    if (/[0-9]/.test(line[i]) || (line[i] === '.' && i + 1 < len && /[0-9]/.test(line[i + 1]))) {
      let j = i;
      while (j < len && /[0-9\.eE_\-]/.test(line[j])) {
        j++;
      }
      tokens.push({ text: line.substring(i, j), type: 'number' });
      i = j;
      continue;
    }

    // Identifiers and Keywords
    if (/[a-zA-Z_]/.test(line[i])) {
      let j = i;
      while (j < len && /[a-zA-Z0-9_]/.test(line[j])) {
        j++;
      }
      const word = line.substring(i, j);

      if (PYTHON_KEYWORDS.has(word)) {
        tokens.push({ text: word, type: 'keyword' });
      } else if (CADQUERY_METHODS.has(word)) {
        tokens.push({ text: word, type: 'cadquery-method' });
      } else if (word === 'Workplane' || word === 'Assembly' || word === 'Vector' || word === 'cq') {
        tokens.push({ text: word, type: 'cadquery-class' });
      } else {
        tokens.push({ text: word, type: 'identifier' });
      }
      i = j;
      continue;
    }

    // Operators and punctuation
    const char = line[i];
    if ('+-*/%=&|^~<>!'.includes(char)) {
      tokens.push({ text: char, type: 'operator' });
      i++;
    } else if ('()[]{},:;.'.includes(char)) {
      tokens.push({ text: char, type: 'punctuation' });
      i++;
    } else {
      // Whitespace
      tokens.push({ text: char, type: 'text' });
      i++;
    }
  }

  return tokens;
}
