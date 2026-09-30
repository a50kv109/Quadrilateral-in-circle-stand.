/**
 * TopologyGuard — Remix 2 Independent Structural Validator
 * R2-03: Topology & Arc Guard
 * 
 * Responsible for verifying if a canonical geometry configuration is structurally valid
 * for downstream analytical processing, without acting as an epistemic authority.
 */

import { UniversalGeometryState } from '../state/geometryState';
import { Point, CartesianInput, CyclicInput } from '../../types/geometry';
import { GeometryCore } from '../dag/geometryCore';

export type StructuralStatus =
  | 'VALID'
  | 'DEGENERATE'
  | 'DUPLICATE_VERTEX'
  | 'ORDER_INVALID'
  | 'SELF_INTERSECTION'
  | 'INVALID_REFERENCE_CIRCLE'
  | 'INVALID_ANGLE_SEQUENCE';

export interface TopologyReport {
  readonly status: StructuralStatus;
  readonly profile: 'CARTESIAN' | 'CYCLIC';
  readonly vertexCount: number;
  readonly issues: readonly string[];
  readonly normalizedAngles?: readonly number[]; // CYCLIC only (normalized to [0, Period))
  readonly arcGaps?: readonly number[];         // CYCLIC only (step gaps in [0, Period))
  readonly orientation?: 'CW' | 'CCW' | 'COLLINEAR'; // CARTESIAN only
  readonly stateVersion: number;
}

/**
 * Engineering Tolerance Constants
 */
export const COINCIDENT_VERTEX_TOLERANCE = 1e-9; // Min distance between Cartesian vertices (meters/units)
export const DEGENERATE_AREA_TOLERANCE = 1e-10;  // Min shoelace area to avoid collinear degeneracy

/**
 * Configuration Options for TopologyGuard
 */
export interface TopologyGuardConfig {
  readonly minVertexAngleGapRad?: number;
  readonly minVertexAngleGapDeg?: number;
  readonly angleUnit?: 'DEG' | 'RAD';
}

/**
 * MIN_VERTEX_ANGLE_GAP — инженерный structural tolerance,
 * предназначенный для предотвращения практически вырожденных
 * конфигураций и обеспечения устойчивости последующих геометрических
 * вычислений.
 */
export const DEFAULT_MIN_VERTEX_ANGLE_GAP_RAD = 0.005;
export const DEFAULT_MIN_VERTEX_ANGLE_GAP_DEG = 0.28;

