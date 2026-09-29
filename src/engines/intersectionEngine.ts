/**
 * CQNS-001 — Elementary Intersection Primitives Engine (Package 03: CQNS-PKG-03-EUCLIDEAN-TOOLS)
 *
 * Implements deterministic atomic solvers:
 * 1. INTERSECT_LINES (LL)
 * 2. INTERSECT_LINE_CIRCLE (LC)
 * 3. INTERSECT_CIRCLES (CC)
 *
 * Mathematical result contracts, strict enums, and explicit branch selection.
 * STRICTLY MATHEMATICAL: Pure geometric calculation; zero state mutation, zero epistemic status assignment.
 */

import { Point, Circle } from '../types/geometry';
import { GeometryCore } from './geometryCore';
import { VerificationLayer } from './verificationLayer';

// =============================================================================
// RESULT CONTRACT TYPES
// =============================================================================

export type LineLineStatus =
  | 'UNIQUE_INTERSECTION'
  | 'PARALLEL'
  | 'COINCIDENT'
  | 'DEGENERATE_INPUT';

export interface LineLineResult {
  status: LineLineStatus;
  point?: { x: number; y: number };
  reason?: string;
}

export type LineCircleStatus =
  | 'SECANT'
  | 'TANGENT'
  | 'DISJOINT'
  | 'DEGENERATE_INPUT';

export interface LineCircleResult {
  status: LineCircleStatus;
  points: { x: number; y: number }[];
  branchIndex?: 0 | 1;
  selectedPoint?: { x: number; y: number };
  reason?: string;
}

export type CircleCircleStatus =
  | 'INTERSECT'
  | 'TANGENT_EXTERNAL'
  | 'TANGENT_INTERNAL'
  | 'DISJOINT_EXTERNAL'
  | 'DISJOINT_CONTAINED'
  | 'CONCENTRIC'
  | 'COINCIDENT'
  | 'DEGENERATE_INPUT';

export interface CircleCircleResult {
  status: CircleCircleStatus;
  points: { x: number; y: number }[];
  branchIndex?: 0 | 1;
  selectedPoint?: { x: number; y: number };
  reason?: string;
}

export interface LinePrimitive {
  p1: Point | { x: number; y: number };
  p2: Point | { x: number; y: number };
}

export interface CirclePrimitive {
  center: Point | { x: number; y: number };
  radius: number;
}

export class IntersectionEngine {
  public static readonly EPSILON_DIST = VerificationLayer.EPSILON_DIST; // 1.0 px
  public static readonly EPSILON_TOL = 1e-6;

  // ===========================================================================
  // 1. LINE-LINE INTERSECTION (LL)
  // ===========================================================================

  /**
   * Deterministic Line-Line Intersection (LL)
   * Solves intersection of line L1 passing through (A1, B1) and line L2 passing through (A2, B2).
   */
  public static intersectLines(
    l1: LinePrimitive,
    l2: LinePrimitive
  ): LineLineResult {
    // Validate inputs
    if (
      !l1?.p1 || !l1?.p2 || !l2?.p1 || !l2?.p2 ||
      !Number.isFinite(l1.p1.x) || !Number.isFinite(l1.p1.y) ||
      !Number.isFinite(l1.p2.x) || !Number.isFinite(l1.p2.y) ||
      !Number.isFinite(l2.p1.x) || !Number.isFinite(l2.p1.y) ||
      !Number.isFinite(l2.p2.x) || !Number.isFinite(l2.p2.y)
    ) {
      return { status: 'DEGENERATE_INPUT', reason: 'Line coordinates contain invalid numbers' };
    }

    const d1x = l1.p2.x - l1.p1.x;
    const d1y = l1.p2.y - l1.p1.y;
    const d2x = l2.p2.x - l2.p1.x;
    const d2y = l2.p2.y - l2.p1.y;

    const len1Sq = d1x * d1x + d1y * d1y;
    const len2Sq = d2x * d2x + d2y * d2y;

    if (len1Sq < IntersectionEngine.EPSILON_TOL || len2Sq < IntersectionEngine.EPSILON_TOL) {
      return { status: 'DEGENERATE_INPUT', reason: 'One or both lines have zero length' };
    }

    // 2D Cross product of direction vectors
    const det = d1x * d2y - d1y * d2x;

    if (Math.abs(det) < 1e-9) {
      // Lines are parallel or coincident. Check if L2.p1 lies on L1.
      const crossPoint = (l2.p1.x - l1.p1.x) * d1y - (l2.p1.y - l1.p1.y) * d1x;
      const distToLine = Math.abs(crossPoint) / Math.sqrt(len1Sq);

      if (distToLine < IntersectionEngine.EPSILON_TOL) {
        return { status: 'COINCIDENT', reason: 'Lines are identical (infinite intersection points)' };
      }
      return { status: 'PARALLEL', reason: 'Lines are parallel (0 intersection points)' };
    }

    const t = ((l2.p1.x - l1.p1.x) * d2y - (l2.p1.y - l1.p1.y) * d2x) / det;
    const pt = {
      x: l1.p1.x + t * d1x,
      y: l1.p1.y + t * d1y,
    };

    return {
      status: 'UNIQUE_INTERSECTION',
      point: pt,
    };
  }

