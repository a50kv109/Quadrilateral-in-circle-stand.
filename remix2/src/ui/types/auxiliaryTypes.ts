/**
 * Auxiliary Construction & Interactive Tool Types
 * R2-05.1 — Canonical Geometry Stand Active Tools
 */

import { Point } from '../../types/geometry';
import { LineEquation } from '../../kernel/dag/geometryCore';

export type AuxiliaryPointType =
  | 'free'
  | 'on_circle'
  | 'on_segment'
  | 'intersection'
  | 'midpoint';

export interface AuxiliaryPoint {
  readonly id: string;
  readonly label: string;
  readonly x: number;
  readonly y: number;
  readonly type: AuxiliaryPointType;
  readonly parentIds?: readonly string[];
  readonly color?: string;
  readonly isProtected?: boolean; // e.g. canonical A, B, C, D, O
}

export type AuxiliarySegmentType = 'segment' | 'diagonal';

export interface AuxiliarySegment {
  readonly id: string;
  readonly label: string;
  readonly p1Id: string;
  readonly p2Id: string;
  readonly type: AuxiliarySegmentType;
  readonly lengthMm: number;
  readonly color?: string;
  readonly parentIds?: readonly string[];
}

export type AuxiliaryLineType = 'two_points' | 'parallel' | 'perpendicular' | 'bisector';

export interface AuxiliaryLine {
  readonly id: string;
  readonly label: string;
  readonly type: AuxiliaryLineType;
  readonly throughPointId: string;
  readonly referenceSegmentId?: string;
  readonly point1Id?: string; // for two_points or bisector arm 1
  readonly point2Id?: string; // for bisector vertex
  readonly point3Id?: string; // for bisector arm 2

  // Canonical mathematical representation (pure geometry, independent of viewport)
  readonly anchorPoint: { readonly x: number; readonly y: number };
  readonly direction: { readonly dx: number; readonly dy: number };
  readonly equation?: LineEquation;

  // Presentation-derived rendering coordinates (optional, computed by presentation layer)
  readonly x1?: number;
  readonly y1?: number;
  readonly x2?: number;
  readonly y2?: number;
  readonly color?: string;
}

export type AuxiliaryCircleType = 'compass' | 'center_radius';

export interface AuxiliaryCircle {
  readonly id: string;
  readonly label: string;
  readonly type: AuxiliaryCircleType;
  readonly centerPointId: string;
  readonly radius: number;
  readonly radiusPoint1Id?: string;
  readonly radiusPoint2Id?: string;
  readonly color?: string;
}

export interface AuxiliaryMeasurement {
  readonly id: string;
  readonly p1Id: string;
  readonly p2Id: string;
  readonly distanceMm: number;
  readonly label: string;
}

export interface AuxiliaryState {
  readonly points: readonly AuxiliaryPoint[];
  readonly segments: readonly AuxiliarySegment[];
  readonly lines: readonly AuxiliaryLine[];
  readonly circles: readonly AuxiliaryCircle[];
  readonly measurements: readonly AuxiliaryMeasurement[];
  readonly selectedEntityId: string | null;
  readonly selectedEntityType: string | null;
}

export interface SnapTarget {
  readonly x: number;
  readonly y: number;
  readonly entityId?: string;
  readonly entityType: 'vertex' | 'point' | 'center' | 'circle' | 'segment' | 'line';
  readonly label?: string;
  readonly distance: number;
}

export type LineCircleSubMode = 'LINE' | 'CIRCLE';

export interface ToolStepState {
  readonly step: number;
  readonly p1?: { id?: string; x: number; y: number; label?: string };
  readonly p2?: { id?: string; x: number; y: number; label?: string };
  readonly p3?: { id?: string; x: number; y: number; label?: string };
  readonly referenceEntity?: { id: string; type: 'segment' | 'point' | 'line'; label?: string };
  readonly lockedRadius?: number; // for compass state machine
  readonly statusMessage: string;
  readonly errorMessage: string | null;
  readonly lineCircleSubMode: LineCircleSubMode;
}
