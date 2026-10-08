/**
 * Intelligent contextual autocompletion engine for Python & CadQuery
 */

export interface CompletionItem {
  label: string;
  insertText: string;
  detail: string;
  documentation: string;
  kind: 'method' | 'class' | 'keyword' | 'selector' | 'variable';
}

export const CQ_COMPLETIONS: CompletionItem[] = [
  // 3D Solids
  {
    label: 'box',
    insertText: 'box(length, width, height)',
    detail: '(length, width, height, centered=True)',
    documentation: 'Crea una caja prismática 3D orientada en el plano actual.',
    kind: 'method'
  },
  {
    label: 'sphere',
    insertText: 'sphere(radius)',
    detail: '(radius)',
    documentation: 'Crea una esfera sólida del radio especificado.',
    kind: 'method'
  },
  {
    label: 'cylinder',
    insertText: 'cylinder(height, radius)',
    detail: '(height, radius, centered=True)',
    documentation: 'Crea un cilindro sólido a lo largo de la normal del plano.',
    kind: 'method'
  },

  // 2D Sketches
  {
    label: 'circle',
    insertText: 'circle(radius)',
    detail: '(radius, forConstruction=False)',
    documentation: 'Dibuja un círculo 2D en el plano de trabajo activo.',
    kind: 'method'
  },
  {
    label: 'rect',
    insertText: 'rect(xLen, yLen)',
    detail: '(xLen, yLen, centered=True)',
    documentation: 'Dibuja un rectángulo 2D centrado en el plano activo.',
    kind: 'method'
  },
  {
    label: 'polygon',
    insertText: 'polygon(nSides, diameter)',
    detail: '(nSides, diameter)',
    documentation: 'Dibuja un polígono regular de N lados circunscrito o inscrito.',
    kind: 'method'
  },

  // Extrusions & Operations
  {
    label: 'extrude',
    insertText: 'extrude(distance)',
    detail: '(distance, combine=True, clean=True)',
    documentation: 'Extruye las curvas del boceto 2D perpendicularmente al plano de trabajo.',
    kind: 'method'
  },
  {
    label: 'revolve',
    insertText: 'revolve(angleDegrees=360)',
    detail: '(angleDegrees=360, axisStart=None, axisEnd=None)',
    documentation: 'Revoluciona un boceto 2D alrededor de un eje especificado.',
    kind: 'method'
  },
  {
    label: 'cut',
    insertText: 'cut(toCut)',
    detail: '(toCut, clean=True)',
    documentation: 'Resta un sólido de otro (diferencia booleana).',
    kind: 'method'
  },
  {
    label: 'union',
    insertText: 'union(toUnion)',
    detail: '(toUnion, clean=True)',
    documentation: 'Une dos o más sólidos (unión booleana).',
    kind: 'method'
  },
  {
    label: 'intersect',
    insertText: 'intersect(toIntersect)',
    detail: '(toIntersect, clean=True)',
    documentation: 'Intersección booleana entre geometrías.',
    kind: 'method'
  },

  // Fillets & Chamfers
  {
    label: 'fillet',
    insertText: 'fillet(radius)',
    detail: '(radius)',
    documentation: 'Redondea las aristas seleccionadas utilizando el radio especificado en milímetros.',
    kind: 'method'
  },
  {
    label: 'chamfer',
    insertText: 'chamfer(length)',
    detail: '(length, length2=None)',
    documentation: 'Aplica un chaflán a las aristas seleccionadas con la longitud indicada.',
    kind: 'method'
  },

  // Holes
  {
    label: 'hole',
    insertText: 'hole(diameter, depth=None)',
    detail: '(diameter, depth=None)',
    documentation: 'Perfora un agujero simple en las ubicaciones seleccionadas.',
    kind: 'method'
  },
  {
    label: 'cboreHole',
    insertText: 'cboreHole(diameter, cboreDiameter, cboreDepth, depth=None)',
    detail: '(diameter, cboreDiameter, cboreDepth)',
    documentation: 'Crea un agujero avellanado cilíndrico (con asiento para cabeza de tornillo).',
    kind: 'method'
  },
  {
    label: 'cskHole',
    insertText: 'cskHole(diameter, cskDiameter, cskAngle=82, depth=None)',
    detail: '(diameter, cskDiameter, cskAngle)',
    documentation: 'Crea un agujero avellanado cónico para tornillos de cabeza plana.',
    kind: 'method'
  },
  {
    label: 'cutThruAll',
    insertText: 'cutThruAll()',
    detail: '()',
    documentation: 'Corta a través de todo el sólido a lo largo de la dirección normal.',
    kind: 'method'
  },

  // Selectors
  {
    label: 'edges',
    insertText: 'edges(selector)',
    detail: '(selector="|Z")',
    documentation: 'Filtra y selecciona aristas del modelo según directivas de orientación (|Z, >Y, etc.).',
    kind: 'method'
  },
  {
    label: 'faces',
    insertText: 'faces(selector)',
    detail: '(selector=">Z")',
    documentation: 'Filtra y selecciona caras del modelo (>Z, <Z, >X, <X, >Y, <Y, etc.).',
    kind: 'method'
  },
  {
    label: 'vertices',
    insertText: 'vertices(selector)',
    detail: '(selector=None)',
    documentation: 'Selecciona vértices de la geometría activa.',
    kind: 'method'
  },

  // Workplane navigation
  {
    label: 'workplane',
    insertText: 'workplane(offset=0.0)',
    detail: '(offset=0.0, centerOption="CenterOfMass")',
    documentation: 'Crea un nuevo plano de trabajo 2D sobre las caras o puntos seleccionados.',
    kind: 'method'
  },
  {
    label: 'transformed',
    insertText: 'transformed(offset=cq.Vector(0,0,0), rotate=cq.Vector(0,0,0))',
    detail: '(offset=None, rotate=None)',
    documentation: 'Aplica una transformación relativa de traslación y rotación al plano.',
    kind: 'method'
  },
  {
    label: 'polarArray',
    insertText: 'polarArray(radius, startAngle, totalAngle, count)',
    detail: '(radius, startAngle, totalAngle, count)',
    documentation: 'Genera una matriz polar circular de puntos para operaciones repetitivas (pernos, ranuras).',
    kind: 'method'
  },

  // Visualizer & Inspection
  {
    label: 'show_object',
    insertText: 'show_object(shape, name="Pieza", color="#38bdf8", alpha=1.0)',
    detail: '(shape, name=None, color=None, alpha=1.0)',
    documentation: 'Registra un objeto geométrico explícito para visualizar en el visor 3D.',
    kind: 'method'
  },
  {
    label: 'val',
    insertText: 'val()',
    detail: '() -> Shape',
    documentation: 'Extrae el objeto Shape/TopoDS subyacente de la pila Workplane.',
    kind: 'method'
  }
];

