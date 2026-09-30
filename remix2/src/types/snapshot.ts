import { Point, DomainProfile, ReferenceCircle } from './geometry';
import { LineEquation } from '../kernel/dag/geometryCore';

export interface SnapshotMetadata {
  readonly stateVersion: number;
  readonly domainProfile: DomainProfile;
  readonly vertexCount: number;
  readonly provenance: string;
}

export interface SnapshotParameters {
  readonly cyclicAngles?: Record<string, number>; // e.g. { A: 0.6981, B: 2.2689, ... } in radians
  readonly referenceCircle?: ReferenceCircle;
}

export interface SnapshotPoint {
  readonly id: string;
  readonly label: string;
  readonly x: number;
  readonly y: number;
  readonly type: 'canonical' | 'free' | 'on_circle' | 'on_segment' | 'intersection' | 'midpoint';
}

export interface SnapshotConstruction {
  readonly id: string;
  readonly type: string; // e.g. 'segment', 'diagonal', 'two_points', 'parallel', 'perpendicular', 'bisector', 'compass', 'center_radius'
  readonly label: string;
  readonly parentIds?: readonly string[];
  readonly mathValue?: number; // e.g. segment length, circle radius
  readonly lineEquation?: LineEquation; // Standard standard form standard: Ax + By + C = 0 with normal standard normalization (A^2 + B^2 = 1)
  readonly anchorPoint?: Point;
  readonly direction?: { readonly dx: number; readonly dy: number };
}

export interface SnapshotMeasurement {
  readonly id: string;
  readonly label: string;
  readonly type: string; // e.g. 'distance'
  readonly value: number; // pure numeric value (no rounding)
  readonly units: string; // e.g. 'mm'
}

export interface GeometryStateSnapshot {
  readonly metadata: SnapshotMetadata;
  readonly parameters: SnapshotParameters;
  readonly points: readonly SnapshotPoint[];
  readonly constructions: readonly SnapshotConstruction[];
  readonly measurements: readonly SnapshotMeasurement[];
  readonly area?: {
    readonly value: number; // S_quad (absolute area in mm²)
    readonly units: "mm²";
    readonly signedValue: number; // S_quad (signed area in mm²)
    readonly referenceValue: number; // S_circle (reference area in mm²)
    readonly gapValue: number; // S_gap (S_circle - S_quad in mm²)
    readonly fillRatio: number; // K_fill = S_quad / S_circle
    readonly gapRatio: number; // K_gap = 1 - K_fill
  };
}
