/**
 * UI Type Definitions for Remix 2 Canonical Geometry Stand
 * R2-05: Common Geometry Stand UI Shell
 */

export type DisplayAngleMode = 'DEGREES' | 'RADIANS' | 'FRACTIONS';

export type StandMode = 'SCHOOL' | 'RESEARCH';

export type Language = 'RU' | 'UA' | 'EN';

export type PresetType = 'SQUARE' | 'RECTANGLE' | 'TRAPEZOID' | 'GENERAL';

export type CanonicalToolId =
  | 'SELECT'
  | 'POINT'
  | 'SEGMENT'
  | 'RULER'
  | 'COMPASS'
  | 'LINE_CIRCLE'
  | 'PARALLEL'
  | 'PERPENDICULAR'
  | 'ANGLE_BISECTOR'
  | 'DIAGONAL'
  | 'INTERSECTION'
  | 'ERASER';

export type ActiveTool = CanonicalToolId;

export type ActiveTab = 'summary' | 'passport' | 'research' | 'gateway' | 'education';

export interface ViewportState {
  readonly zoom: number;
  readonly panX: number;
  readonly panY: number;
  readonly viewRotationDeg: number;
}

export interface UIState {
  readonly activeTool: ActiveTool;
  readonly activeTab: ActiveTab;
  readonly standMode: StandMode;
  readonly language: Language;
  readonly activePreset: PresetType | null;
  readonly displayAngleMode: DisplayAngleMode;
  readonly showScale: boolean;
  readonly showRadii: boolean;
  readonly showDiagonals: boolean;
  readonly showGrid: boolean;
  readonly splitterRatio: number; // 0.0 to 1.0 (default 0.5)
  readonly viewport: ViewportState;
  readonly hoveredVertexId: string | null;
  readonly isNumericModalOpen: boolean;
}