  // ===========================================================================
  // 2. LINE-CIRCLE INTERSECTION (LC)
  // ===========================================================================

  /**
   * Deterministic Line-Circle Intersection (LC)
   * Line L(A, B) and Circle S(O, R).
   * Points are ordered deterministically along the line vector A -> B.
   */
  public static intersectLineCircle(
    line: LinePrimitive,
    circle: CirclePrimitive,
    branchIndex?: 0 | 1
  ): LineCircleResult {
    if (
      !line?.p1 || !line?.p2 || !circle?.center ||
      !Number.isFinite(line.p1.x) || !Number.isFinite(line.p1.y) ||
      !Number.isFinite(line.p2.x) || !Number.isFinite(line.p2.y) ||
      !Number.isFinite(circle.center.x) || !Number.isFinite(circle.center.y) ||
      !Number.isFinite(circle.radius) || circle.radius <= 0
    ) {
      return { status: 'DEGENERATE_INPUT', points: [], reason: 'Invalid line or circle parameters' };
    }

    const dx = line.p2.x - line.p1.x;
    const dy = line.p2.y - line.p1.y;
    const len = Math.sqrt(dx * dx + dy * dy);

    if (len < IntersectionEngine.EPSILON_TOL) {
      return { status: 'DEGENERATE_INPUT', points: [], reason: 'Line endpoints are coincident' };
    }

    const ux = dx / len;
    const uy = dy / len;

    // Vector from line.p1 to circle center
    const vox = circle.center.x - line.p1.x;
    const voy = circle.center.y - line.p1.y;

    // Projection along line
    const tProj = vox * ux + voy * uy;
    const projX = line.p1.x + tProj * ux;
    const projY = line.p1.y + tProj * uy;

    // Perpendicular distance from center to line
    const perpDistSq = (circle.center.x - projX) ** 2 + (circle.center.y - projY) ** 2;
    const perpDist = Math.sqrt(perpDistSq);
    const r = circle.radius;

    const diff = perpDist - r;

    // Tangent check within threshold
    if (Math.abs(diff) < 1e-6) {
      const p = { x: projX, y: projY };
      return {
        status: 'TANGENT',
        points: [p],
        branchIndex: 0,
        selectedPoint: p,
      };
    }

    // Disjoint
    if (diff > 1e-6) {
      return {
        status: 'DISJOINT',
        points: [],
        reason: 'Line does not intersect circle (dist > R)',
      };
    }

    // Secant (2 intersection points)
    const halfChord = Math.sqrt(Math.max(0, r * r - perpDistSq));
    const p1 = {
      x: projX - halfChord * ux,
      y: projY - halfChord * uy,
    };
    const p2 = {
      x: projX + halfChord * ux,
      y: projY + halfChord * uy,
    };

    const points = [p1, p2];
    const bIdx: 0 | 1 = branchIndex === 1 ? 1 : 0;
    const selectedPoint = points[bIdx];

    return {
      status: 'SECANT',
      points,
      branchIndex: bIdx,
      selectedPoint,
    };
  }

