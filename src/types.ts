export interface CadQueryProperties {
  volume: number;
  area: number;
  bbox: {
    min: [number, number, number];
    max: [number, number, number];
    size: [number, number, number];
  };
  faceCount: number;
  edgeCount: number;
}

export interface CadQueryMeshObject {
  id: string;
  name: string;
  color: string;
  alpha: number;
  vertices: number[];
  indices: number[];
  edges: number[][]; // [x1, y1, z1, x2, y2, z2]
  properties: CadQueryProperties;
  visible?: boolean;
}

export interface ExecutionResult {
  success: boolean;
  executionId?: string;
  execution_time_ms?: number;
  executionTimeMs?: number;
  stdout: string;
  error?: string | null;
  error_line?: number | null;
  errorLine?: number | null;
  error_type?: string | null;
  errorType?: string | null;
  stderr?: string;
  objects: CadQueryMeshObject[];
  engine?: string;
  isStale?: boolean; // When an execution failed and we show previous geometry
}

export interface SavedScript {
  id: string;
  name: string;
  code: string;
  updatedAt: number;
  isDraft?: boolean;
}

export interface VersionSnapshot {
  id: string;
  scriptId: string;
  code: string;
  timestamp: number;
  label: string;
}

export interface ParametricVariable {
  name: string;
  value: number;
  rawStr: string;
  line: number;
  min: number;
  max: number;
  step: number;
}

export type ViewPreset = 'iso' | 'top' | 'bottom' | 'front' | 'back' | 'left' | 'right';

export type RenderMode = 'solid' | 'edges' | 'edges_only' | 'transparent';

export interface ViewerSettings {
  showAxes: boolean;
  showGrid: boolean;
  renderMode: RenderMode;
  bgColor: string;
  defaultColor: string;
  wireframeColor: string;
  highlightEdges: boolean;
}

export type LayoutMode = 'split' | 'editor_only' | 'viewer_only';

export interface MeasurementState {
  active: boolean;
  mode: 'distance' | 'edge' | 'face' | 'volume' | 'bbox';
  points: [number, number, number][];
  resultText?: string;
}