export class TopologyGuard {
  /**
   * Main Read-Only Entry Point: Validate a given UniversalGeometryState
   */
  static validate(state: UniversalGeometryState, config?: TopologyGuardConfig): TopologyReport {
    const issues: string[] = [];
    const stateVersion = state.stateVersion;
    const profile = state.domainProfile;
    const vertexCount = state.vertexCount;

    // A. Basic structural validations
    if (vertexCount < 3) {
      return {
        status: 'DEGENERATE',
        profile,
        vertexCount,
        issues: ["Vertex count must be at least 3."],
        stateVersion
      };
    }

    if (profile === 'CARTESIAN') {
      const inputs = state.canonicalInputs as CartesianInput;
      const vertices = inputs.vertices;

      // 1. Verify vertexCount matches array length
      if (!vertices || vertices.length !== vertexCount) {
        return {
          status: 'DEGENERATE',
          profile,
          vertexCount,
          issues: ["Vertices array missing or length mismatch."],
          stateVersion
        };
      }

      // 2. Verify unique vertex IDs
      const ids = new Set<string>();
      for (const v of vertices) {
        if (!v.id) {
          issues.push("Vertex is missing a valid ID.");
        } else if (ids.has(v.id)) {
          issues.push(`Duplicate vertex ID detected: ${v.id}`);
        }
        ids.add(v.id);
      }

      // 3. Verify finite coordinates
      for (let i = 0; i < vertices.length; i++) {
        const v = vertices[i];
        if (!Number.isFinite(v.x) || !Number.isFinite(v.y)) {
          return {
            status: 'DEGENERATE',
            profile,
            vertexCount,
            issues: [`Vertex ${v.id || i} contains non-finite coordinates.`],
            stateVersion
          };
        }
      }

      // 4. Verify no coincident (overlapping) vertices
      for (let i = 0; i < vertices.length; i++) {
        for (let j = i + 1; j < vertices.length; j++) {
          const dx = vertices[i].x - vertices[j].x;
          const dy = vertices[i].y - vertices[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < COINCIDENT_VERTEX_TOLERANCE) {
            issues.push(`Vertices ${vertices[i].id} and ${vertices[j].id} are coincident.`);
            return {
              status: 'DUPLICATE_VERTEX',
              profile,
              vertexCount,
              issues,
              stateVersion
            };
          }
        }
      }

      // 5. Calculate shoelace area & orientation using centralized GeometryCore
      const area = GeometryCore.calculateSignedArea(vertices);
      let orientation: 'CW' | 'CCW' | 'COLLINEAR' = 'COLLINEAR';
      if (area > DEGENERATE_AREA_TOLERANCE) {
        orientation = 'CCW';
      } else if (area < -DEGENERATE_AREA_TOLERANCE) {
        orientation = 'CW';
      } else {
        orientation = 'COLLINEAR';
      }

      // 6. Verify self-intersections of polygon boundaries
      if (TopologyGuard.hasSelfIntersection(vertices)) {
        issues.push("Polygon boundaries self-intersect.");
        return {
          status: 'SELF_INTERSECTION',
          profile,
          vertexCount,
          issues,
          orientation,
          stateVersion
        };
      }

      // 7. Verify degeneracy/collinearity
      if (orientation === 'COLLINEAR') {
        issues.push("Polygon is degenerate/collinear (area is near zero).");
        return {
          status: 'DEGENERATE',
          profile,
          vertexCount,
          issues,
          orientation,
          stateVersion
        };
      }

      return {
        status: 'VALID',
        profile,
        vertexCount,
        issues,
        orientation,
        stateVersion
      };

    } else if (profile === 'CYCLIC') {
      const inputs = state.canonicalInputs as CyclicInput;
      const circle = inputs.referenceCircle;
      const angles = inputs.angles;

      // 1. Verify circle parameters
      if (!circle || !circle.center || !Number.isFinite(circle.radius) || circle.radius <= 0) {
        return {
          status: 'INVALID_REFERENCE_CIRCLE',
          profile,
          vertexCount,
          issues: ["Reference circle is missing, has non-finite radius or radius <= 0."],
          stateVersion
        };
      }

      if (!Number.isFinite(circle.center.x) || !Number.isFinite(circle.center.y)) {
        return {
          status: 'INVALID_REFERENCE_CIRCLE',
          profile,
          vertexCount,
          issues: ["Circle center coordinates are not finite."],
          stateVersion
        };
      }

      // 2. Verify angles count matches vertexCount
      if (!angles || angles.length !== vertexCount) {
        return {
          status: 'INVALID_ANGLE_SEQUENCE',
          profile,
          vertexCount,
          issues: ["Angles array size mismatch against vertexCount."],
          stateVersion
        };
      }

      // 3. Verify all angles are finite
      for (let i = 0; i < angles.length; i++) {
        if (!Number.isFinite(angles[i])) {
          return {
            status: 'INVALID_ANGLE_SEQUENCE',
            profile,
            vertexCount,
            issues: [`Angle at index ${i} is not a finite number.`],
            stateVersion
          };
        }
      }

      // 4. Determine angle units & constants
      const isDegrees = config?.angleUnit
        ? config.angleUnit === 'DEG'
        : angles.some(a => Math.abs(a) > 2 * Math.PI);
      const period = isDegrees ? 360 : 2 * Math.PI;
      
      const minGapRad = config?.minVertexAngleGapRad ?? DEFAULT_MIN_VERTEX_ANGLE_GAP_RAD;
      const minGapDeg = config?.minVertexAngleGapDeg ?? DEFAULT_MIN_VERTEX_ANGLE_GAP_DEG;
      const minGap = isDegrees ? minGapDeg : minGapRad;

      // 5. Normalized angles (wrapped to [0, period))
      const normalized = angles.map(a => ((a % period) + period) % period);

      // 5b. Direct duplicate angles check (to immediately flag DUPLICATE_VERTEX before order validations)
      for (let i = 0; i < vertexCount; i++) {
        for (let j = i + 1; j < vertexCount; j++) {
          const diff = Math.abs(normalized[i] - normalized[j]) % period;
          const minDiff = Math.min(diff, period - diff);
          if (minDiff < 1e-12) {
            issues.push(`Duplicate angle detected between indices ${i} and ${j}.`);
            return {
              status: 'DUPLICATE_VERTEX',
              profile,
              vertexCount,
              issues,
              normalizedAngles: normalized,
              stateVersion
            };
          }
        }
      }

      // 6. Check cyclic traversal winding (single full loop CCW or CW)
      // Step gaps along CCW direction
      const ccwGaps: number[] = [];
      let ccwSum = 0;
      for (let i = 0; i < vertexCount; i++) {
        const current = normalized[i];
        const next = normalized[(i + 1) % vertexCount];
        let gap = (next - current) % period;
        if (gap <= 0) gap += period;
        ccwGaps.push(gap);
        ccwSum += gap;
      }

      // Step gaps along CW direction
      const cwGaps: number[] = [];
      let cwSum = 0;
      for (let i = 0; i < vertexCount; i++) {
        const current = normalized[i];
        const next = normalized[(i + 1) % vertexCount];
        let gap = (current - next) % period;
        if (gap <= 0) gap += period;
        cwGaps.push(gap);
        cwSum += gap;
      }

      const isCCW = Math.abs(ccwSum - period) < 1e-9;
      const isCW = Math.abs(cwSum - period) < 1e-9;

      // Verify that traversal completes exactly one full monotonic circle loop
      if (!isCCW && !isCW) {
        issues.push("Vertices do not follow a valid monotonic cyclic order on the circle.");
        return {
          status: 'ORDER_INVALID',
          profile,
          vertexCount,
          issues,
          normalizedAngles: normalized,
          arcGaps: ccwGaps,
          stateVersion
        };
      }

      // 7. Verify step gaps along the active traversal direction
      const activeGaps = isCCW ? ccwGaps : cwGaps;

      for (let i = 0; i < vertexCount; i++) {
        const gap = activeGaps[i];
        if (Math.abs(gap) < 1e-12) {
          issues.push(`Duplicate vertices or 0-gap detected between vertex ${i} and ${(i + 1) % vertexCount}.`);
          return {
            status: 'DUPLICATE_VERTEX',
            profile,
            vertexCount,
            issues,
            normalizedAngles: normalized,
            arcGaps: activeGaps,
            stateVersion
          };
        }
        if (gap < minGap) {
          issues.push(`Angular gap (${gap.toFixed(4)}) between index ${i} and ${(i + 1) % vertexCount} is below MIN_VERTEX_ANGLE_GAP (${minGap}).`);
          return {
            status: 'ORDER_INVALID',
            profile,
            vertexCount,
            issues,
            normalizedAngles: normalized,
            arcGaps: activeGaps,
            stateVersion
          };
        }
      }

      // Cyclic ordering on a single circle naturally guarantees convexity and prevents self-intersection.
      // Therefore, no separate complex convexity or self-intersection checking is needed for a valid cyclic profile.
      return {
        status: 'VALID',
        profile,
        vertexCount,
        issues,
        normalizedAngles: normalized,
        arcGaps: activeGaps,
        stateVersion
      };
    }

    return {
      status: 'DEGENERATE',
      profile,
      vertexCount,
      issues: ["Unsupported profile type."],
      stateVersion
    };
  }