  // ===========================================================================
  // 3. CIRCLE-CIRCLE INTERSECTION (CC)
  // ===========================================================================

  /**
   * Deterministic Circle-Circle Intersection (CC)
   * Circles S1(O1, R1) and S2(O2, R2).
   * Intersecting points are ordered deterministically relative to vector O1 -> O2.
   */
  public static intersectCircles(
    c1: CirclePrimitive,
    c2: CirclePrimitive,
    branchIndex?: 0 | 1
  ): CircleCircleResult {
    if (
      !c1?.center || !c2?.center ||
      !Number.isFinite(c1.center.x) || !Number.isFinite(c1.center.y) ||
      !Number.isFinite(c2.center.x) || !Number.isFinite(c2.center.y) ||
      !Number.isFinite(c1.radius) || !Number.isFinite(c2.radius) ||
      c1.radius <= 0 || c2.radius <= 0
    ) {
      return { status: 'DEGENERATE_INPUT', points: [], reason: 'Invalid circle parameters or radius <= 0' };
    }

    const dx = c2.center.x - c1.center.x;
    const dy = c2.center.y - c1.center.y;
    const d = Math.sqrt(dx * dx + dy * dy);
    const r1 = c1.radius;
    const r2 = c2.radius;

    // Concentric or coincident
    if (d < 1e-9) {
      if (Math.abs(r1 - r2) < 1e-6) {
        return { status: 'COINCIDENT', points: [], reason: 'Circles are identical' };
      }
      return { status: 'CONCENTRIC', points: [], reason: 'Concentric circles with different radii' };
    }

    // Disjoint external
    if (d > r1 + r2 + 1e-6) {
      return { status: 'DISJOINT_EXTERNAL', points: [], reason: 'Circles are disjoint (d > r1 + r2)' };
    }

    // Disjoint contained
    if (d < Math.abs(r1 - r2) - 1e-6) {
      return { status: 'DISJOINT_CONTAINED', points: [], reason: 'One circle is contained inside the other' };
    }

    // Tangent external
    if (Math.abs(d - (r1 + r2)) <= 1e-6) {
      const p = {
        x: c1.center.x + (r1 / d) * dx,
        y: c1.center.y + (r1 / d) * dy,
      };
      return {
        status: 'TANGENT_EXTERNAL',
        points: [p],
        branchIndex: 0,
        selectedPoint: p,
      };
    }

    // Tangent internal
    if (Math.abs(d - Math.abs(r1 - r2)) <= 1e-6) {
      let p: { x: number; y: number };
      if (r1 > r2) {
        p = {
          x: c1.center.x + (r1 / d) * dx,
          y: c1.center.y + (r1 / d) * dy,
        };
      } else {
        p = {
          x: c2.center.x + (r2 / d) * (-dx),
          y: c2.center.y + (r2 / d) * (-dy),
        };
      }
      return {
        status: 'TANGENT_INTERNAL',
        points: [p],
        branchIndex: 0,
        selectedPoint: p,
      };
    }

    // Standard intersecting circles (2 points)
    // Distance from O1 to chord midpoint along O1O2
    const a = (r1 * r1 - r2 * r2 + d * d) / (2 * d);
    const h = Math.sqrt(Math.max(0, r1 * r1 - a * a));

    // Midpoint of chord
    const p0x = c1.center.x + (a / d) * dx;
    const p0y = c1.center.y + (a / d) * dy;

    // Normal unit vector: (-dy/d, dx/d)
    const p1 = {
      x: p0x - (dy / d) * h,
      y: p0y + (dx / d) * h,
    };
    const p2 = {
      x: p0x + (dy / d) * h,
      y: p0y - (dx / d) * h,
    };

    const points = [p1, p2];
    const bIdx: 0 | 1 = branchIndex === 1 ? 1 : 0;
    const selectedPoint = points[bIdx];

    return {
      status: 'INTERSECT',
      points,
      branchIndex: bIdx,
      selectedPoint,
    };
  }
}