// CadQuery selector suggestions when inside quotes
export const SELECTOR_COMPLETIONS: CompletionItem[] = [
  { label: '|Z', insertText: '|Z', detail: 'Paralelo al eje Z', documentation: 'Selecciona aristas paralelas al eje Z (verticales).', kind: 'selector' },
  { label: '|X', insertText: '|X', detail: 'Paralelo al eje X', documentation: 'Selecciona aristas paralelas al eje X.', kind: 'selector' },
  { label: '|Y', insertText: '|Y', detail: 'Paralelo al eje Y', documentation: 'Selecciona aristas paralelas al eje Y.', kind: 'selector' },
  { label: '>Z', insertText: '>Z', detail: 'Z Máximo (Superior)', documentation: 'Selecciona la cara o arista con mayor coordenada Z.', kind: 'selector' },
  { label: '<Z', insertText: '<Z', detail: 'Z Mínimo (Inferior)', documentation: 'Selecciona la cara o arista con menor coordenada Z.', kind: 'selector' },
  { label: '>X', insertText: '>X', detail: 'X Máximo', documentation: 'Selecciona elementos con mayor coordenada X.', kind: 'selector' },
  { label: '<X', insertText: '<X', detail: 'X Mínimo', documentation: 'Selecciona elementos con menor coordenada X.', kind: 'selector' },
  { label: '>Y', insertText: '>Y', detail: 'Y Máximo', documentation: 'Selecciona elementos con mayor coordenada Y.', kind: 'selector' },
  { label: '<Y', insertText: '<Y', detail: 'Y Mínimo', documentation: 'Selecciona elementos con menor coordenada Y.', kind: 'selector' },
  { label: '%CIRCLE', insertText: '%CIRCLE', detail: 'Curvas circulares', documentation: 'Filtra únicamente aristas que son círculos o arcos.', kind: 'selector' },
  { label: '%LINE', insertText: '%LINE', detail: 'Segmentos lineales', documentation: 'Filtra únicamente aristas rectas.', kind: 'selector' },
  { label: '|Z and >Y', insertText: '|Z and >Y', detail: 'Combinación', documentation: 'Aristas paralelas a Z situadas hacia el extremo positivo de Y.', kind: 'selector' }
];