  /**
   * Helper: Check if polygon boundary segments self-intersect.
   */
  private static hasSelfIntersection(vertices: readonly Point[]): boolean {
    const N = vertices.length;

    for (let i = 0; i < N; i++) {
      const p1 = vertices[i];
      const q1 = vertices[(i + 1) % N];

      for (let j = i + 2; j < N; j++) {
        // Skip checking adjacent edge (last edge and first edge)
        if (i === 0 && j === N - 1) continue;

        const p2 = vertices[j];
        const q2 = vertices[(j + 1) % N];

        if (TopologyGuard.segmentsIntersect(p1, q1, p2, q2)) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Helper: Vector cross product segment intersection algorithm.
   */
  private static segmentsIntersect(p1: Point, q1: Point, p2: Point, q2: Point): boolean {
    const o1 = TopologyGuard.crossProduct(p1, q1, p2);
    const o2 = TopologyGuard.crossProduct(p1, q1, q2);
    const o3 = TopologyGuard.crossProduct(p2, q2, p1);
    const o4 = TopologyGuard.crossProduct(p2, q2, q1);

    // General case
    if (((o1 > 1e-12 && o2 < -1e-12) || (o1 < -1e-12 && o2 > 1e-12)) &&
        ((o3 > 1e-12 && o4 < -1e-12) || (o3 < -1e-12 && o4 > 1e-12))) {
      return true;
    }

    // Special cases: collinear segment overlaps
    if (Math.abs(o1) < 1e-12 && TopologyGuard.onSegment(p2, p1, q1)) return true;
    if (Math.abs(o2) < 1e-12 && TopologyGuard.onSegment(q2, p1, q1)) return true;
    if (Math.abs(o3) < 1e-12 && TopologyGuard.onSegment(p1, p2, q2)) return true;
    if (Math.abs(o4) < 1e-12 && TopologyGuard.onSegment(q1, p2, q2)) return true;

    return false;
  }

  private static crossProduct(p1: Point, p2: Point, p3: Point): number {
    return (p2.x - p1.x) * (p3.y - p1.y) - (p2.y - p1.y) * (p3.x - p1.x);
  }

  private static onSegment(p: Point, a: Point, b: Point): boolean {
    return p.x >= Math.min(a.x, b.x) && p.x <= Math.max(a.x, b.x) &&
           p.y >= Math.min(a.y, b.y) && p.y <= Math.max(a.y, b.y);
  }
}