export function extractUserVariables(code: string): string[] {
  const vars: Set<string> = new Set();
  const lines = code.split('\n');
  const varRegex = /^([a-zA-Z_][a-zA-Z0-9_]*)\s*=/;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('#') || trimmed.startsWith('import ') || trimmed.startsWith('from ')) continue;
    const match = varRegex.exec(trimmed);
    if (match && match[1]) {
      const v = match[1];
      if (v !== 'cq' && v !== 'cadquery') {
        vars.add(v);
      }
    }
  }
  return Array.from(vars);
}

export function getCompletionsAtCursor(code: string, cursorIndex: number): {
  prefix: string;
  ghostSuffix: string;
  items: CompletionItem[];
} {
  const beforeCursor = code.substring(0, cursorIndex);
  
  // Check if cursor is inside a string quote for selectors
  const lineStart = beforeCursor.lastIndexOf('\n') + 1;
  const currentLine = beforeCursor.substring(lineStart);
  
  // Check if after a dot (e.g. .bo or cq.Workplane("XY").bo)
  const dotMatch = /\.([a-zA-Z_0-9]*)$/.exec(currentLine);
  if (dotMatch) {
    const prefix = dotMatch[1];
    const filtered = CQ_COMPLETIONS.filter(item => 
      item.label.toLowerCase().startsWith(prefix.toLowerCase())
    );

    let ghostSuffix = '';
    if (filtered.length > 0 && prefix.length > 0) {
      const topMatch = filtered[0];
      if (topMatch.label.toLowerCase().startsWith(prefix.toLowerCase())) {
        ghostSuffix = topMatch.label.substring(prefix.length);
      }
    }

    return {
      prefix,
      ghostSuffix,
      items: filtered
    };
  }

  // Inside quotes for selectors (e.g. .edges("| or .faces("> )
  const quoteMatch = /["']([|><%a-zA-Z0-9_\s]*)$/.exec(currentLine);
  if (quoteMatch) {
    const prefix = quoteMatch[1];
    const lastWord = prefix.split(/\s+/).pop() || '';
    const filtered = SELECTOR_COMPLETIONS.filter(item =>
      item.label.toLowerCase().startsWith(lastWord.toLowerCase())
    );

    let ghostSuffix = '';
    if (filtered.length > 0 && lastWord.length > 0) {
      const topMatch = filtered[0];
      if (topMatch.label.toLowerCase().startsWith(lastWord.toLowerCase())) {
        ghostSuffix = topMatch.label.substring(lastWord.length);
      }
    }

    return {
      prefix: lastWord,
      ghostSuffix,
      items: filtered
    };
  }

  // General word prefix (variables or cq or keywords)
  const wordMatch = /([a-zA-Z_][a-zA-Z0-9_]*)$/.exec(currentLine);
  if (wordMatch) {
    const prefix = wordMatch[1];
    const userVars = extractUserVariables(code);
    const varItems: CompletionItem[] = userVars.map(v => ({
      label: v,
      insertText: v,
      detail: 'variable de usuario',
      documentation: `Variable definida en el script: ${v}`,
      kind: 'variable'
    }));

    const allCandidates = [...varItems, ...CQ_COMPLETIONS];
    const filtered = allCandidates.filter(item =>
      item.label.toLowerCase().startsWith(prefix.toLowerCase())
    );

    let ghostSuffix = '';
    if (filtered.length > 0 && prefix.length > 0) {
      const topMatch = filtered[0];
      if (topMatch.label.toLowerCase().startsWith(prefix.toLowerCase())) {
        ghostSuffix = topMatch.label.substring(prefix.length);
      }
    }

    return {
      prefix,
      ghostSuffix,
      items: filtered
    };
  }

  return { prefix: '', ghostSuffix: '', items: [] };
}
